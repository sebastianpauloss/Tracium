import { NextRequest, NextResponse } from "next/server";
import { detectChain } from "@/lib/utils";
import { cache } from "@/lib/cache";
import { getEthereumWalletInfo, getEthereumTransactions } from "@/lib/blockchain/ethereum";
import { getPolygonWalletInfo, getPolygonTransactions } from "@/lib/blockchain/polygon";
import { getSolanaWalletInfo, getSolanaTransactions } from "@/lib/blockchain/solana";
import { getTronWalletInfo, getTronTransactions } from "@/lib/blockchain/tron";
import { getBitcoinWalletInfo, getBitcoinTransactions } from "@/lib/blockchain/bitcoin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  if (!address) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 });
  }

  const chainHint = request.nextUrl.searchParams.get("chain") || undefined;
  const chain = detectChain(address, chainHint);

  if (chain === "unknown") {
    return NextResponse.json(
      { error: "Unknown address format. Supported: Ethereum/Polygon (0x...), Solana, TRON (T...), Bitcoin" },
      { status: 400 }
    );
  }

  // Parse limit param, clamp to 10,000 max
  const rawLimit = parseInt(request.nextUrl.searchParams.get("limit") || "50", 10);
  const limit = Math.min(Math.max(rawLimit, 1), 10_000);

  const cacheKey = `wallet:${chain}:${address}:${limit}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
  }

  try {
    let walletInfo, transactions;

    switch (chain) {
      case "ethereum":
        [walletInfo, transactions] = await Promise.all([
          getEthereumWalletInfo(address),
          getEthereumTransactions(address, limit),
        ]);
        break;
      case "polygon":
        [walletInfo, transactions] = await Promise.all([
          getPolygonWalletInfo(address),
          getPolygonTransactions(address, limit),
        ]);
        break;
      case "solana":
        [walletInfo, transactions] = await Promise.all([
          getSolanaWalletInfo(address),
          getSolanaTransactions(address),
        ]);
        break;
      case "tron":
        [walletInfo, transactions] = await Promise.all([
          getTronWalletInfo(address),
          getTronTransactions(address, limit),
        ]);
        break;
      case "bitcoin":
        [walletInfo, transactions] = await Promise.all([
          getBitcoinWalletInfo(address),
          getBitcoinTransactions(address, limit),
        ]);
        break;
      default:
        return NextResponse.json({ error: "Unsupported chain" }, { status: 400 });
    }

    const result = { wallet: walletInfo, transactions };
    cache.set(cacheKey, result, 300);

    return NextResponse.json(result, { headers: { "X-Cache": "MISS" } });
  } catch (error) {
    console.error("Wallet fetch error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch wallet data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
