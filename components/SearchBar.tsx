"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, AlertCircle, Loader2, ChevronDown, Check } from "lucide-react";
import { detectChain } from "@/lib/utils";
import { Chain } from "@/lib/types";

const CHAIN_CONFIG: Record<
  Exclude<Chain, "unknown">,
  { label: string; color: string; icon: string; placeholder: string }
> = {
  ethereum: {
    label: "Ethereum",
    color: "text-blue-400",
    icon: "⬡",
    placeholder: "0x... (ETH address)",
  },
  polygon: {
    label: "Polygon",
    color: "text-purple-500",
    icon: "⬟",
    placeholder: "0x... (Polygon address)",
  },
  solana: {
    label: "Solana",
    color: "text-purple-400",
    icon: "◎",
    placeholder: "Base58 Solana address...",
  },
  tron: {
    label: "TRON",
    color: "text-red-400",
    icon: "◈",
    placeholder: "T... (TRON address)",
  },
  bitcoin: {
    label: "Bitcoin",
    color: "text-amber-400",
    icon: "₿",
    placeholder: "1... or bc1... (BTC address)",
  },
};

const NETWORKS: Array<{ chain: Exclude<Chain, "unknown"> | "auto"; label: string; icon: string; color: string }> = [
  { chain: "auto", label: "Auto-detect", icon: "⚡", color: "text-neon-green" },
  { chain: "ethereum", label: "Ethereum", icon: "⬡", color: "text-blue-400" },
  { chain: "polygon", label: "Polygon", icon: "⬟", color: "text-purple-500" },
  { chain: "solana", label: "Solana", icon: "◎", color: "text-purple-400" },
  { chain: "tron", label: "TRON", icon: "◈", color: "text-red-400" },
  { chain: "bitcoin", label: "Bitcoin", icon: "₿", color: "text-amber-400" },
];

const EXAMPLE_ADDRESSES = [
  { chain: "ethereum" as Chain, address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", label: "Vitalik" },
  { chain: "solana" as Chain, address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", label: "Binance SOL" },
  { chain: "bitcoin" as Chain, address: "1NDyJtNTjmwk5xPNhjgAMu4HDHigtobu1s", label: "Binance BTC" },
  { chain: "tron" as Chain, address: "TNaRAoLUyYEV2uF7GRZPbKHUiErLuoHb4u", label: "Binance TRON" },
];

interface SearchBarProps {
  defaultValue?: string;
  compact?: boolean;
  defaultChain?: Chain;
}

export default function SearchBar({
  defaultValue = "",
  compact = false,
  defaultChain,
}: SearchBarProps) {
  const [value, setValue] = useState(defaultValue);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<
    Exclude<Chain, "unknown"> | "auto"
  >(defaultChain && defaultChain !== "unknown" ? defaultChain : "auto");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Resolve effective chain: manual selection overrides auto-detect
  const autoDetected = value.trim() ? detectChain(value.trim()) : "unknown";
  const effectiveChain: Chain =
    selectedNetwork === "auto"
      ? autoDetected
      : selectedNetwork;

  const isValid = effectiveChain !== "unknown";
  const hasError = value.length > 5 && !isValid;

  const activeNetwork = NETWORKS.find((n) => n.chain === selectedNetwork)!;
  const chainConfig =
    effectiveChain !== "unknown" ? CHAIN_CONFIG[effectiveChain] : null;

  // Placeholder text
  const placeholder =
    selectedNetwork !== "auto" && CHAIN_CONFIG[selectedNetwork]
      ? CHAIN_CONFIG[selectedNetwork].placeholder
      : "Enter wallet address (ETH, SOL, TRON, BTC)...";

  const handleSubmit = (addr?: string, chainOverride?: Chain) => {
    const address = (addr || value).trim();
    if (!address) return;
    const chain = chainOverride ?? effectiveChain;
    if (chain === "unknown") return;
    setIsLoading(true);
    // Pass chain as query param for all non-ethereum chains so the API can disambiguate
    const chainParam =
      chain !== "ethereum" ? `?chain=${chain}` : "";
    router.push(`/wallet/${encodeURIComponent(address)}${chainParam}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  const handleNetworkSelect = (chain: Exclude<Chain, "unknown"> | "auto") => {
    setSelectedNetwork(chain);
    setDropdownOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className={`w-full ${compact ? "max-w-2xl" : "max-w-3xl"} mx-auto`}>
      <div
        className={`relative flex items-center bg-bg-card border rounded-xl transition-all duration-200 ${
          isFocused
            ? "border-neon-green shadow-neon"
            : hasError
            ? "border-neon-red"
            : "border-bg-border"
        }`}
      >
        {/* Left: search icon + auto-detected chain badge */}
        <div className="pl-4 pr-2 flex items-center gap-2 shrink-0">
          {isLoading ? (
            <Loader2 size={18} className="text-neon-green animate-spin" />
          ) : (
            <Search
              size={18}
              className={isValid ? "text-neon-green" : "text-text-muted"}
            />
          )}
          {value && isValid && chainConfig && selectedNetwork === "auto" && (
            <span
              className={`text-xs font-mono ${chainConfig.color} font-semibold hidden sm:block`}
            >
              {CHAIN_CONFIG[effectiveChain as Exclude<Chain,"unknown">]?.icon}{" "}
              {CHAIN_CONFIG[effectiveChain as Exclude<Chain,"unknown">]?.label}
            </span>
          )}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={`flex-1 bg-transparent pr-2 text-sm font-mono text-text-primary placeholder-text-muted outline-none ${
            compact ? "py-3" : "py-4"
          }`}
          spellCheck={false}
          autoComplete="off"
          disabled={isLoading}
        />

        {/* Right: Network dropdown */}
        <div className="relative shrink-0 mx-1" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-all duration-150 ${
              dropdownOpen
                ? "bg-bg-secondary border-neon-green text-neon-green"
                : "bg-bg-secondary border-bg-border text-text-secondary hover:border-neon-green hover:text-text-primary"
            }`}
          >
            <span className={activeNetwork.color}>{activeNetwork.icon}</span>
            <span className="hidden sm:inline">{activeNetwork.label}</span>
            <ChevronDown
              size={12}
              className={`transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-bg-card border border-bg-border rounded-xl shadow-xl z-50 overflow-hidden">
              <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider px-3 pt-3 pb-1">
                Select network
              </p>
              {NETWORKS.map((net) => (
                <button
                  key={net.chain}
                  type="button"
                  onClick={() => handleNetworkSelect(net.chain)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-bg-secondary transition-colors ${
                    selectedNetwork === net.chain ? "bg-bg-secondary" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`text-base ${net.color}`}>{net.icon}</span>
                    <span
                      className={
                        selectedNetwork === net.chain
                          ? "text-text-primary font-semibold"
                          : "text-text-secondary"
                      }
                    >
                      {net.label}
                    </span>
                  </div>
                  {selectedNetwork === net.chain && (
                    <Check size={13} className="text-neon-green" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Analyze button */}
        <button
          onClick={() => handleSubmit()}
          disabled={!isValid || isLoading}
          className={`mr-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
            isValid && !isLoading
              ? "bg-neon-green text-bg-primary hover:bg-opacity-90 cursor-pointer"
              : "bg-bg-border text-text-muted cursor-not-allowed"
          }`}
        >
          {isLoading ? "Loading..." : "Analyze"}
        </button>
      </div>

      {/* Error message */}
      {hasError && (
        <p className="mt-2 text-xs text-neon-red flex items-center gap-1.5">
          <AlertCircle size={12} />
          Invalid address format. Enter a valid ETH (0x...), Solana, TRON (T...), or Bitcoin address.
        </p>
      )}

      {/* Example addresses */}
      {!compact && !value && (
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          <span className="text-xs text-text-muted">Try:</span>
          {EXAMPLE_ADDRESSES.map((ex) => {
            const info =
              ex.chain !== "unknown"
                ? CHAIN_CONFIG[ex.chain as Exclude<Chain, "unknown">]
                : null;
            return (
              <button
                key={ex.address}
                onClick={() => {
                  setValue(ex.address);
                  handleSubmit(ex.address, ex.chain);
                }}
                className="text-xs px-3 py-1.5 bg-bg-card border border-bg-border rounded-lg hover:border-neon-green transition-colors text-text-secondary"
              >
                {info && (
                  <span className={info.color}>{info.icon}</span>
                )}{" "}
                {ex.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
