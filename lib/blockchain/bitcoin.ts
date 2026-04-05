import { Transaction, WalletInfo, GraphData, GraphNode, GraphEdge } from "../types";
import { getLabel, getDisplayName } from "../labels";
import { getWalletType, calculateRiskScore } from "../utils";

const BTC_PRICE_USD = 65000; // Approximate

async function fetchBlockchain(path: string): Promise<unknown> {
  const res = await fetch(`https://blockchain.info${path}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`Blockchain.info error: ${res.status}`);
  return res.json();
}

export async function getBitcoinWalletInfo(address: string): Promise<WalletInfo> {
  const data = await fetchBlockchain(`/rawaddr/${address}?limit=50`) as Record<string, unknown>;

  const finalBalance = (data.final_balance as number) || 0;
  const totalReceived = (data.total_received as number) || 0;
  const txCount = (data.n_tx as number) || 0;
  const txs = (data.txs as Record<string, unknown>[]) || [];

  const balanceBTC = finalBalance / 1e8;
  const balanceUSD = (balanceBTC * BTC_PRICE_USD).toFixed(2);

  // Build related addresses for risk scoring
  const relatedAddresses: string[] = [];
  for (const tx of txs) {
    const inputs = (tx.inputs as Record<string, unknown>[]) || [];
    const outputs = (tx.out as Record<string, unknown>[]) || [];
    for (const inp of inputs) {
      const addr = (inp.prev_out as Record<string, string>)?.addr;
      if (addr && addr !== address) relatedAddresses.push(addr);
    }
    for (const out of outputs) {
      const addr = out.addr as string;
      if (addr && addr !== address) relatedAddresses.push(addr);
    }
  }

  const uniqueCounterparts = new Set(relatedAddresses).size;
  const { score, flags } = calculateRiskScore(address, relatedAddresses, txCount, uniqueCounterparts);

  const knownLabel = getLabel(address);

  return {
    address,
    chain: "bitcoin",
    balance: `${balanceBTC.toFixed(8)} BTC`,
    balanceUSD: `$${Number(balanceUSD).toLocaleString()}`,
    txCount,
    type: knownLabel?.type || getWalletType(address),
    label: knownLabel?.name,
    riskScore: score,
    riskFlags: flags,
  };
}

export async function getBitcoinTransactions(address: string, limit = 50): Promise<Transaction[]> {
  const data = await fetchBlockchain(`/rawaddr/${address}?limit=${limit}`) as Record<string, unknown>;
  const txs = (data.txs as Record<string, unknown>[]) || [];

  const transactions: Transaction[] = [];

  for (const tx of txs) {
    const inputs = (tx.inputs as Record<string, unknown>[]) || [];
    const outputs = (tx.out as Record<string, unknown>[]) || [];
    const time = (tx.time as number) || 0;
    const hash = (tx.hash as string) || "";
    const blockIndex = (tx.block_index as number) || 0;

    // Determine direction
    const inputAddresses = inputs.map((i) => (i.prev_out as Record<string, string>)?.addr);
    const isSender = inputAddresses.includes(address);

    // Calculate value
    let value = 0;
    let counterpartAddr = "";

    if (isSender) {
      // Sum outputs not to self
      for (const out of outputs) {
        const addr = out.addr as string;
        const val = (out.value as number) || 0;
        if (addr !== address) {
          value += val;
          counterpartAddr = addr;
        }
      }
    } else {
      // Find outputs to this address
      for (const out of outputs) {
        const addr = out.addr as string;
        const val = (out.value as number) || 0;
        if (addr === address) {
          value += val;
        }
      }
      // Find sender
      counterpartAddr = inputs[0]
        ? (inputs[0].prev_out as Record<string, string>)?.addr || ""
        : "";
    }

    const valueBTC = value / 1e8;
    const valueUSD = (valueBTC * BTC_PRICE_USD).toFixed(2);

    transactions.push({
      hash,
      from: isSender ? address : counterpartAddr,
      to: isSender ? counterpartAddr : address,
      value: `${valueBTC.toFixed(8)} BTC`,
      valueUSD: `$${Number(valueUSD).toLocaleString()}`,
      token: "BTC",
      timestamp: new Date(time * 1000).toISOString(),
      blockNumber: blockIndex,
      direction: isSender ? "out" : "in",
      status: "success",
      chain: "bitcoin",
      fromLabel: getDisplayName(isSender ? address : counterpartAddr),
      toLabel: getDisplayName(isSender ? counterpartAddr : address),
    });
  }

  return transactions;
}

export async function getBitcoinGraph(address: string): Promise<GraphData> {
  const data = await fetchBlockchain(`/rawaddr/${address}?limit=50`) as Record<string, unknown>;
  const txs = (data.txs as Record<string, unknown>[]) || [];

  const edgeMap = new Map<string, { volume: number; txCount: number; directions: Set<string> }>();
  const counterparts = new Set<string>();

  for (const tx of txs) {
    const inputs = (tx.inputs as Record<string, unknown>[]) || [];
    const outputs = (tx.out as Record<string, unknown>[]) || [];
    const inputAddresses = inputs.map((i) => (i.prev_out as Record<string, string>)?.addr);
    const isSender = inputAddresses.includes(address);

    if (isSender) {
      for (const out of outputs) {
        const addr = out.addr as string;
        const val = ((out.value as number) || 0) / 1e8;
        if (addr && addr !== address) {
          counterparts.add(addr);
          const key = [address, addr].sort().join("-");
          const existing = edgeMap.get(key) || { volume: 0, txCount: 0, directions: new Set() };
          existing.volume += val;
          existing.txCount++;
          existing.directions.add("out");
          edgeMap.set(key, existing);
        }
      }
    } else {
      for (const inp of inputs) {
        const addr = (inp.prev_out as Record<string, string>)?.addr;
        if (addr && addr !== address) {
          counterparts.add(addr);
          const key = [address, addr].sort().join("-");
          const existing = edgeMap.get(key) || { volume: 0, txCount: 0, directions: new Set() };
          existing.txCount++;
          existing.directions.add("in");
          edgeMap.set(key, existing);
        }
      }
    }
  }

  const nodes: GraphNode[] = [
    {
      id: address,
      label: getDisplayName(address),
      type: getWalletType(address),
      chain: "bitcoin",
      txCount: txs.length,
      volume: 0,
      isCenter: true,
    },
  ];

  for (const counterpart of counterparts) {
    const knownLabel = getLabel(counterpart);
    nodes.push({
      id: counterpart,
      label: getDisplayName(counterpart),
      type: knownLabel?.type || "user",
      chain: "bitcoin",
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
