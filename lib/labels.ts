import { WalletType } from "./types";

export interface WalletLabel {
  name: string;
  type: WalletType;
  risk?: boolean;
}

// Known exchange & entity addresses
export const KNOWN_LABELS: Record<string, WalletLabel> = {
  // Binance
  "0x28c6c06298d514db089934071355e5743bf21d60": { name: "Binance 14", type: "exchange" },
  "0x21a31ee1afc51d94c2efccaa2092ad1028285549": { name: "Binance 15", type: "exchange" },
  "0xdfd5293d8e347dfe59e90efd55b2956a1343963d": { name: "Binance 16", type: "exchange" },
  "0x56eddb7aa87536c09ccc2793473599fd21a8b17f": { name: "Binance 17", type: "exchange" },
  "0x9696f59e4d72e237be84ffd425dcad154bf96976": { name: "Binance: Hot Wallet", type: "exchange" },
  "0x4e9ce36e442e55ecd9025b9a6e0d88485d628a67": { name: "Binance 18", type: "exchange" },
  "0xbe0eb53f46cd790cd13851d5eff43d12404d33e8": { name: "Binance Cold Wallet", type: "exchange" },
  "0xf977814e90da44bfa03b6295a0616a897441acec": { name: "Binance 8", type: "exchange" },
  "0x8894e0a0c962cb723c1976a4421c95949be2d4e3": { name: "Binance 7", type: "exchange" },
  "0xe0f0cfde7ee664943906f17f7f14342e76a5cec7": { name: "Binance 9", type: "exchange" },

  // Coinbase
  "0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43": { name: "Coinbase", type: "exchange" },
  "0x71660c4005ba85c37ccec55d0c4493e66fe775d3": { name: "Coinbase 2", type: "exchange" },
  "0x503828976d22510aad0201ac7ec88293211d23da": { name: "Coinbase 3", type: "exchange" },
  "0xddfabcdc4d8ffc6d5beaf154f18b778f892a0740": { name: "Coinbase 4", type: "exchange" },
  "0x3cd751e6b0078be393132286c442345e5dc49699": { name: "Coinbase 5", type: "exchange" },
  "0xb5d85cbf7cb3ee0d56b3bb207d5fc4b82f43f511": { name: "Coinbase 6", type: "exchange" },
  "0xeb2629a2734e272bcc07bda959863f316f4bd4cf": { name: "Coinbase Cold", type: "exchange" },

  // Kraken
  "0x2910543af39aba0cd09dbb2d50200b3e800a63d2": { name: "Kraken 1", type: "exchange" },
  "0x0a869d79a7052c7f1b55a8ebabbea3420f0d1e13": { name: "Kraken 2", type: "exchange" },
  "0xe853c56864a2ebe4576a807d26fdc4a0ada51919": { name: "Kraken 3", type: "exchange" },
  "0x267be1c1d684f78cb4f6a176c4911b741e4ffdc0": { name: "Kraken 4", type: "exchange" },

  // OKX
  "0x6cc5f688a315f3dc28a7781717a9a798a59fda7b": { name: "OKX 1", type: "exchange" },
  "0x236f9f97e0e62388479bf9e5ba4889e46b0273c3": { name: "OKX 2", type: "exchange" },
  "0xa7efae728d2936e78bda97dc267687568dd593f3": { name: "OKX 3", type: "exchange" },

  // Huobi / HTX
  "0xaB5C66752a9e8167967685F1450532fB96d5d24f": { name: "HTX 1", type: "exchange" },
  "0x6748f50f686bfbca6fe8ad62b22228b87f31ff2b": { name: "HTX 2", type: "exchange" },
  "0xfdb16996831753d5331ff813c29a93c76834a0ad": { name: "HTX 3", type: "exchange" },
  "0x5c985e89dde482efe97ea9f1950ad149eb73829b": { name: "HTX 4", type: "exchange" },

  // Uniswap
  "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984": { name: "Uniswap Token", type: "contract" },
  "0x7a250d5630b4cf539739df2c5dacb4c659f2488d": { name: "Uniswap V2 Router", type: "contract" },
  "0xe592427a0aece92de3edee1f18e0157c05861564": { name: "Uniswap V3 Router", type: "contract" },

  // USDT / USDC / DAI
  "0xdac17f958d2ee523a2206206994597c13d831ec7": { name: "Tether USDT", type: "contract" },
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": { name: "USD Coin USDC", type: "contract" },
  "0x6b175474e89094c44da98b954eedeac495271d0f": { name: "DAI Stablecoin", type: "contract" },

  // Known risky addresses (public blacklists)
  "0x7f367cc41522ce07553e823bf3be79a889debe1b": { name: "Sanctioned (OFAC)", type: "risk", risk: true },
  "0xd882cfc20f52f2599d84b8e8d58c7fb62cfe344b": { name: "Lazarus Group", type: "risk", risk: true },
  "0x901bb9583b24d97e995513c6778dc6888ab6870e": { name: "Lazarus Group 2", type: "risk", risk: true },
  "0xa7e5d5a720f06526557c513402f2e6b5fa20b008": { name: "Sanctioned Mixer", type: "risk", risk: true },
  "0x8576acc5c05d6ce88f4e49bf65bdf0c62f91353c": { name: "Tornado Cash Deployer", type: "risk", risk: true },

  // Tornado Cash (controversial but often flagged)
  "0x722122df12d4e14e13ac3b6895a86e84145b6967": { name: "Tornado Cash 0.1 ETH", type: "risk", risk: true },
  "0xdd4c48c0b24039969fc16d1cdf626eab821d3384": { name: "Tornado Cash 0.1 ETH", type: "risk", risk: true },
  "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b": { name: "Tornado Cash 1 ETH", type: "risk", risk: true },
  "0x910cbd523d972eb0a6f4cae4618ad62622b39dbf": { name: "Tornado Cash 10 ETH", type: "risk", risk: true },
  "0xa160cdab225685da1d56aa342ad8841c3b53f291": { name: "Tornado Cash 100 ETH", type: "risk", risk: true },

  // TRON exchanges
  "TNaRAoLUyYEV2uF7GRZPbKHUiErLuoHb4u": { name: "Binance TRON", type: "exchange" },
  "TKzxdSv2FZKQrEqkKVgp5DcwEXBEKMg2Ax": { name: "HTX TRON", type: "exchange" },
  "TAzsQ9Gx8eqFNFSKbeXrbi45CuVPHzA8wr": { name: "OKX TRON", type: "exchange" },

  // Bitcoin exchanges (public cold wallets)
  "1NDyJtNTjmwk5xPNhjgAMu4HDHigtobu1s": { name: "Binance Cold BTC", type: "exchange" },
  "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo": { name: "Binance Hot BTC", type: "exchange" },
  "bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq90ecnvqqjwvw97": { name: "Binance BTC", type: "exchange" },
  "1FzWLkAahHooV3kzTgyx6qsswXJ6LD4K6T": { name: "Kraken BTC", type: "exchange" },
};

export function getLabel(address: string): WalletLabel | undefined {
  return KNOWN_LABELS[address.toLowerCase()] || KNOWN_LABELS[address];
}

export function isRiskAddress(address: string): boolean {
  const label = getLabel(address);
  return label?.risk === true;
}

export function getDisplayName(address: string): string {
  const label = getLabel(address);
  if (label) return label.name;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
