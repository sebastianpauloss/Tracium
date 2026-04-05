"use client";

import { useState, useMemo } from "react";
import { Transaction } from "@/lib/types";
import { format } from "date-fns";
import {
  ArrowRight, ArrowLeft, ArrowLeftRight,
  ExternalLink, Download, ChevronUp, ChevronDown as ChevronDownIcon,
} from "lucide-react";

interface CompareTableProps {
  transactions: Transaction[];
  walletA: string;
  walletB: string;
  walletALabel?: string;
  walletBLabel?: string;
}

type SortKey = "timestamp" | "value";
type SortDir = "asc" | "desc";

const EXPLORER_TX: Record<string, string> = {
  ethereum: "https://etherscan.io/tx/",
  polygon:  "https://polygonscan.com/tx/",
  solana:   "https://solscan.io/tx/",
  tron:     "https://tronscan.org/#/transaction/",
  bitcoin:  "https://mempool.space/tx/",
};

export default function CompareTable({
  transactions,
  walletA,
  walletB,
  walletALabel,
  walletBLabel,
}: CompareTableProps) {
  const [dirFilter, setDirFilter] = useState<"all" | "a2b" | "b2a">("all");
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const addrALower = walletA.toLowerCase();
  const shortA = walletALabel || `${walletA.slice(0, 6)}...${walletA.slice(-4)}`;
  const shortB = walletBLabel || `${walletB.slice(0, 6)}...${walletB.slice(-4)}`;

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (dirFilter === "a2b") return tx.from.toLowerCase() === addrALower;
      if (dirFilter === "b2a") return tx.from.toLowerCase() !== addrALower;
      return true;
    });
  }, [transactions, dirFilter, addrALower]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortKey === "timestamp") {
        const ta = new Date(a.timestamp).getTime();
        const tb = new Date(b.timestamp).getTime();
        return sortDir === "desc" ? tb - ta : ta - tb;
      }
      // Sort by numeric value
      const va = parseFloat(a.value.split(" ")[0]) || 0;
      const vb = parseFloat(b.value.split(" ")[0]) || 0;
      return sortDir === "desc" ? vb - va : va - vb;
    });
  }, [filtered, sortKey, sortDir]);

  const paginated = useMemo(
    () => sorted.slice((page - 1) * pageSize, page * pageSize),
    [sorted, page]
  );

  const totalPages = Math.ceil(sorted.length / pageSize);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(1);
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronDownIcon size={12} className="opacity-30" />;
    return sortDir === "desc"
      ? <ChevronDownIcon size={12} className="text-neon-green" />
      : <ChevronUp size={12} className="text-neon-green" />;
  };

  const exportCSV = () => {
    const headers = ["Hash", "Time", "Direction", "From", "To", "Amount", "Token", "Chain", "Status"];
    const rows = sorted.map((tx) => {
      const isA2B = tx.from.toLowerCase() === addrALower;
      return [
        tx.hash,
        tx.timestamp,
        isA2B ? `${shortA} → ${shortB}` : `${shortB} → ${shortA}`,
        tx.fromLabel || tx.from,
        tx.toLabel   || tx.to,
        tx.value,
        tx.token,
        tx.chain,
        tx.status,
      ];
    });
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `tracium-compare-${walletA.slice(0, 6)}-${walletB.slice(0, 6)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDate = (ts: string) => {
    try { return format(new Date(ts), "MMM dd, HH:mm"); } catch { return "-"; }
  };

  const shortenHash = (h: string) =>
    h.length > 12 ? `${h.slice(0, 8)}...${h.slice(-6)}` : h;

  return (
    <div className="bg-bg-card border border-bg-border rounded-xl overflow-hidden">
      {/* Controls */}
      <div className="p-4 border-b border-bg-border flex gap-3 flex-wrap items-center">
        {/* Direction filter */}
        <div className="flex gap-1 bg-bg-secondary rounded-lg p-1">
          <button
            onClick={() => { setDirFilter("all"); setPage(1); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              dirFilter === "all" ? "bg-bg-card border border-bg-border text-text-primary" : "text-text-muted hover:text-text-primary"
            }`}
          >
            <ArrowLeftRight size={11} /> All
          </button>
          <button
            onClick={() => { setDirFilter("a2b"); setPage(1); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              dirFilter === "a2b" ? "bg-green-500/15 text-neon-green" : "text-text-muted hover:text-text-primary"
            }`}
          >
            <ArrowRight size={11} /> A → B
          </button>
          <button
            onClick={() => { setDirFilter("b2a"); setPage(1); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              dirFilter === "b2a" ? "bg-blue-500/15 text-neon-blue" : "text-text-muted hover:text-text-primary"
            }`}
          >
            <ArrowLeft size={11} /> B → A
          </button>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-text-muted">{sorted.length} transactions</span>
          <button
            onClick={exportCSV}
            disabled={sorted.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-neon-green/10 text-neon-green border border-neon-green/20 hover:bg-neon-green/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={12} /> Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-bg-border">
              <th className="px-4 py-3 text-left text-text-muted font-medium">Direction</th>
              <th className="px-4 py-3 text-left text-text-muted font-medium">Hash</th>
              <th
                className="px-4 py-3 text-left text-text-muted font-medium cursor-pointer hover:text-text-primary select-none"
                onClick={() => toggleSort("timestamp")}
              >
                <span className="flex items-center gap-1">Time <SortIcon col="timestamp" /></span>
              </th>
              <th className="px-4 py-3 text-left text-text-muted font-medium">From</th>
              <th className="px-4 py-3 text-left text-text-muted font-medium">To</th>
              <th
                className="px-4 py-3 text-left text-text-muted font-medium cursor-pointer hover:text-text-primary select-none"
                onClick={() => toggleSort("value")}
              >
                <span className="flex items-center gap-1">Amount <SortIcon col="value" /></span>
              </th>
              <th className="px-4 py-3 text-left text-text-muted font-medium">Token</th>
              <th className="px-4 py-3 text-left text-text-muted font-medium">Net</th>
              <th className="px-4 py-3 text-left text-text-muted font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-text-muted">
                  No transactions match the current filter
                </td>
              </tr>
            ) : (
              paginated.map((tx, i) => {
                const isA2B = tx.from.toLowerCase() === addrALower;
                const explorerUrl = EXPLORER_TX[tx.chain];

                return (
                  <tr
                    key={tx.hash || i}
                    className="border-b border-bg-border hover:bg-bg-secondary/50 transition-colors"
                  >
                    {/* Direction */}
                    <td className="px-4 py-3">
                      {isA2B ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-neon-green text-[10px] font-bold">
                          <ArrowRight size={9} /> A → B
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-neon-blue text-[10px] font-bold">
                          <ArrowLeft size={9} /> B → A
                        </span>
                      )}
                    </td>
                    {/* Hash */}
                    <td className="px-4 py-3 font-mono text-text-secondary">
                      {tx.hash ? shortenHash(tx.hash) : "-"}
                    </td>
                    {/* Time */}
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                      {formatDate(tx.timestamp)}
                    </td>
                    {/* From */}
                    <td className="px-4 py-3">
                      <span
                        className={`font-mono ${
                          tx.from.toLowerCase() === addrALower ? "text-neon-green" : "text-neon-blue"
                        }`}
                        title={tx.from}
                      >
                        {tx.fromLabel || shortenHash(tx.from)}
                      </span>
                    </td>
                    {/* To */}
                    <td className="px-4 py-3">
                      <span
                        className={`font-mono ${
                          (tx.to || "").toLowerCase() === addrALower ? "text-neon-green" : "text-neon-blue"
                        }`}
                        title={tx.to}
                      >
                        {tx.toLabel || shortenHash(tx.to || "-")}
                      </span>
                    </td>
                    {/* Amount */}
                    <td className="px-4 py-3">
                      <span className={isA2B ? "text-neon-green font-semibold" : "text-neon-blue font-semibold"}>
                        {isA2B ? "+" : "-"}{tx.value}
                      </span>
                      {tx.valueUSD && tx.valueUSD !== "-" && (
                        <p className="text-text-muted mt-0.5">{tx.valueUSD}</p>
                      )}
                    </td>
                    {/* Token */}
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-bg-border text-text-muted font-mono">{tx.token}</span>
                    </td>
                    {/* Network */}
                    <td className="px-4 py-3 text-text-muted capitalize">{tx.chain}</td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        tx.status === "success"
                          ? "bg-green-500/10 text-neon-green"
                          : "bg-red-500/10 text-neon-red"
                      }`}>
                        {tx.status === "success" ? "✓ OK" : "✗ Failed"}
                      </span>
                    </td>
                    {/* External link */}
                    <td className="px-4 py-3">
                      {explorerUrl && tx.hash && (
                        <a
                          href={`${explorerUrl}${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-text-muted hover:text-neon-green transition-colors"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-bg-border flex items-center justify-between">
          <span className="text-xs text-text-muted">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs rounded-lg bg-bg-secondary border border-bg-border text-text-muted hover:text-text-primary disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-xs rounded-lg bg-bg-secondary border border-bg-border text-text-muted hover:text-text-primary disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
