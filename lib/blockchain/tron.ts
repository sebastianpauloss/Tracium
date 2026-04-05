import { Transaction, WalletInfo, GraphData, GraphNode, GraphEdge } from "../types";
import { getLabel, getDisplayName } from "../labels";
import { getWalletType, calculateRiskScore } from "../utils";

const TRONSCAN_BASE = "https://api.tronscan.org/api";
const TRX_PRICE_USD = 0.13; // Approximate

async function fetchTronScan(path: string): Promise<unknown> {
  const res = await fetch(`${TRONSCAN_BASE}${path}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`TronScan error: ${res.status}`);
  return res.json();
}

export async function getTronWalletInfo(address: string): Promise<WalletInfo> {
  const data = await fetchTronScan(`/account?address=${address}`) as Record<string, unknown>;

  const balanceSun = (data.balance as number) || 0;
  const balanceTRX = balanceSun / 1_000_000;
  const balanceUSD = (balanceTRX * TRX_PRICE_USD).toFixed(2);
  const txCount = (data.totalTransactionCount as number) || 0;

  const trc20Data = await fetchTronScan(
    `/token_trc20/transfers?relatedAddress=${address}&limit=50`
  ).catch(() => ({ token_transfers: [] })) as Record<string, unknown>;

  const txList = (trc20Data.token_transfers as Record<string, unknown>[]) || [];

  const relatedAddresses: string[] = [];
  for (const tx of txList) {
    const from = tx.from_address as string;
    const to = tx.to_address as string;
    if (from && from.toLowerCase() !== address.toLowerCase()) relatedAddresses.push(from);
    if (to && to.toLowerCase() !== address.toLowerCase()) relatedAddresses.push(to);
  }

  const uniqueCounterparts = new Set(relatedAddresses).size;
  const { score, flags } = calculateRiskScore(address, relatedAddresses, txCount, uniqueCounterparts);

  const knownLabel = getLabel(address);

  return {
    address,
    chain: "tron",
    balance: `${balanceTRX.toFixed(4)} TRX`,
    balanceUSD: `$${Number(balanceUSD).toLocaleString()}`,
    txCount,
    type: knownLabel?.type || getWalletType(address),
    label: knownLabel?.name,
    riskScore: score,
    riskFlags: flags,
  };
}

export async function getTronTransactions(address: string, limit = 50): Promise<Transaction[]> {
  const trc20Data = await fetchTronScan(
    `/token_trc20/transfers?relatedAddress=${address}&limit=${limit}`
  ).catch(() => ({ token_transfers: [] })) as Record<string, unknown>;

  const items = (trc20Data.token_transfers as Record<string, unknown>[]) || [];

  return items.map((tx) => {
    const from = (tx.from_address as string) || "";
    const to = (tx.to_address as string) || "";
    const quant = Number((tx.quant as string) || "0");
    const tokenInfo = (tx.tokenInfo as Record<string, unknown>) || {};
    const token = (tokenInfo.tokenAbbr as string) || "TRC20";
    const decimals = (tokenInfo.tokenDecimal as number) || 6;
    const actualValue = quant / 10 ** decimals;
    const timestamp = new Date(Number(tx.block_ts as number)).toISOString();
    const success = (tx.finalResult as string) === "SUCCESS" && !(tx.revert as boolean);

    const direction =
      from.toLowerCase() === address.toLowerCase() ? "out" : "in";

    return {
      hash: (tx.transaction_id as string) || "",
      from,
      to,
      value: `${actualValue.toFixed(4)} ${token}`,
      valueUSD: token === "USDT" || token === "USDC" ? `$${actualValue.toFixed(2)}` : "-",
      token,
      timestamp,
      blockNumber: (tx.block as number) || 0,
      direction,
      status: success ? "success" : "failed",
      chain: "tron",
      fromLabel: getDisplayName(from),
      toLabel: getDisplayName(to),
    };
  });
}

export async function getTronGraph(address: string): Promise<GraphData> {
  const trc20Data = await fetchTronScan(
    `/token_trc20/transfers?relatedAddress=${address}&limit=100`
  ).catch(() => ({ token_transfers: [] })) as Record<string, unknown>;

  const items = (trc20Data.token_transfers as Record<string, unknown>[]) || [];

  const edgeMap = new Map<string, { volume: number; txCount: number; directions: Set<string> }>();
  const counterparts = new Set<string>();

  for (const tx of items) {
    const from = (tx.from_address as string) || "";
    const to = (tx.to_address as string) || "";
    const quant = Number((tx.quant as string) || "0");
    const decimals = ((tx.tokenInfo as Record<string, unknown>)?.tokenDecimal as number) || 6;
    const value = quant / 10 ** decimals;

    if (!from || !to) continue;
    const counterpart = from.toLowerCase() === address.toLowerCase() ? to : from;
    const direction = from.toLowerCase() === address.toLowerCase() ? "out" : "in";
    counterparts.add(counterpart);

    const edgeKey = [address, counterpart].sort().join("-");
    const existing = edgeMap.get(edgeKey) || { volume: 0, txCount: 0, directions: new Set() };
    existing.volume += value;
    existing.txCount++;
    existing.directions.add(direction);
    edgeMap.set(edgeKey, existing);
  }

  const nodes: GraphNode[] = [
    {
      id: address,
      label: getDisplayName(address),
      type: getWalletType(address),
      chain: "tron",
      txCount: items.length,
      volume: 0,
      isCenter: true,
    },
  ];

  for (const counterpart of counterparts) {
    const knownLabel = getLabel(counterpart);
    nodes.push({
      id: counterpart,
      label: getDisplayName(counterpart),
      type: knownLabel?.type || getWalletType(counterpart),
      chain: "tron",
      txCount: 0,
      volume: 0,
      riskScore: knownLabel?.risk ? 80 : 0,
    });
  }

  const links: GraphEdge[] = [];
  for (const [key, edge] of edgeMap) {
    const [src, tgt] = key.split("-");
    const direction = edge.directions.has("out") && edge.directions.has("in") ? "both" :
                      edge.directions.has("out") ? "out" : "in";
    links.push({
      source: src,
      target: tgt,
      volume: edge.volume,
      txCount: edge.txCount,
      direction: direction as "in" | "out" | "both",
    });
  }

  return { nodes, links };
}
