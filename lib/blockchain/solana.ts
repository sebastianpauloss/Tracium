import { WalletInfo, Transaction, GraphData, GraphNode, GraphEdge } from "../types";
import { cache } from "../cache";
import { getLabel } from "../labels";
import { calculateRiskScore, getWalletType } from "../utils";

const SOLANA_RPC = "https://api.mainnet-beta.solana.com";
const SOL_PRICE_USD = 150; // approximate

async function rpcCall(method: string, params: unknown[]) {
  const res = await fetch(SOLANA_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const data = await res.json();
  return data.result;
}

export async function getSolanaWalletInfo(address: string): Promise<WalletInfo> {
  const cacheKey = `solana:info:${address}`;
  const cached = cache.get<WalletInfo>(cacheKey);
  if (cached) return cached;

  try {
    // Get SOL balance
    const balance = await rpcCall("getBalance", [address, { commitment: "confirmed" }]);
    const solBalance = (balance?.value ?? 0) / 1e9;

    // Get transaction count via signatures
    const signatures = await rpcCall("getSignaturesForAddress", [
      address,
      { limit: 1000, commitment: "confirmed" },
    ]);
    const txCount = signatures?.length ?? 0;

    const label = getLabel(address);
    const type = label?.type ?? getWalletType(address);

    // Use address interactions for risk scoring
    const { score, flags } = calculateRiskScore(address, [], txCount, 0);

    const info: WalletInfo = {
      address,
      chain: "solana",
      balance: `${solBalance.toFixed(4)} SOL`,
      balanceUSD: `$${(solBalance * SOL_PRICE_USD).toLocaleString("en-US", { maximumFractionDigits: 2 })}`,
      txCount,
      type,
      label: label?.name,
      riskScore: score,
      riskFlags: flags,
    };

    cache.set(cacheKey, info);
    return info;
  } catch {
    return {
      address,
      chain: "solana",
      balance: "0 SOL",
      balanceUSD: "$0",
      txCount: 0,
      type: "unknown",
      riskScore: 0,
      riskFlags: [],
    };
  }
}

export async function getSolanaTransactions(address: string): Promise<Transaction[]> {
  const cacheKey = `solana:txs:${address}`;
  const cached = cache.get<Transaction[]>(cacheKey);
  if (cached) return cached;

  try {
    const signatures = await rpcCall("getSignaturesForAddress", [
      address,
      { limit: 50, commitment: "confirmed" },
    ]);

    if (!signatures || signatures.length === 0) return [];

    const txs: Transaction[] = signatures
      .filter((sig: { err: unknown }) => !sig.err)
      .map((sig: { signature: string; blockTime: number }) => {
        const ts = sig.blockTime
          ? new Date(sig.blockTime * 1000).toISOString()
          : new Date().toISOString();

        return {
          hash: sig.signature,
          from: address,
          to: "",
          value: "-",
          valueUSD: "-",
          token: "SOL",
          timestamp: ts,
          blockNumber: 0,
          direction: "out" as const,
          status: "success" as const,
          chain: "solana" as const,
          fromLabel: getLabel(address)?.name,
        };
      });

    cache.set(cacheKey, txs);
    return txs;
  } catch {
    return [];
  }
}

export async function getSolanaGraph(address: string): Promise<GraphData> {
  const cacheKey = `solana:graph:${address}`;
  const cached = cache.get<GraphData>(cacheKey);
  if (cached) return cached;

  try {
    const txs = await getSolanaTransactions(address);
    const walletInfo = await getSolanaWalletInfo(address);

    const nodes: GraphNode[] = [
      {
        id: address,
        label: getLabel(address)?.name ?? `${address.slice(0, 6)}...`,
        type: walletInfo.type,
        chain: "solana",
        txCount: walletInfo.txCount,
        volume: 0,
        isCenter: true,
        riskScore: walletInfo.riskScore,
      },
    ];

    const links: GraphEdge[] = [];
    const seenAddresses = new Set<string>();

    for (const tx of txs.slice(0, 20)) {
      const counterpart = tx.from === address ? tx.to : tx.from;
      if (!counterpart || counterpart === address || seenAddresses.has(counterpart)) continue;
      seenAddresses.add(counterpart);

      const cpLabel = getLabel(counterpart);
      nodes.push({
        id: counterpart,
        label: cpLabel?.name ?? `${counterpart.slice(0, 6)}...`,
        type: cpLabel?.type ?? "user",
        chain: "solana",
        txCount: 1,
        volume: 0,
        riskScore: cpLabel?.risk ? 80 : 0,
      });

      links.push({
        source: address,
        target: counterpart,
        volume: 0,
        txCount: 1,
        direction: tx.direction === "in" ? "in" : "out",
      });
    }

    const graph: GraphData = { nodes, links };
    cache.set(cacheKey, graph);
    return graph;
  } catch {
    return { nodes: [], links: [] };
  }
}
