"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { GraphData, GraphNode, GraphEdge } from "@/lib/types";

// Dynamically import to avoid SSR issues with canvas
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

interface WalletGraphProps {
  data: GraphData;
  centerAddress: string;
  onNodeClick?: (node: GraphNode) => void;
}

const NODE_COLORS: Record<string, string> = {
  user: "#3b82f6",      // blue
  exchange: "#f59e0b",  // amber
  contract: "#a855f7",  // purple
  risk: "#ef4444",      // red
  unknown: "#64748b",   // gray
};

const EDGE_COLORS: Record<string, string> = {
  in: "#22c55e",   // green for incoming
  out: "#f97316",  // orange for outgoing
  both: "#06b6d4", // cyan for bidirectional
};

export default function WalletGraph({ data, centerAddress, onNodeClick }: WalletGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Center on load
  const handleEngineStop = useCallback(() => {
    const fg = graphRef.current as { zoomToFit?: (ms: number, padding: number) => void } | null;
    if (fg?.zoomToFit) {
      fg.zoomToFit(400, 60);
    }
  }, []);

  const paintNode = useCallback(
    (node: object, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as GraphNode & { x?: number; y?: number };
      const x = n.x ?? 0;
      const y = n.y ?? 0;
      const isCenter = n.isCenter;
      const radius = isCenter ? 18 : n.type === "exchange" ? 12 : 9;
      const color = NODE_COLORS[n.type] || NODE_COLORS.unknown;

      // Glow effect for center / risk
      if (isCenter || n.type === "risk") {
        ctx.shadowBlur = 20;
        ctx.shadowColor = isCenter ? "#00ff88" : "#ef4444";
      } else {
        ctx.shadowBlur = 0;
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = isCenter ? "#00ff88" : color;
      ctx.fill();

      // Border
      ctx.strokeStyle = isCenter ? "#00ff88" : `${color}80`;
      ctx.lineWidth = isCenter ? 3 : 1.5;
      ctx.stroke();

      ctx.shadowBlur = 0;

      // Label
      const label = n.label || "";
      const fontSize = Math.max(8, Math.min(12, 12 / globalScale * 1.5));
      ctx.font = `${fontSize}px 'JetBrains Mono', monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#e2e8f0";
      ctx.fillText(label, x, y + radius + fontSize);
    },
    []
  );

  const paintLink = useCallback((link: object, ctx: CanvasRenderingContext2D) => {
    const l = link as GraphEdge & {
      source: { x?: number; y?: number };
      target: { x?: number; y?: number };
    };
    const src = l.source;
    const tgt = l.target;
    if (!src || !tgt) return;

    const sx = src.x ?? 0;
    const sy = src.y ?? 0;
    const tx = tgt.x ?? 0;
    const ty = tgt.y ?? 0;

    const color = EDGE_COLORS[l.direction] || EDGE_COLORS.both;
    const maxVol = 100;
    const lineWidth = Math.max(0.5, Math.min(4, (l.volume / maxVol) * 4));

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(tx, ty);
    ctx.strokeStyle = `${color}70`;
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    // Arrow
    const angle = Math.atan2(ty - sy, tx - sx);
    const arrowLen = 8;
    const midX = (sx + tx) / 2;
    const midY = (sy + ty) / 2;

    ctx.beginPath();
    ctx.moveTo(midX, midY);
    ctx.lineTo(
      midX - arrowLen * Math.cos(angle - Math.PI / 7),
      midY - arrowLen * Math.sin(angle - Math.PI / 7)
    );
    ctx.lineTo(
      midX - arrowLen * Math.cos(angle + Math.PI / 7),
      midY - arrowLen * Math.sin(angle + Math.PI / 7)
    );
    ctx.closePath();
    ctx.fillStyle = `${color}90`;
    ctx.fill();
  }, []);

  const graphData = {
    nodes: data.nodes.map((n) => ({ ...n })),
    links: data.links.map((l) => ({ ...l })),
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-bg-primary rounded-xl overflow-hidden">
      {/* Legend */}
      <div className="absolute top-4 left-4 z-10 bg-bg-card border border-bg-border rounded-lg p-3 text-xs space-y-1.5">
        <p className="text-text-secondary font-semibold mb-2">Node Types</p>
        {[
          { type: "user", label: "User Wallet", color: NODE_COLORS.user },
          { type: "exchange", label: "Exchange", color: NODE_COLORS.exchange },
          { type: "contract", label: "Smart Contract", color: NODE_COLORS.contract },
          { type: "risk", label: "Risk / Blacklist", color: NODE_COLORS.risk },
        ].map(({ type, label, color }) => (
          <div key={type} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-text-secondary">{label}</span>
          </div>
        ))}
        <div className="border-t border-bg-border my-2" />
        <p className="text-text-secondary font-semibold mb-1">Edge Direction</p>
        {[
          { dir: "in", label: "Incoming", color: EDGE_COLORS.in },
          { dir: "out", label: "Outgoing", color: EDGE_COLORS.out },
          { dir: "both", label: "Bidirectional", color: EDGE_COLORS.both },
        ].map(({ dir, label, color }) => (
          <div key={dir} className="flex items-center gap-2">
            <div className="w-6 h-0.5" style={{ backgroundColor: color }} />
            <span className="text-text-secondary">{label}</span>
          </div>
        ))}
      </div>

      {/* Node count */}
      <div className="absolute top-4 right-4 z-10 bg-bg-card border border-bg-border rounded-lg px-3 py-2 text-xs text-text-secondary">
        <span className="text-neon-green font-bold">{data.nodes.length}</span> wallets ·{" "}
        <span className="text-neon-blue font-bold">{data.links.length}</span> connections
      </div>

      {/* Hovered node tooltip */}
      {hoveredNode && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-bg-card border border-bg-border rounded-lg px-4 py-2 text-xs space-y-1 shadow-card">
          <p className="font-mono text-text-primary">{hoveredNode.id}</p>
          <div className="flex gap-3">
            <span className="text-text-muted capitalize">{hoveredNode.type}</span>
            {hoveredNode.riskScore != null && hoveredNode.riskScore > 0 && (
              <span className="text-neon-red">Risk: {hoveredNode.riskScore}</span>
            )}
          </div>
        </div>
      )}

      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="#07070f"
        nodeCanvasObject={paintNode}
        linkCanvasObject={paintLink}
        nodeCanvasObjectMode={() => "replace"}
        linkCanvasObjectMode={() => "replace"}
        onEngineStop={handleEngineStop}
        onNodeClick={(node) => {
          const n = node as GraphNode;
          onNodeClick?.(n);
        }}
        onNodeHover={(node) => setHoveredNode(node ? (node as GraphNode) : null)}
        nodeRelSize={6}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={1.5}
        linkDirectionalParticleColor={(link) => {
          const l = link as GraphEdge;
          return EDGE_COLORS[l.direction] || EDGE_COLORS.both;
        }}
        cooldownTicks={100}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        enableZoomInteraction
        enablePanInteraction
        enableNodeDrag
      />
    </div>
  );
}
