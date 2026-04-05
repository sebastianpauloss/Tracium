# ChainLens — Blockchain Wallet Intelligence

A full-stack blockchain explorer for analyzing wallet relationships, tracing transactions, and detecting risk across multiple blockchains.

## Features

- **Interactive Relation Graph** — Force-directed graph showing wallet connections, built with `react-force-graph-2d`
- **Multi-Chain Support** — Ethereum (via Blockscout), TRON (via TronGrid), Bitcoin (via Blockchain.info)
- **Risk Intelligence** — Automatic scoring based on OFAC sanctions exposure, Tornado Cash, and behavioral patterns
- **Transaction History** — Filterable table with search, direction filter, and token filter
- **Known Entity Labels** — 50+ exchange/contract/risk addresses pre-labeled (Binance, Coinbase, Kraken, OKX, etc.)
- **No API Keys Required** — Uses free public endpoints out of the box

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. (Optional) Add API keys for higher rate limits

Copy `.env.local.example` to `.env.local` and add your keys:

```bash
cp .env.local.example .env.local
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Graph**: react-force-graph-2d
- **Styling**: Tailwind CSS (dark mode)
- **APIs**: Blockscout, TronGrid, Blockchain.info
- **Language**: TypeScript

## Supported Addresses

| Network | Format | Example |
|---------|--------|---------|
| Ethereum | `0x` + 40 hex chars | `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` |
| TRON | `T` + 33 base58 chars | `TNaRAoLUyYEV2uF7GRZPbKHUiErLuoHb4u` |
| Bitcoin | Legacy, P2SH, Bech32 | `1NDyJtNTjmwk5xPNhjgAMu4HDHigtobu1s` |

## Architecture

```
app/
├── page.tsx                    # Landing page with search
├── wallet/[address]/
│   ├── page.tsx                # Server component wrapper
│   └── WalletAnalysis.tsx      # Main analysis client component
├── api/wallet/[address]/
│   ├── route.ts                # Wallet info + transactions API
│   └── graph/route.ts          # Graph data API
components/
├── WalletGraph.tsx             # D3 force graph (client-only)
├── SearchBar.tsx               # Address input with chain detection
├── WalletCard.tsx              # Wallet info card
├── TransactionTable.tsx        # Filterable transaction list
├── RiskScore.tsx               # Risk score ring widget
└── NodeDetailPanel.tsx         # Node click detail panel
lib/
├── blockchain/
│   ├── ethereum.ts             # Blockscout API integration
│   ├── tron.ts                 # TronGrid API integration
│   └── bitcoin.ts              # Blockchain.info integration
├── labels.ts                   # Known wallet labels + risk list
├── cache.ts                    # In-memory cache (5 min TTL)
└── utils.ts                    # Chain detection, risk scoring
```

## Rate Limits

The app uses free public APIs with these limits:
- **Blockscout**: ~10 req/s
- **TronGrid**: ~5 req/s
- **Blockchain.info**: ~1 req/s

Results are cached for 5 minutes to avoid hitting limits.

## Extending

- Add more known labels in `lib/labels.ts`
- Add more chains by creating `lib/blockchain/solana.ts` and importing in API routes
- Add a database (PostgreSQL/MongoDB) to persist graph relationships
- Add WebSocket support for real-time transaction alerts
