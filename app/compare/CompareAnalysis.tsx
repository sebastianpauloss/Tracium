"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight, Search, AlertCircle, Loader2,
  ChevronLeft, RefreshCcw, ArrowRight, ArrowLeft, Zap,
} from "lucide-react";
import { detectChain } from "@/lib/utils";
import { Chain, Transaction } from "@/lib/types";
import CompareTable from "@/components/CompareTable";

const CHAIN_CONFIG: Record<Exclude<Chain, "unknown">, { label: string; icon: string; color: string }> = {
  ethereum: { label: "Ethereum", icon: "⬡", color: "#6470ff" },
  polygon:  { label: "Polygon",  icon: "⬟", color: "#8247e5" },
  solana:   { label: "Solana",   icon: "◎", color: "#9945ff" },
  tron:     { label: "TRON",     icon: "◈", color: "#ff4444" },
  bitcoin:  { label: "Bitcoin",  icon: "₿", color: "#ffaa00" },
};

const NETWORKS = [
  { chain: "auto" as const,     label: "Auto-detect", icon: "⚡", color: "#00ff88" },
  { chain: "ethereum" as const, label: "Ethereum",    icon: "⬡", color: "#6470ff" },
  { chain: "polygon"  as const, label: "Polygon",     icon: "⬟", color: "#8247e5" },
  { chain: "solana"   as const, label: "Solana",      icon: "◎", color: "#9945ff" },
  { chain: "tron"     as const, label: "TRON",        icon: "◈", color: "#ff4444" },
  { chain: "bitcoin"  as const, label: "Bitcoin",     icon: "₿", color: "#ffaa00" },
];

const TX_LIMITS = [10, 50, 100, 500, 1_000, 5_000, 10_000] as const;
const TIME_FILTERS = [
  { label: "All time",  value: "all"  },
  { label: "Last 30d",  value: "30d"  },
  { label: "Last 7d",   value: "7d"   },
  { label: "Last 24h",  value: "24h"  },
];

export interface CompareResult {
  transactions: Transaction[];
  totalA2B: number;
  totalB2A: number;
  volumeA2B: number;
  volumeB2A: number;
  walletALabel?: string;
  walletBLabel?: string;
}

function NetworkDropdown({
  selected,
  onChange,
  id,
}: {
  selected: "auto" | Exclude<Chain, "unknown">;
  onChange: (v: "auto" | Exclude<Chain, "unknown">) => void;
  id: string;
}) {
  const [open, setOpen] = useState(false);
  const current = NETWORKS.find((n) => n.chain === selected)!;

  return (
    <div className="relative" id={id}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all shrink-0 ${
          open
            ? "border-neon-green bg-bg-secondary text-neon-green"
            : "border-bg-border bg-bg-secondary text-text-secondary hover:border-neon-green"
        }`}
      >
        <span style={{ color: current.color }}>{current.icon}</span>
        <span className="hidden sm:inline">{current.label}</span>
        <span className={`text-[9px] opacity-60 transition-transform ${open ? "rotate-180 inline-block" : ""}`}>▼</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 w-44 bg-bg-card border border-bg-border rounded-xl shadow-xl z-50 overflow-hidden"
          onMouseLeave={() => setOpen(false)}
        >
          <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider px-3 pt-3 pb-1">
            Network
          </p>
          {NETWORKS.map((n) => (
            <button
              key={n.chain}
              type="button"
              onClick={() => { onChange(n.chain); setOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-bg-secondary transition-colors ${
                selected === n.chain ? "bg-bg-secondary" : ""
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span style={{ color: n.color }}>{n.icon}</span>
                <span className={selected === n.chain ? "text-text-primary font-semibold" : "text-text-secondary"}>
                  {n.label}
                </span>
              </div>
              {selected === n.chain && <span className="text-neon-green text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AddressInput({
  label,
  value,
  onChange,
  network,
  onNetworkChange,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  network: "auto" | Exclude<Chain, "unknown">;
  onNetworkChange: (v: "auto" | Exclude<Chain, "unknown">) => void;
  placeholder: string;
  error?: string;
}) {
  const detected = value.trim() ? detectChain(value.trim()) : "unknown";
  const isValid = detected !== "unknown" || (network !== "auto" && value.trim().length > 10);

  return (
    <div className="flex-1 min-w-0">
      <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
        {label}
      </label>
      <div
        className={`flex items-center gap-2 bg-bg-card border rounded-xl px-3 py-2 transition-all ${
          error ? "border-neon-red" : isValid && value ? "border-neon-green shadow-neon" : "border-bg-border"
        }`}
      >
        <Search size={14} className={isValid && value ? "text-neon-green shrink-0" : "text-text-muted shrink-0"} />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-xs font-mono text-text-primary placeholder-text-muted outline-none py-1.5 min-w-0"
          spellCheck={false}
          autoComplete="off"
        />
        <NetworkDropdown selected={network} onChange={onNetworkChange} id={`dd-${label}`} />
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-neon-red flex items-center gap-1">
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
}

export default function CompareAnalysis() {
  const router = useRouter();

  const [walletA, setWalletA] = useState("");
  const [walletB, setWalletB] = useState("");
  const [networkA, setNetworkA] = useState<"auto" | Exclude<Chain, "unknown">>("auto");
  const [networkB, setNetworkB] = useState<"auto" | Exclude<Chain, "unknown">>("auto");
  const [txLimit, setTxLimit] = useState<(typeof TX_LIMITS)[number]>(100);
  const [timeFilter, setTimeFilter] = useState("all");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errA, setErrA] = useState<string | undefined>();
  const [errB, setErrB] = useState<string | undefined>();

  const resolveChain = (addr: string, net: "auto" | Exclude<Chain, "unknown">): Chain => {
    if (net !== "auto") return net;
    return detectChain(addr.trim());
  };

  const validate = (): boolean => {
    let ok = true;
    const chainA = resolveChain(walletA, networkA);
    const chainB = resolveChain(walletB, networkB);

    if (!walletA.trim() || chainA === "unknown") {
      setErrA("Invalid address format");
      ok = false;
    } else setErrA(undefined);

    if (!walletB.trim() || chainB === "unknown") {
      setErrB("Invalid address format");
      ok = false;
    } else setErrB(undefined);

    if (ok && walletA.trim().toLowerCase() === walletB.trim().toLowerCase()) {
      setErrB("Wallet B must be different from Wallet A");
      ok = false;
    }

    return ok;
  };

  const handleSearch = useCallback(async () => {
    if (!validate()) return;

    const chainA = resolveChain(walletA, networkA);

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const params = new URLSearchParams({
        walletA: walletA.trim(),
        walletB: walletB.trim(),
        chain: chainA,
        limit: String(txLimit),
        timeFilter,
      });

      const res = await fetch(`/api/compare?${params}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to compare wallets");
      } else {
        setResult(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [walletA, walletB, networkA, networkB, txLimit, timeFilter]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const chainA = resolveChain(walletA, networkA);
  const chainConfig = chainA !== "unknown" ? CHAIN_CONFIG[chainA as Exclude<Chain, "unknown">] : null;

  const swapWallets = () => {
    setWalletA(walletB);
    setWalletB(walletA);
    setNetworkA(networkB);
    setNetworkB(networkA);
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Top bar */}
      <div className="border-b border-bg-border bg-bg-secondary px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors shrink-0"
          >
            <ChevronLeft size={14} /> Back
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center">
              <ArrowLeftRight size={13} className="text-neon-blue" />
            </div>
            <span className="text-sm font-semibold text-text-primary">Wallet Comparison</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-neon-blue/10 text-neon-blue border border-neon-blue/20 font-medium">
              Beta
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl w-full mx-auto px-4 py-6 flex flex-col gap-6">

        {/* Search form */}
        <div className="bg-bg-card border border-bg-border rounded-xl p-5">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">
            Wallet Addresses
          </p>

          <div className="flex items-end gap-3 flex-wrap" onKeyDown={handleKeyDown}>
            <AddressInput
              label="Wallet A (Origin)"
              value={walletA}
              onChange={setWalletA}
              network={networkA}
              onNetworkChange={setNetworkA}
              placeholder="Enter origin wallet address..."
              error={errA}
            />

            {/* Swap button */}
            <button
              type="button"
              onClick={swapWallets}
              title="Swap wallets"
              className="shrink-0 w-9 h-9 mb-0.5 rounded-lg bg-bg-secondary border border-bg-border text-text-muted hover:text-neon-green hover:border-neon-green transition-all flex items-center justify-center"
            >
              <ArrowLeftRight size={15} />
            </button>

            <AddressInput
              label="Wallet B (Destination)"
              value={walletB}
              onChange={setWalletB}
              network={networkB}
              onNetworkChange={setNetworkB}
              placeholder="Enter destination wallet address..."
              error={errB}
            />
          </div>

          {/* Filters row */}
          <div className="mt-4 pt-4 border-t border-bg-border flex items-center gap-3 flex-wrap">
            {/* Time filter */}
            <div className="flex gap-1 bg-bg-secondary rounded-lg p-1">
              {TIME_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setTimeFilter(f.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    timeFilter === f.value
                      ? "bg-bg-card text-text-primary border border-bg-border"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* TX limit */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Max results:</span>
              <div className="flex gap-1 bg-bg-secondary rounded-lg p-1">
                {TX_LIMITS.filter(n => n <= 1000).map((n) => (
                  <button
                    key={n}
                    onClick={() => setTxLimit(n)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                      txLimit === n
                        ? "bg-bg-card text-text-primary border border-bg-border"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    {n >= 1000 ? `${n/1000}K` : n}
                  </button>
                ))}
              </div>
            </div>

            {/* Search button */}
            <button
              onClick={handleSearch}
              disabled={loading || !walletA.trim() || !walletB.trim()}
              className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-neon-green text-bg-primary hover:opacity-90"
            >
              {loading ? (
                <><Loader2 size={14} className="animate-spin" /> Searching...</>
              ) : (
                <><Zap size={14} /> Compare Wallets</>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
            <AlertCircle size={16} />
            <span>{error}</span>
            <button onClick={handleSearch} className="ml-auto flex items-center gap-1.5 text-xs hover:text-text-primary">
              <RefreshCcw size={12} /> Retry
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            <div className="bg-bg-card border border-bg-border rounded-xl h-24 animate-pulse" />
            <div className="bg-bg-card border border-bg-border rounded-xl h-64 animate-pulse" />
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <>
            {/* Flow summary */}
            <div className="bg-bg-card border border-bg-border rounded-xl p-5">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">
                Fund Flow Summary
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Wallet A → B */}
                <div className="bg-bg-secondary rounded-xl p-4 border border-bg-border">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-neon-green" />
                    <span className="text-xs text-text-muted font-mono">
                      {result.walletALabel || `${walletA.slice(0, 8)}...`}
                    </span>
                    <ArrowRight size={12} className="text-neon-green ml-auto" />
                    <span className="text-xs text-text-muted font-mono">
                      {result.walletBLabel || `${walletB.slice(0, 8)}...`}
                    </span>
                  </div>
                  <p className="text-2xl font-black text-neon-green">{result.totalA2B}</p>
                  <p className="text-xs text-text-muted mt-0.5">transactions</p>
                  {result.volumeA2B > 0 && (
                    <p className="text-xs text-neon-green/70 mt-1 font-mono">
                      Vol: ${result.volumeA2B.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                    </p>
                  )}
                </div>

                {/* Total */}
                <div className="bg-neon-green/5 border border-neon-green/20 rounded-xl p-4 text-center flex flex-col items-center justify-center">
                  <ArrowLeftRight size={20} className="text-neon-green mb-2" />
                  <p className="text-3xl font-black text-neon-green">
                    {result.transactions.length}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">total transactions</p>
                  {chainConfig && (
                    <span className="mt-2 text-xs px-2 py-0.5 rounded-full bg-bg-card border border-bg-border"
                      style={{ color: chainConfig.color }}>
                      {chainConfig.icon} {chainConfig.label}
                    </span>
                  )}
                </div>

                {/* Wallet B → A */}
                <div className="bg-bg-secondary rounded-xl p-4 border border-bg-border">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-neon-blue" />
                    <span className="text-xs text-text-muted font-mono">
                      {result.walletBLabel || `${walletB.slice(0, 8)}...`}
                    </span>
                    <ArrowRight size={12} className="text-neon-blue ml-auto" />
                    <span className="text-xs text-text-muted font-mono">
                      {result.walletALabel || `${walletA.slice(0, 8)}...`}
                    </span>
                  </div>
                  <p className="text-2xl font-black text-neon-blue">{result.totalB2A}</p>
                  <p className="text-xs text-text-muted mt-0.5">transactions</p>
                  {result.volumeB2A > 0 && (
                    <p className="text-xs text-neon-blue/70 mt-1 font-mono">
                      Vol: ${result.volumeB2A.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* No results */}
            {result.transactions.length === 0 ? (
              <div className="bg-bg-card border border-bg-border rounded-xl p-12 text-center">
                <ArrowLeftRight size={32} className="text-text-muted mx-auto mb-4" />
                <p className="text-text-primary font-semibold mb-2">No transactions found</p>
                <p className="text-sm text-text-muted max-w-md mx-auto">
                  No direct transactions were found between these two wallets in the selected time range.
                  Try expanding the time filter or increasing the limit.
                </p>
              </div>
            ) : (
              <CompareTable
                transactions={result.transactions}
                walletA={walletA.trim()}
                walletB={walletB.trim()}
                walletALabel={result.walletALabel}
                walletBLabel={result.walletBLabel}
              />
            )}
          </>
        )}

        {/* Empty state */}
        {!result && !loading && !error && (
          <div className="bg-bg-card border border-bg-border rounded-xl p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center mx-auto mb-5">
              <ArrowLeftRight size={28} className="text-neon-blue" />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">Compare Two Wallets</h3>
            <p className="text-sm text-text-muted max-w-md mx-auto">
              Enter two wallet addresses above to see all transactions between them —
              including direction, amounts, tokens, and timestamps.
            </p>
            <div className="mt-6 flex gap-4 justify-center text-xs text-text-muted flex-wrap">
              <div className="flex items-center gap-2 px-3 py-2 bg-bg-secondary rounded-lg border border-bg-border">
                <ArrowRight size={12} className="text-neon-green" /> A → B flow
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-bg-secondary rounded-lg border border-bg-border">
                <ArrowLeft size={12} className="text-neon-blue" /> B → A flow
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-bg-secondary rounded-lg border border-bg-border">
                <ArrowLeftRight size={12} className="text-text-muted" /> Sorted & filtered
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
