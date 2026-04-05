"use client";

import { useState, useMemo } from "react";
import { Transaction } from "@/lib/types";
import { format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, ExternalLink, Filter, ChevronDown, Download } from "lucide-react";

interface TransactionTableProps {
  transactions: Transaction[];
  address: string;
}

const DIRECTION_CONFIG = {
  in: { icon: ArrowDownLeft, color: "text-neon-green", bg: "bg-green-500/10", label: "IN" },
  out: { icon: ArrowUpRight, color: "text-neon-red", bg: "bg-red-500/10", label: "OUT" },
  self: { icon: ArrowLeftRight, color: "text-text-muted", bg: "bg-bg-border", label: "SELF" },
};

const EXPLORER_TX: Record<string, string> = {
  ethereum: "https://etherscan.io/tx/",
  polygon: "https://polygonscan.com/tx/",
  solana: "https://solscan.io/tx/",
  tron: "https://tronscan.org/#/transaction/",
  bitcoin: "https://mempool.space/tx/",
};

export default function TransactionTable({ transactions, address }: TransactionTableProps) {
  const [search, setSearch] = useState("");
  const [dirFilter, setDirFilter] = useState<"all" | "in" | "out">("all");
  const [tokenFilter, setTokenFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Unique tokens in tx list
  const tokens = useMemo(() => {
    const set = new Set(transactions.map((t) => t.token));
    return ["all", ...Array.from(set)];
  }, [transactions]);

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (dirFilter !== "all" && tx.direction !== dirFilter) return false;
      if (tokenFilter !== "all" && tx.token !== tokenFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !tx.hash.toLowerCase().includes(s) &&
          !tx.from.toLowerCase().includes(s) &&
          !tx.to.toLowerCase().includes(s) &&
          !(tx.fromLabel || "").toLowerCase().includes(s) &&
          !(tx.toLabel || "").toLowerCase().includes(s)
        )
          return false;
      }
      return true;
    });
  }, [transactions, dirFilter, tokenFilter, search]);

  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page]
  );

  const totalPages = Math.ceil(filtered.length / pageSize);

  const exportToCSV = () => {
    const headers = ["Hash", "Time", "Direction", "From", "To", "Amount", "Token", "Status", "Chain"];
    const rows = filtered.map((tx) => [
      tx.hash,
      tx.timestamp,
      tx.direction.toUpperCase(),
      tx.fromLabel || tx.from,
      tx.toLabel || tx.to,
      tx.value,
      tx.token,
      tx.status,
      tx.chain,
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `tracium-transactions-${address.slice(0, 8)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatDate = (timestamp: string) => {
    try {
      const d = new Date(timestamp);
      return format(d, "MMM dd, HH:mm");
    } catch {
      return "-";
    }
  };

  const shortenHash = (hash: string) =>
    hash.length > 12 ? `${hash.slice(0, 8)}...${hash.slice(-6)}` : hash;

  return (
    <div className="bg-bg-card border border-bg-border rounded-xl overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-bg-border flex gap-3 flex-wrap items-center">
        <div className="flex items-center gap-2 text-text-muted">
          <Filter size={14} />
          <span className="text-xs">Filter:</span>
        </div>

        <input
          type="text"
          placeholder="Search hash, address..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-40 bg-bg-secondary border border-bg-border rounded-lg px-3 py-1.5 text-xs font-mono text-text-primary placeholder-text-muted outline-none focus:border-neon-green transition-colors"
        />

        <div className="flex gap-1 bg-bg-secondary rounded-lg p-1">
          {(["all", "in", "out"] as const).map((dir) => (
            <button
              key={dir}
              onClick={() => { setDirFilter(dir); setPage(1); }}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                dirFilter === dir
                  ? dir === "in"
                    ? "bg-green-500/20 text-neon-green"
                    : dir === "out"
                    ? "bg-red-500/20 text-neon-red"
                    : "bg-bg-border text-text-primary"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {dir.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="relative">
          <select
            value={tokenFilter}
            onChange={(e) => { setTokenFilter(e.target.value); setPage(1); }}
            className="appearance-none bg-bg-secondary border border-bg-border rounded-lg pl-3 pr-7 py-1.5 text-xs text-text-primary outline-none focus:border-neon-green transition-colors cursor-pointer"
          >
            {tokens.map((t) => (
              <option key={t} value={t}>
                {t === "all" ? "All tokens" : t}
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-text-muted">
            {filtered.length} transactions
          </span>
          <button
            onClick={exportToCSV}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-neon-green/10 text-neon-green border border-neon-green/20 hover:bg-neon-green/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={12} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-bg-border">
              {["", "Hash", "Time", "From", "To", "Amount", "Token", ""].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-text-muted font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-text-muted">
                  No transactions found
                </td>
              </tr>
            ) : (
              paginated.map((tx, i) => {
                const dirConf = DIRECTION_CONFIG[tx.direction];
                const DirIcon = dirConf.icon;
                const explorerUrl = EXPLORER_TX[tx.chain];

                return (
                  <tr
                    key={tx.hash || i}
                    className="border-b border-bg-border hover:bg-bg-hover transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${dirConf.bg} ${dirConf.color} text-[10px] font-bold`}>
                        <DirIcon size={10} />
                        {dirConf.label}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-text-secondary">
                      {tx.hash ? shortenHash(tx.hash) : "-"}
                    </td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                      {formatDate(tx.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-mono ${
                          tx.from.toLowerCase() === address.toLowerCase()
                            ? "text-neon-green"
                            : "text-text-secondary"
                        }`}
                        title={tx.from}
                      >
                        {tx.fromLabel || shortenHash(tx.from)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-mono ${
                          tx.to.toLowerCase() === address.toLowerCase()
                            ? "text-neon-green"
                            : "text-text-secondary"
                        }`}
                        title={tx.to}
                      >
                        {tx.toLabel || shortenHash(tx.to)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={tx.direction === "in" ? "text-neon-green" : tx.direction === "out" ? "text-neon-red" : "text-text-muted"}>
                        {tx.direction === "in" ? "+" : tx.direction === "out" ? "-" : ""}
                        {tx.value}
                      </span>
                      {tx.valueUSD && tx.valueUSD !== "-" && (
                        <p className="text-text-muted">{tx.valueUSD}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-bg-border text-text-muted">
                        {tx.token}
                      </span>
                    </td>
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
          <span className="text-xs text-text-muted">
            Page {page} of {totalPages}
          </span>
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
