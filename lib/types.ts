export type Chain = "ethereum" | "polygon" | "solana" | "tron" | "bitcoin" | "unknown";
export type WalletType = "user" | "exchange" | "contract" | "risk" | "unknown";

export interface WalletInfo {
  address: string;
  chain: Chain;
  balance: string;
  balanceUSD: string;
  txCount: number;
  type: WalletType;
  label?: string;
  riskScore: number;
  riskFlags: string[];
  firstSeen?: string;
  lastSeen?: string;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  valueUSD: string;
  token: string;
  timestamp: string;
  blockNumber: number;
  direction: "in" | "out" | "self";
  status: "success" | "failed";
  chain: Chain;
  fromLabel?: string;
  toLabel?: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: WalletType;
  chain: Chain;
  txCount: number;
  volume: number;
  isCenter?: boolean;
  riskScore?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  volume: number;
  txCount: number;
  direction: "in" | "out" | "both";
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphEdge[];
}

export interface WalletAnalysis {
  wallet: WalletInfo;
  transactions: Transaction[];
  graph: GraphData;
}
