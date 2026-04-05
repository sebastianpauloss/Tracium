"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import WalletCard from "@/components/WalletCard";
import TransactionTable from "@/components/TransactionTable";
import RiskScore from "@/components/RiskScore";
import NodeDetailPanel from "@/components/NodeDetailPanel";
import SearchBar from "@/components/SearchBar";
import { WalletInfo, Transaction, GraphData, GraphNode, Chain } from "@/lib/types";
import { AlertCircle, BarChart2, GitBranch, RefreshCcw, ChevronLeft, ChevronDown, Loader2 } from "lucide-react";

const WalletGraph = dynamic(() => import("@/components/WalletGraph"), { ssr: false });

const TX_LIMIT_OPTIONS = [10, 50, 100, 500, 1_000, 5_000, 10_000] as const;
type TxLimit = (typeof TX_LIMIT_OPTIONS)[number];

function formatLimit(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return `${n}`;
}

interface WalletAnalysisProps {
  address: string;
}

type Tab = "graph" | "transactions";

export default function WalletAnalysis({ address }: WalletAnalysisProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chainParam = (searchParams.get("chain") || "ethereum") as Chain;
  const chainQuery = chainParam !== "ethereum" ? `?chain=${chainParam}` : "";

  const [tab, setTab] = useState<Tab>("graph");
  const [txLimit, setTxLimit] = useState<TxLimit>(50);
  const [limitDropdownOpen, setLimitDropdownOpen] = useState(false);
  const [txLoading, setTxLoading] = useState(false);

  const [walletData, setWalletData] = useState<{
    wallet: WalletInfo;
    transactions: Transaction[];
  } | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [graphLoading, setGraphLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Fetch wallet info + transactions (re-runs when txLimit changes)
  const fetchTransactions = useCallback(
    async (limit: TxLimit) => {
      setTxLoading(true);
      try {
        const res = await fetch(
          `/api/wallet/${encodeURIComponent(address)}?limit=${limit}${
            chainParam !== "ethereum" ? `&chain=${chainParam}` : ""
          }`
        );
        if (res.ok) {
          const data = await res.json();
          setWalletData(data);
        }
      } catch {
        // silently ignore re-fetch errors — original data still shown
      } finally {
        setTxLoading(false);
      }
    },
    [address, chainParam]
  );

  // Initial full load (wallet + graph in parallel)
  const fetchData = useCallback(async () => {
    setLoading(true);
    setGraphLoading(true);
    setError(null);
    setWalletData(null);
    setGraphData(null);
    setSelectedNode(null);

    try {
      const [walletRes, graphRes] = await Promise.allSettled([
        fetch(
          `/api/wallet/${encodeURIComponent(address)}?limit=${txLimit}${
            chainParam !== "ethereum" ? `&chain=${chainParam}` : ""
          }`
        ),
        fetch(`/api/wallet/${encodeURIComponent(address)}/graph${chainQuery}`),
      ]);

      if (walletRes.status === "fulfilled") {
        const data = await walletRes.value.json();
        if (walletRes.value.ok) {
          setWalletData(data);
        } else {
          setError(data.error || "Failed to fetch wallet data");
        }
      } else {
        setError("Network error fetching wallet data");
      }
      setLoading(false);

      if (graphRes.status === "fulfilled") {
        const gData = await graphRes.value.json();
        if (graphRes.value.ok) setGraphData(gData);
      }
      setGraphLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
      setLoading(false);
      setGraphLoading(false);
    }
  }, [address, chainParam, chainQuery, txLimit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // When the user picks a new limit, only re-fetch transactions (not the graph)
  const handleLimitChange = async (newLimit: TxLimit) => {
    setTxLimit(newLimit);
    setLimitDropdownOpen(false);
    await fetchTransactions(newLimit);
  };

  const handleNodeClick = (node: GraphNode) => setSelectedNode(node);

  const handleExploreNode = (nodeAddress: string) => {
    router.push(`/wallet/${nodeAddress}`);
  };

  if (error) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <AlertCircle size={24} className="text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-text-primary">Failed to load wallet</h2>
          <p className="text-sm text-text-secondary">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-bg-card border border-bg-border rounded-lg hover:border-neon-green text-text-primary transition-colors"
            >
              <RefreshCcw size={14} /> Retry
            </button>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 text-sm bg-neon-green text-bg-primary rounded-lg hover:opacity-90"
            >
              Back to search
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Top bar */}
      <div className="border-b border-bg-border bg-bg-secondary px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-4 flex-wrap">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors shrink-0"
          >
            <ChevronLeft size={14} /> Back
          </button>

          <div className="flex-1 min-w-60">
            <SearchBar compact defaultValue={address} defaultChain={chainParam} />
          </div>

          {walletData && <RiskScore score={walletData.wallet.riskScore} size="sm" />}

          <button
            onClick={fetchData}
            className="p-2 rounded-lg bg-bg-card border border-bg-border text-text-muted hover:text-neon-green transition-colors"
            title="Refresh"
          >
            <RefreshCcw size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden max-w-7xl w-full mx-auto px-4 py-4 gap-4">
        {/* Sidebar */}
        <div className="w-80 shrink-0 flex flex-col gap-4 overflow-y-auto">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-bg-card border border-bg-border rounded-xl h-24 animate-pulse" />
              ))}
            </div>
          ) : walletData ? (
            <WalletCard wallet={walletData.wallet} />
          ) : null}

          {/* Graph stats */}
          {graphData && !graphLoading && (
            <div className="bg-bg-card border border-bg-border rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Graph Analysis
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-bg-secondary rounded-lg p-3">
                  <p className="text-[10px] text-text-muted">Connected Wallets</p>
                  <p className="text-xl font-bold text-neon-green">{graphData.nodes.length - 1}</p>
                </div>
                <div className="bg-bg-secondary rounded-lg p-3">
                  <p className="text-[10px] text-text-muted">Connections</p>
                  <p className="text-xl font-bold text-neon-blue">{graphData.links.length}</p>
                </div>
              </div>

              {/* Node type breakdown */}
              {(() => {
                const types = graphData.nodes.reduce<Record<string, number>>((acc, n) => {
                  if (!n.isCenter) acc[n.type] = (acc[n.type] || 0) + 1;
                  return acc;
                }, {});
                return (
                  <div className="space-y-1.5">
                    {Object.entries(types).map(([type, count]) => {
                      const colors: Record<string, string> = {
                        user: "bg-blue-400",
                        exchange: "bg-amber-400",
                        contract: "bg-purple-400",
                        risk: "bg-red-400",
                        unknown: "bg-gray-400",
                      };
                      const maxCount = Math.max(...Object.values(types));
                      return (
                        <div key={type} className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${colors[type] || "bg-gray-400"}`} />
                          <span className="text-xs text-text-muted capitalize flex-1">{type}</span>
                          <span className="text-xs text-text-primary font-mono">{count}</span>
                          <div className="w-16 h-1 bg-bg-border rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${colors[type] || "bg-gray-400"}`}
                              style={{ width: `${(count / maxCount) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {graphData.nodes.filter((n) => n.type === "risk").length > 0 && (
                <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  ⚠ {graphData.nodes.filter((n) => n.type === "risk").length} risk wallet(s) connected
                </div>
              )}
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 gap-4">
          {/* Tabs + TX Limit control */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex gap-1 bg-bg-card border border-bg-border rounded-xl p-1">
              <button
                onClick={() => setTab("graph")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === "graph"
                    ? "bg-neon-green/10 text-neon-green border border-neon-green/20"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                <GitBranch size={14} />
                Relation Graph
              </button>
              <button
                onClick={() => setTab("transactions")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === "transactions"
                    ? "bg-neon-blue/10 text-neon-blue border border-neon-blue/20"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                <BarChart2 size={14} />
                Transactions
                {walletData && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-bg-border text-text-muted">
                    {walletData.transactions.length}
                  </span>
                )}
              </button>
            </div>

            {/* TX Limit dropdown */}
            <div className="relative">
              <button
                onClick={() => setLimitDropdownOpen((o) => !o)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                  limitDropdownOpen
                    ? "bg-bg-secondary border-neon-green text-neon-green"
                    : "bg-bg-card border-bg-border text-text-secondary hover:border-neon-green hover:text-text-primary"
                }`}
              >
                {txLoading ? (
                  <Loader2 size={12} className="animate-spin text-neon-green" />
                ) : (
                  <BarChart2 size={12} />
                )}
                <span>
                  {txLoading ? "Loading..." : `${formatLimit(txLimit)} txs`}
                </span>
                <ChevronDown
                  size={11}
                  className={`transition-transform ${limitDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {limitDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-bg-card border border-bg-border rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="px-3 pt-3 pb-1.5">
                    <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">
                      Transactions to load
                    </p>
                  </div>
                  {TX_LIMIT_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleLimitChange(opt)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-bg-secondary transition-colors ${
                        txLimit === opt ? "bg-bg-secondary" : ""
                      }`}
                    >
                      <span
                        className={
                          txLimit === opt
                            ? "text-text-primary font-semibold"
                            : "text-text-secondary"
                        }
                      >
                        {opt.toLocaleString()} transactions
                      </span>
                      <div className="flex items-center gap-2">
                        {opt > 1000 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 font-medium">
                            slow
                          </span>
                        )}
                        {txLimit === opt && (
                          <span className="text-neon-green text-xs">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                  <div className="px-3 py-2 border-t border-bg-border">
                    <p className="text-[10px] text-text-muted">
                      Max 10,000 · More txs = slower load
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Graph tab */}
          {tab === "graph" && (
            <div className="flex-1 relative min-h-96">
              {graphLoading ? (
                <div className="h-full bg-bg-card border border-bg-border rounded-xl flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <div className="w-12 h-12 rounded-full border-4 border-neon-green/20 border-t-neon-green animate-spin mx-auto" />
                    <p className="text-text-muted text-sm">Building relation graph...</p>
                    <p className="text-text-muted text-xs">
                      Fetching up to {txLimit.toLocaleString()} transactions
                    </p>
                  </div>
                </div>
              ) : graphData ? (
                <div
                  className="h-full relative rounded-xl overflow-hidden border border-bg-border"
                  style={{ minHeight: "500px" }}
                >
                  <WalletGraph
                    data={graphData}
                    centerAddress={address}
                    onNodeClick={handleNodeClick}
                  />
                  {selectedNode && (
                    <NodeDetailPanel
                      node={selectedNode}
                      onClose={() => setSelectedNode(null)}
                      onExplore={handleExploreNode}
                    />
                  )}
                </div>
              ) : (
                <div className="h-full bg-bg-card border border-bg-border rounded-xl flex items-center justify-center">
                  <p className="text-text-muted text-sm">No graph data available</p>
                </div>
              )}
            </div>
          )}

          {/* Transactions tab */}
          {tab === "transactions" && (
            <div className="flex-1">
              {loading || txLoading ? (
                <div className="bg-bg-card border border-bg-border rounded-xl p-8 flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <div className="w-10 h-10 rounded-full border-4 border-neon-blue/20 border-t-neon-blue animate-spin mx-auto" />
                    <p className="text-text-muted text-sm">
                      Loading {txLimit.toLocaleString()} transactions...
                    </p>
                    {txLimit >= 1000 && (
                      <p className="text-text-muted text-xs">
                        Large requests may take a few seconds
                      </p>
                    )}
                  </div>
                </div>
              ) : walletData && walletData.transactions.length > 0 ? (
                <TransactionTable
                  transactions={walletData.transactions}
                  address={address}
                />
              ) : (
                <div className="bg-bg-card border border-bg-border rounded-xl p-8 text-center">
                  <p className="text-text-muted text-sm">No transactions found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
