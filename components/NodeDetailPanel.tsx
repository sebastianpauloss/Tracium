"use client";

import { GraphNode } from "@/lib/types";
import { X, ExternalLink } from "lucide-react";

interface NodeDetailPanelProps {
  node: GraphNode | null;
  onClose: () => void;
  onExplore: (address: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  user: "text-blue-400",
  exchange: "text-amber-400",
  contract: "text-purple-400",
  risk: "text-red-400",
  unknown: "text-gray-400",
};

const CHAIN_EXPLORERS: Record<string, string> = {
  ethereum: "https://etherscan.io/address/",
  tron: "https://tronscan.org/#/address/",
  bitcoin: "https://mempool.space/address/",
};

export default function NodeDetailPanel({ node, onClose, onExplore }: NodeDetailPanelProps) {
  if (!node) return null;

  const explorerUrl = CHAIN_EXPLORERS[node.chain];
  const typeColor = TYPE_COLORS[node.type] || TYPE_COLORS.unknown;
  const isRisk = node.type === "risk" || (node.riskScore || 0) >= 70;

  return (
    <div className="absolute bottom-4 right-4 z-20 bg-bg-card border border-bg-border rounded-xl p-4 w-72 shadow-card">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className={`text-xs font-semibold uppercase ${typeColor}`}>{node.type}</p>
          {node.label && <p className="text-sm font-semibold text-text-primary mt-0.5">{node.label}</p>}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <code className="block text-xs font-mono text-text-secondary bg-bg-secondary rounded-lg px-3 py-2 break-all mb-3">
        {node.id}
      </code>

      {isRisk && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          ⚠ This wallet has risk indicators
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-bg-secondary rounded-lg p-2">
          <p className="text-[10px] text-text-muted">Transactions</p>
          <p className="text-sm font-semibold text-text-primary">{node.txCount}</p>
        </div>
        <div className="bg-bg-secondary rounded-lg p-2">
          <p className="text-[10px] text-text-muted">Volume</p>
          <p className="text-sm font-semibold text-text-primary">
            {node.volume > 0 ? node.volume.toFixed(4) : "—"}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {!node.isCenter && (
          <button
            onClick={() => onExplore(node.id)}
            className="flex-1 px-3 py-2 text-xs font-semibold bg-neon-green/10 border border-neon-green/30 text-neon-green rounded-lg hover:bg-neon-green/20 transition-colors"
          >
            Explore wallet →
          </button>
        )}
        {explorerUrl && (
          <a
            href={`${explorerUrl}${node.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-text-muted bg-bg-secondary rounded-lg hover:text-text-primary transition-colors border border-bg-border"
          >
            <ExternalLink size={12} />
            Explorer
          </a>
        )}
      </div>
    </div>
  );
}
