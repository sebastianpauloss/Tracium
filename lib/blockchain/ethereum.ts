import { Transaction, WalletInfo, GraphData, GraphNode, GraphEdge } from "../types";
import { getLabel, getDisplayName } from "../labels";
import { formatValue, getWalletType, calculateRiskScore } from "../utils";

const BLOCKSCOUT_BASE = "https://eth.blockscout.com/api/v2";
const ETH_PRICE_USD = 3500; // Approximate, could be fetched dynamically

async function fetchBlockscout(path: string): Promise<unknown> {
  const res = await fetch(`${BLOCKSCOUT_BASE}${path}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`Blockscout error: ${res.status}`);
  return res.json();
}

export async function getEthereumWalletInfo(address: string): Promise<WalletInfo> {
  const [addressData, txData] = await Promise.allSettled([
    fetchBlockscout(`/addresses/${address}`),
    fetchBlockscout(`/addresses/${address}/transactions`),
  ]);

  let balance = "0";
  let txCount = 0;
  let isContract = false;

  if (addressData.status === "fulfilled") {
    const d = addressData.value as Record<string, unknown>;
    const coin_balance = d.coin_balance as string | null;
    balance = coin_balance || "0";
    txCount = (d.transaction_count as number) || 0;
    isContract = !!(d.is_contract as boolean);
  }

  // Get related addresses for risk scoring
  const relatedAddresses: string[] = [];
  let txList: Record<string, unknown>[] = [];
  if (txData.status === "fulfilled") {
    const d = txData.value as Record<string, unknown>;
    txList = (d.items as Record<string, unknown>[]) || [];
    for (const tx of txList) {
      const from = (tx.from as Record<string, string>)?.hash;
      const to = (tx.to as Record<string, string> | null)?.hash;
      if (from && from.toLowerCase() !== address.toLowerCase()) relatedAddresses.push(from);
      if (to && to.toLowerCase() !== address.toLowerCase()) relatedAddresses.push(to);
    }
  }

  const uniqueCounterparts = new Set(relatedAddresses).size;
  const { score, flags } = calculateRiskScore(address, relatedAddresses, txCount, uniqueCounterparts);

  const balanceEth = formatValue(balance, 18);
  const balanceUSD = (balanceEth * ETH_PRICE_USD).toFixed(2);

  const knownLabel = getLabel(address);
  const walletType = isContract ? "contract" : (knownLabel?.type || getWalletType(address));

  return {
    address,
    chain: "ethereum",
    balance: `${balanceEth.toFixed(4)} ETH`,
    balanceUSD: `$${Number(balanceUSD).toLocaleString()}`,
    txCount,
    type: walletType,
    label: knownLabel?.name,
    riskScore: score,
    riskFlags: flags,
  };
}

export async function getEthereumTransactions(address: string, limit = 50): Promise<Transaction[]> {
  const data = await fetchBlockscout(
    `/addresses/${address}/transactions`
  ) as Record<string, unknown>;

  const items = (data.items as Record<string, unknown>[]) || [];
  const addrLower = address.toLowerCase();

  return items.map((tx) => {
    const from = (tx.from as Record<string, string>)?.hash || "";
    const to = (tx.to as Record<string, string> | null)?.hash || "";
    const value = (tx.value as string) || "0";
    const timestamp = (tx.timestamp as string) || "";
    const blockNumber = (tx.block as number) || 0;
    const status = (tx.status as string) === "ok" ? "success" : "failed";

    const direction =
      from.toLowerCase() === addrLower && to.toLowerCase() === addrLower
        ? "self"
        : from.toLowerCase() === addrLower
        ? "out"
        : "in";

    const ethValue = formatValue(value, 18);
    const usdValue = (ethValue * ETH_PRICE_USD).toFixed(2);

    return {
      hash: (tx.hash as string) || "",
      from,
      to,
      value: `${ethValue.toFixed(6)} ETH`,
      valueUSD: `$${Number(usdValue).toLocaleString()}`,
      token: "ETH",
      timestamp,
      blockNumber,
      direction,
      status: status as "success" | "failed",
      chain: "ethereum",
      fromLabel: getDisplayName(from),
      toLabel: to ? getDisplayName(to) : "Contract Create",
    };
  });
}

export async function getEthereumGraph(address: string): Promise<GraphData> {
  const data = await fetchBlockscout(
    `/addresses/${address}/transactions`
  ) as Record<string, unknown>;

  const items = (data.items as Record<string, unknown>[]) || [];
  const addrLower = address.toLowerCase();

  // Build adjacency map
  const edgeMap = new Map<string, { volume: number; txCount: number; directions: Set<string> }>();
  const counterparts = new Set<string>();

  for (const tx of items) {
    const from = ((tx.from as Record<string, string>)?.hash || "").toLowerCase();
    const to = ((tx.to as Record<string, string> | null)?.hash || "").toLowerCase();
    const value = formatValue((tx.value as string) || "0", 18);

    if (!from || !to) continue;

    const counterpart = from === addrLower ? to : from;
    const direction = from === addrLower ? "out" : "in";

    if (counterpart === addrLower) continue; // Self tx
    counterparts.add(counterpart);

    const edgeKey = [addrLower, counterpart].sort().join("-");
    const existing = edgeMap.get(edgeKey) || { volume: 0, txCount: 0, directions: new Set() };
    existing.volume += value;
    existing.txCount++;
    existing.directions.add(direction);
    edgeMap.set(edgeKey, existing);
  }

  // Build nodes
  const nodes: GraphNode[] = [
    {
      id: address,
      label: getDisplayName(address),
      type: getWalletType(address),
      chain: "ethereum",
      txCount: items.length,
      volume: 0,
      isCenter: true,
      riskScore: 0,
    },
  ];

  for (const counterpart of counterparts) {
    const knownLabel = getLabel(counterpart);
    nodes.push({
      id: counterpart,
      label: getDisplayName(counterpart),
      type: knownLabel?.type || getWalletType(counterpart),
      chain: "ethereum",
      txCount: 0,
      volume: 0,
      riskScore: knownLabel?.risk ? 80 : 0,
    });
  }

  // Build edges
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
