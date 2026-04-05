import { Chain, WalletType } from "./types";
import { getLabel } from "./labels";

export function detectChain(address: string, hint?: string): Chain {
  if (!address) return "unknown";

  // Ethereum / EVM: 0x + 40 hex chars — use hint to disambiguate EVM chains
  if (/^0x[0-9a-fA-F]{40}$/.test(address)) {
    if (hint === "polygon") return "polygon";
    return "ethereum";
  }

  // Solana: base58, 32-44 chars (does not start with 0x, T, 1, 3, or bc1)
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address) && !address.startsWith("T")) return "solana";

  // TRON: starts with T, base58, 34 chars
  if (/^T[A-Za-z0-9]{33}$/.test(address)) return "tron";

  // Bitcoin legacy (P2PKH)
  if (/^1[A-HJ-NP-Za-km-z1-9]{25,34}$/.test(address)) return "bitcoin";

  // Bitcoin P2SH
  if (/^3[A-HJ-NP-Za-km-z1-9]{25,34}$/.test(address)) return "bitcoin";

  // Bitcoin Bech32 (SegWit)
  if (/^bc1[a-z0-9]{25,90}$/.test(address)) return "bitcoin";

  return "unknown";
}

export function getWalletType(address: string): WalletType {
  const label = getLabel(address);
  if (label) return label.type;
  return "user";
}

export function formatAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatValue(value: string, decimals = 18): number {
  try {
    const bn = BigInt(value);
    const divisor = BigInt(10 ** decimals);
    const whole = bn / divisor;
    const fraction = bn % divisor;
    return Number(whole) + Number(fraction) / 10 ** decimals;
  } catch {
    return 0;
  }
}

export function formatNumber(n: number, decimals = 4): string {
  if (n === 0) return "0";
  if (n < 0.0001) return "< 0.0001";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(decimals);
}

export function calculateRiskScore(
  address: string,
  relatedAddresses: string[],
  txCount: number,
  uniqueCounterparts: number
): { score: number; flags: string[] } {
  let score = 0;
  const flags: string[] = [];

  // Check if address itself is known risky
  const selfLabel = getLabel(address);
  if (selfLabel?.risk) {
    score += 80;
    flags.push(`Address is blacklisted: ${selfLabel.name}`);
  }

  // Check related addresses for risk
  let riskContacts = 0;
  for (const addr of relatedAddresses) {
    const label = getLabel(addr);
    if (label?.risk) {
      riskContacts++;
      score += 25;
      flags.push(`Interacted with ${label.name}`);
    }
  }

  // High tx count with many unique wallets (mixer-like behavior)
  if (txCount > 100 && uniqueCounterparts > 50) {
    score += 20;
    flags.push("High-frequency interactions with many unique wallets");
  }

  // Very high tx count
  if (txCount > 1000) {
    score += 10;
    flags.push("Extremely high transaction count");
  }

  // Clamp score to 0-100
  score = Math.min(100, Math.max(0, score));

  // Deduplicate flags
  const uniqueFlags = [...new Set(flags)].slice(0, 5);

  return { score, flags: uniqueFlags };
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
