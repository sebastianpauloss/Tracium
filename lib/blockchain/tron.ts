import { Transaction, WalletInfo, GraphData, GraphNode, GraphEdge } from "../types";
import { getLabel, getDisplayName } from "../labels";
import { getWalletType, calculateRiskScore } from "../utils";

const TRONGRID_BASE = "https://api.trongrid.io";
const TRX_PRICE_USD = 0.13; // Approximate

async function fetchTron(path: string): Promise<unknown> {
  const res = await fetch(`${TRONGRID_BASE}${path}`, {
    headers: { Accept: "application/json", "TRON-PRO-API-KEY": "" },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`TronGrid error: ${res.status}`);
  return res.json();
}

export async function getTronWalletInfo(address: string): Promise<WalletInfo> {
  const data = await fetchTron(`/v1/accounts/${address}`) as Record<string, unknown>;
  const accounts = (data.data as Record<string, unknown>[]) || [];
  const account = accounts[0] || {};

  const balanceSun = (account.balance as number) || 0;
  const balanceTRX = balanceSun / 1_000_000;
  const balanceUSD = (balanceTRX * TRX_PRICE_USD).toFixed(2);

  const txData = await fetchTron(`/v1/accounts/${address}/transactions?limit=50`).catch(() => ({ data: [] })) as Record<string, unknown>;
  const txList = (txData.data as Record<string, unknown>[]) || [];

  const relatedAddresses: string[] = [];
  for (const tx of txList) {
    const rawData = (tx.raw_data as Record<string, unknown>)?.contract as Record<string, unknown>[];
    if (rawData?.[0]) {
      const param = rawData[0].parameter as Record<string, unknown>;
      const value = param?.value as Record<string, string>;
      if (value?.owner_address) relatedAddresses.push(value.owner_address);
      if (value?.to_address) relatedAddresses.push(value.to_address);
    }
  }

  const uniqueCounterparts = new Set(relatedAddresses).size;
  const { score, flags } = calculateRiskScore(address, relatedAddresses, txList.length, uniqueCounterparts);

  const knownLabel = getLabel(address);

  return {
    address,
    chain: "tron",
    balance: `${balanceTRX.toFixed(4)} TRX`,
    balanceUSD: `$${Number(balanceUSD).toLocaleString()}`,
    txCount: txList.length,
    type: knownLabel?.type || getWalletType(address),
    label: knownLabel?.name,
    riskScore: score,
    riskFlags: flags,
  };
}

export async function getTronTransactions(address: string, limit = 50): Promise<Transaction[]> {
  const trc20Data = await fetchTron(
    `/v1/accounts/${address}/transactions/trc20?limit=${limit}&only_confirmed=true`
  ).catch(() => ({ data: [] })) as Record<string, unknown>;

  const items = (trc20Data.data as Record<string, unknown>[]) || [];

  return items.map((tx) => {
    const from = (tx.from as string) || "";
    const to = (tx.to as string) || "";
    const value = Number((tx.value as string) || "0");
    const token = (tx.token_info as Record<string, string>)?.symbol || "TRC20";
    const decimals = (tx.token_info as Record<string, number>)?.decimals || 6;
    const actualValue = value / 10 ** decimals;
    const timestamp = new Date(Number(tx.block_timestamp as number)).toISOString();

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
      blockNumber: 0,
      direction,
      status: "success",
      chain: "tron",
      fromLabel: getDisplayName(from),
      toLabel: getDisplayName(to),
    };
  });
}

export async function getTronGraph(address: string): Promise<GraphData> {
  const trc20Data = await fetchTron(
    `/v1/accounts/${address}/transactions/trc20?limit=100&only_confirmed=true`
  ).catch(() => ({ data: [] })) as Record<string, unknown>;

  const items = (trc20Data.data as Record<string, unknown>[]) || [];

  const edgeMap = new Map<string, { volume: number; txCount: number; directions: Set<string> }>();
  const counterparts = new Set<string>();

  for (const tx of items) {
    const from = (tx.from as string) || "";
    const to = (tx.to as string) || "";
    const value = Number((tx.value as string) || "0") / 1_000_000;

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
