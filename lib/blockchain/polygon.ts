import { WalletInfo, Transaction, GraphData, GraphNode, GraphEdge } from "../types";
import { cache } from "../cache";
import { getLabel } from "../labels";
import { calculateRiskScore, formatValue, getWalletType } from "../utils";

const BLOCKSCOUT_POLYGON = "https://polygon.blockscout.com/api/v2";
const MATIC_PRICE_USD = 0.5;

export async function getPolygonWalletInfo(address: string): Promise<WalletInfo> {
  const cacheKey = `polygon:info:${address}`;
  const cached = cache.get<WalletInfo>(cacheKey);
  if (cached) return cached;

  try {
    const [addrRes, txRes] = await Promise.all([
      fetch(`${BLOCKSCOUT_POLYGON}/addresses/${address}`),
      fetch(`${BLOCKSCOUT_POLYGON}/addresses/${address}/transactions`),
    ]);

    const addrData = addrRes.ok ? await addrRes.json() : {};
    const txData = txRes.ok ? await txRes.json() : {};

    const balanceRaw = addrData.coin_balance ?? "0";
    const balanceMATIC = formatValue(balanceRaw, 18);
    const balanceUSD = balanceMATIC * MATIC_PRICE_USD;
    const txCount = addrData.transaction_count ?? txData.next_page_params?.block_number ?? 0;

    const label = getLabel(address);
    const type = label?.type ?? getWalletType(address);
    const { score, flags } = calculateRiskScore(address, [], txCount, 0);

    const info: WalletInfo = {
      address,
      chain: "polygon",
      balance: `${balanceMATIC.toFixed(4)} MATIC`,
      balanceUSD: `$${balanceUSD.toLocaleString("en-US", { maximumFractionDigits: 2 })}`,
      txCount: Number(txCount),
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
      chain: "polygon",
      balance: "0 MATIC",
      balanceUSD: "$0",
      txCount: 0,
      type: "unknown",
      riskScore: 0,
      riskFlags: [],
    };
  }
}

export async function getPolygonTransactions(
  address: string,
  limit = 50
): Promise<Transaction[]> {
  const cacheKey = `polygon:txs:${address}`;
  const cached = cache.get<Transaction[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(
      `${BLOCKSCOUT_POLYGON}/addresses/${address}/transactions`
    );
    if (!res.ok) return [];
    const data = await res.json();
    const items = data.items ?? [];

    const txs: Transaction[] = items.map((tx: Record<string, unknown>) => {
      const from = (tx.from as Record<string, string>)?.hash ?? "";
      const to = (tx.to as Record<string, string>)?.hash ?? "";
      const direction =
        from.toLowerCase() === address.toLowerCase()
          ? "out"
          : to.toLowerCase() === address.toLowerCase()
          ? "in"
          : "self";

      const valueRaw = (tx.value as string) ?? "0";
      const valueMATIC = formatValue(valueRaw, 18);

      return {
        hash: (tx.hash as string) ?? "",
        from,
        to,
        value: `${valueMATIC.toFixed(4)} MATIC`,
        valueUSD: `$${(valueMATIC * MATIC_PRICE_USD).toFixed(2)}`,
        token: "MATIC",
        timestamp: (tx.timestamp as string) ?? new Date().toISOString(),
        blockNumber: Number(tx.block ?? 0),
        direction,
        status: (tx.status as string) === "ok" ? "success" : "failed",
        chain: "polygon" as const,
        fromLabel: getLabel(from)?.name,
        toLabel: getLabel(to)?.name,
      };
    });

    cache.set(cacheKey, txs);
    return txs;
  } catch {
    return [];
  }
}

export async function getPolygonGraph(address: string): Promise<GraphData> {
  const cacheKey = `polygon:graph:${address}`;
  const cached = cache.get<GraphData>(cacheKey);
  if (cached) return cached;

  try {
    const [txs, walletInfo] = await Promise.all([
      getPolygonTransactions(address, 50),
      getPolygonWalletInfo(address),
    ]);

    const nodes: GraphNode[] = [
      {
        id: address,
        label: getLabel(address)?.name ?? `${address.slice(0, 6)}...`,
        type: walletInfo.type,
        chain: "polygon",
        txCount: walletInfo.txCount,
        volume: 0,
        isCenter: true,
        riskScore: walletInfo.riskScore,
      },
    ];

    const links: GraphEdge[] = [];
    const volumeMap = new Map<string, number>();
    const txCountMap = new Map<string, number>();
    const directionMap = new Map<string, "in" | "out" | "both">();

    for (const tx of txs) {
      const counterpart =
        tx.from.toLowerCase() === address.toLowerCase() ? tx.to : tx.from;
      if (!counterpart || counterpart === address) continue;

      const prevVolume = volumeMap.get(counterpart) ?? 0;
      volumeMap.set(counterpart, prevVolume + parseFloat(tx.value) || 0);
      txCountMap.set(counterpart, (txCountMap.get(counterpart) ?? 0) + 1);

      const prevDir = directionMap.get(counterpart);
      if (!prevDir) {
        directionMap.set(counterpart, tx.direction as "in" | "out");
      } else if (prevDir !== tx.direction) {
        directionMap.set(counterpart, "both");
      }
    }

    const seenAddresses = [...volumeMap.keys()].slice(0, 20);

    for (const addr of seenAddresses) {
      const cpLabel = getLabel(addr);
      nodes.push({
        id: addr,
        label: cpLabel?.name ?? `${addr.slice(0, 6)}...`,
        type: cpLabel?.type ?? "user",
        chain: "polygon",
        txCount: txCountMap.get(addr) ?? 1,
        volume: volumeMap.get(addr) ?? 0,
        riskScore: cpLabel?.risk ? 80 : 0,
      });

      links.push({
        source: address,
        target: addr,
        volume: volumeMap.get(addr) ?? 0,
        txCount: txCountMap.get(addr) ?? 1,
        direction: directionMap.get(addr) ?? "both",
      });
    }

    const graph: GraphData = { nodes, links };
    cache.set(cacheKey, graph);
    return graph;
  } catch {
    return { nodes: [], links: [] };
  }
}
