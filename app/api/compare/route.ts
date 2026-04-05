import { NextRequest, NextResponse } from "next/server";
import { detectChain } from "@/lib/utils";
import { getLabel } from "@/lib/labels";
import { cache } from "@/lib/cache";
import { getEthereumTransactions } from "@/lib/blockchain/ethereum";
import { getPolygonTransactions } from "@/lib/blockchain/polygon";
import { getSolanaTransactions } from "@/lib/blockchain/solana";
import { getTronTransactions } from "@/lib/blockchain/tron";
import { getBitcoinTransactions } from "@/lib/blockchain/bitcoin";
import { Transaction } from "@/lib/types";

function applyTimeFilter(txs: Transaction[], filter: string): Transaction[] {
  if (filter === "all") return txs;
  const now = Date.now();
  const ms: Record<string, number> = {
    "24h": 24 * 60 * 60 * 1000,
    "7d":  7  * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };
  const cutoff = ms[filter];
  if (!cutoff) return txs;
  return txs.filter((tx) => {
    try {
      return now - new Date(tx.timestamp).getTime() <= cutoff;
    } catch {
      return true;
    }
  });
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const walletA = sp.get("walletA")?.trim() ?? "";
  const walletB = sp.get("walletB")?.trim() ?? "";
  const chainHint = sp.get("chain") || undefined;
  const rawLimit = parseInt(sp.get("limit") || "100", 10);
  const limit = Math.min(Math.max(rawLimit, 1), 10_000);
  const timeFilter = sp.get("timeFilter") || "all";

  if (!walletA || !walletB) {
    return NextResponse.json({ error: "Both walletA and walletB are required" }, { status: 400 });
  }
  if (walletA.toLowerCase() === walletB.toLowerCase()) {
    return NextResponse.json({ error: "Wallets must be different" }, { status: 400 });
  }

  const chain = detectChain(walletA, chainHint);
  if (chain === "unknown") {
    return NextResponse.json({ error: "Cannot detect chain for Wallet A. Please specify a network." }, { status: 400 });
  }

  const cacheKey = `compare:${chain}:${walletA}:${walletB}:${limit}:${timeFilter}`;
  const cached = cache.get(cacheKey);
  if (cached) return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });

  try {
    // Fetch a broad set of transactions for both wallets in parallel
    let txsA: Transaction[] = [];
    let txsB: Transaction[] = [];

    const fetchFn = async (addr: string): Promise<Transaction[]> => {
      switch (chain) {
        case "ethereum": return getEthereumTransactions(addr, limit);
        case "polygon":  return getPolygonTransactions(addr, limit);
        case "solana":   return getSolanaTransactions(addr);
        case "tron":     return getTronTransactions(addr, limit);
        case "bitcoin":  return getBitcoinTransactions(addr, limit);
        default:         return [];
      }
    };

    [txsA, txsB] = await Promise.all([fetchFn(walletA), fetchFn(walletB)]);

    const addrALower = walletA.toLowerCase();
    const addrBLower = walletB.toLowerCase();

    // Filter txsA: only those involving walletB
    const fromA = txsA.filter((tx) => {
      const f = tx.from.toLowerCase();
      const t = tx.to.toLowerCase();
      return (f === addrALower && t === addrBLower) || (f === addrBLower && t === addrALower);
    });

    // Filter txsB: only those involving walletA (not already in fromA)
    const hashesFromA = new Set(fromA.map((t) => t.hash.toLowerCase()));
    const fromB = txsB.filter((tx) => {
      const f = tx.from.toLowerCase();
      const t = tx.to.toLowerCase();
      return (
        ((f === addrBLower && t === addrALower) || (f === addrALower && t === addrBLower)) &&
        !hashesFromA.has(tx.hash.toLowerCase())
      );
    });

    let combined = [...fromA, ...fromB];

    // De-duplicate by hash
    const seen = new Set<string>();
    combined = combined.filter((tx) => {
      const key = tx.hash.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Apply time filter
    combined = applyTimeFilter(combined, timeFilter);

    // Limit results
    combined = combined.slice(0, limit);

    // Compute stats
    let totalA2B = 0, totalB2A = 0, volumeA2B = 0, volumeB2A = 0;
    for (const tx of combined) {
      const isA2B = tx.from.toLowerCase() === addrALower;
      if (isA2B) {
        totalA2B++;
        const v = parseFloat(tx.value.split(" ")[0]) || 0;
        volumeA2B += v;
      } else {
        totalB2A++;
        const v = parseFloat(tx.value.split(" ")[0]) || 0;
        volumeB2A += v;
      }
    }

    const walletALabel = getLabel(walletA)?.name;
    const walletBLabel = getLabel(walletB)?.name;

    const result = {
      transactions: combined,
      totalA2B,
      totalB2A,
      volumeA2B,
      volumeB2A,
      walletALabel,
      walletBLabel,
      chain,
    };

    cache.set(cacheKey, result, 180); // 3 min cache
    return NextResponse.json(result, { headers: { "X-Cache": "MISS" } });
  } catch (err) {
    console.error("Compare error:", err);
    const message = err instanceof Error ? err.message : "Failed to compare wallets";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
