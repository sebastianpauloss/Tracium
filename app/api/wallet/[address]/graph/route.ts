import { NextRequest, NextResponse } from "next/server";
import { detectChain } from "@/lib/utils";
import { cache } from "@/lib/cache";
import { getEthereumGraph } from "@/lib/blockchain/ethereum";
import { getPolygonGraph } from "@/lib/blockchain/polygon";
import { getSolanaGraph } from "@/lib/blockchain/solana";
import { getTronGraph } from "@/lib/blockchain/tron";
import { getBitcoinGraph } from "@/lib/blockchain/bitcoin";

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
    return NextResponse.json({ error: "Unknown address format" }, { status: 400 });
  }

  const cacheKey = `graph:${chain}:${address}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });
  }

  try {
    let graphData;

    switch (chain) {
      case "ethereum":
        graphData = await getEthereumGraph(address);
        break;
      case "polygon":
        graphData = await getPolygonGraph(address);
        break;
      case "solana":
        graphData = await getSolanaGraph(address);
        break;
      case "tron":
        graphData = await getTronGraph(address);
        break;
      case "bitcoin":
        graphData = await getBitcoinGraph(address);
        break;
      default:
        return NextResponse.json({ error: "Unsupported chain" }, { status: 400 });
    }

    cache.set(cacheKey, graphData, 300);
    return NextResponse.json(graphData, { headers: { "X-Cache": "MISS" } });
  } catch (error) {
    console.error("Graph fetch error:", error);
    const message = error instanceof Error ? error.message : "Failed to build graph";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
