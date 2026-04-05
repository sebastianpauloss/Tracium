import SearchBar from "@/components/SearchBar";
import { Network, ShieldCheck, GitBranch, Zap } from "lucide-react";

const FEATURES = [
  {
    icon: Network,
    title: "Interactive Relation Graph",
    desc: "Force-directed graph showing wallet connections, transaction flows, and entity clusters.",
    color: "text-neon-green",
    bg: "bg-neon-green/10",
  },
  {
    icon: ShieldCheck,
    title: "Risk Intelligence",
    desc: "Automatic risk scoring based on OFAC sanctions, Tornado Cash exposure, and behavioral patterns.",
    color: "text-red-400",
    bg: "bg-red-400/10",
  },
  {
    icon: GitBranch,
    title: "Multi-Chain Support",
    desc: "Analyze wallets across Ethereum, Polygon, Solana, TRON, and Bitcoin from a single interface.",
    color: "text-neon-blue",
    bg: "bg-neon-blue/10",
  },
  {
    icon: Zap,
    title: "Real-Time Data",
    desc: "Live transaction data from Blockscout, TronGrid, and Blockchain.info with intelligent caching.",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
];

const STATS = [
  { value: "5", label: "Blockchains" },
  { value: "1000+", label: "Known Labels" },
  { value: "Live", label: "Data" },
  { value: "Free", label: "No API Key" },
];

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] grid-bg">
      {/* Hero section */}
      <div className="max-w-5xl mx-auto px-4 pt-20 pb-16 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-neon-green/10 border border-neon-green/20 text-xs text-neon-green font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
          Blockchain Intelligence Platform
        </div>

        {/* Heading */}
        <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6 leading-tight">
          Follow the{" "}
          <span className="gradient-text">money on-chain</span>
        </h1>

        <p className="text-text-secondary text-lg max-w-2xl mx-auto mb-12">
          Enter any wallet address to visualize its transaction graph, detect relationships,
          identify exchange interactions, and score risk — across ETH, Solana, TRON, and Bitcoin.
        </p>

        {/* Search bar */}
        <SearchBar />

        {/* Stats */}
        <div className="mt-16 flex justify-center gap-8 md:gap-16 flex-wrap">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-black text-neon-green">{value}</p>
              <p className="text-xs text-text-muted mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
            <div
              key={title}
              className="bg-bg-card border border-bg-border rounded-xl p-5 hover:border-opacity-80 transition-colors gradient-border"
            >
              <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mb-4`}>
                <Icon size={18} className={color} />
              </div>
              <h3 className="text-sm font-semibold text-text-primary mb-2">{title}</h3>
              <p className="text-xs text-text-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Supported chains */}
        <div className="mt-10 bg-bg-card border border-bg-border rounded-xl p-6">
          <p className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-4">
            Supported Networks
          </p>
          <div className="flex gap-6 flex-wrap">
            {[
              { icon: "⬡", name: "Ethereum", sub: "EVM-compatible", color: "text-blue-400", api: "Blockscout" },
              { icon: "⬟", name: "Polygon", sub: "EVM / MATIC", color: "text-purple-500", api: "Blockscout" },
              { icon: "◎", name: "Solana", sub: "SPL tokens", color: "text-purple-400", api: "Solana RPC" },
              { icon: "◈", name: "TRON", sub: "TRC-20 tokens", color: "text-red-400", api: "TronGrid" },
              { icon: "₿", name: "Bitcoin", sub: "UTXO model", color: "text-amber-400", api: "Blockchain.info" },
            ].map(({ icon, name, sub, color, api }) => (
              <div key={name} className="flex items-center gap-3">
                <div className={`text-2xl ${color}`}>{icon}</div>
                <div>
                  <p className={`text-sm font-semibold ${color}`}>{name}</p>
                  <p className="text-xs text-text-muted">{sub} · {api}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs text-text-muted mt-8">
          Tracium uses public blockchain APIs. Data is cached for 5 minutes.
          Risk scores are indicative only and not financial or legal advice.
        </p>
      </div>
    </div>
  );
}
