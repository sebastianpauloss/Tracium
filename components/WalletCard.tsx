"use client";

import { WalletInfo } from "@/lib/types";
import { Copy, ExternalLink, Shield, AlertTriangle } from "lucide-react";
import { useState } from "react";

interface WalletCardProps {
  wallet: WalletInfo;
}

const CHAIN_EXPLORERS: Record<string, string> = {
  ethereum: "https://etherscan.io/address/",
  tron: "https://tronscan.org/#/address/",
  bitcoin: "https://mempool.space/address/",
};

const TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  user: { label: "User Wallet", color: "text-blue-400", bg: "bg-blue-400/10" },
  exchange: { label: "Exchange", color: "text-amber-400", bg: "bg-amber-400/10" },
  contract: { label: "Smart Contract", color: "text-purple-400", bg: "bg-purple-400/10" },
  risk: { label: "Risk Wallet", color: "text-red-400", bg: "bg-red-400/10" },
  unknown: { label: "Unknown", color: "text-gray-400", bg: "bg-gray-400/10" },
};

const CHAIN_LABELS: Record<string, { label: string; color: string }> = {
  ethereum: { label: "Ethereum", color: "text-blue-400" },
  tron: { label: "TRON", color: "text-red-400" },
  bitcoin: { label: "Bitcoin", color: "text-amber-400" },
};

export default function WalletCard({ wallet }: WalletCardProps) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const explorerUrl = CHAIN_EXPLORERS[wallet.chain];
  const typeInfo = TYPE_LABELS[wallet.type] || TYPE_LABELS.unknown;
  const chainInfo = CHAIN_LABELS[wallet.chain] || { label: wallet.chain, color: "text-text-muted" };

  return (
    <div className="bg-bg-card border border-bg-border rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {wallet.label && (
            <p className="text-xs text-neon-green font-semibold mb-1">{wallet.label}</p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-sm font-mono text-text-primary break-all">{wallet.address}</code>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={copy}
            className="p-2 rounded-lg bg-bg-hover hover:bg-bg-border transition-colors text-text-muted hover:text-text-primary"
            title="Copy address"
          >
            <Copy size={15} />
          </button>
          {explorerUrl && (
            <a
              href={`${explorerUrl}${wallet.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-bg-hover hover:bg-bg-border transition-colors text-text-muted hover:text-neon-green"
              title="View on explorer"
            >
              <ExternalLink size={15} />
            </a>
          )}
        </div>
      </div>

      {copied && (
        <p className="text-xs text-neon-green">Address copied!</p>
      )}

      {/* Badges */}
      <div className="flex gap-2 flex-wrap">
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${typeInfo.bg} ${typeInfo.color}`}>
          {typeInfo.label}
        </span>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium bg-bg-border ${chainInfo.color}`}>
          {chainInfo.label}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-bg-secondary rounded-lg p-3">
          <p className="text-xs text-text-muted mb-1">Balance</p>
          <p className="text-sm font-semibold text-text-primary">{wallet.balance}</p>
          <p className="text-xs text-text-muted">{wallet.balanceUSD}</p>
        </div>
        <div className="bg-bg-secondary rounded-lg p-3">
          <p className="text-xs text-text-muted mb-1">Transactions</p>
          <p className="text-sm font-semibold text-text-primary">{wallet.txCount.toLocaleString()}</p>
        </div>
        <div className="bg-bg-secondary rounded-lg p-3">
          <p className="text-xs text-text-muted mb-1">Risk Score</p>
          <p
            className={`text-sm font-bold ${
              wallet.riskScore >= 70
                ? "text-neon-red"
                : wallet.riskScore >= 30
                ? "text-amber-400"
                : "text-neon-green"
            }`}
          >
            {wallet.riskScore}/100
          </p>
        </div>
      </div>

      {/* Risk flags */}
      {wallet.riskFlags.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-text-muted font-semibold flex items-center gap-1.5">
            <AlertTriangle size={12} className="text-amber-400" />
            Risk Indicators
          </p>
          {wallet.riskFlags.map((flag, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-text-secondary bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
              <span className="text-neon-red mt-0.5">⚠</span>
              <span>{flag}</span>
            </div>
          ))}
        </div>
      )}

      {wallet.riskFlags.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-neon-green bg-green-500/5 border border-green-500/20 rounded-lg px-3 py-2">
          <Shield size={12} />
          No risk indicators detected
        </div>
      )}
    </div>
  );
}
