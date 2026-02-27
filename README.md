# QFLink - Encrypted Messaging dApp

QFLink is a Web3 encrypted messaging application with balance-gated group chats ("Whale Pods") built for the QF Network (QuantumFusion).

## Features

- **Encrypted Direct Messages** — End-to-end encrypted messaging using TweetNaCl box encryption
- **Whale Pods** — Tiered balance-gated group chats (Standard / Premium / Elite)
- **Pod Tier System** — Creation fees (500 / 5,000 / 50,000 QF) with 25% treasury + 75% burn split
- **Real Chain Connection** — Connects via `@polkadot/api` WebSocket, fetches real balances
- **Balance Subscription** — Live balance updates from chain
- **Linked Wallets** — Aggregate balances across multiple wallets for pod access
- **Wallet Support** — Polkadot.js, Talisman, SubWallet extensions + demo wallet
- **Network Switcher** — Toggle between Local Dev, QF Testnet, and QF Mainnet
- **Network Health** — Auto-reconnect, stale block detection, connection status indicators

## QF Network

| | Local Dev | Testnet | Mainnet |
|---|---|---|---|
| **WSS** | `ws://127.0.0.1:9944` | `wss://test.qfnetwork.xyz` | `wss://rpc.qfnetwork.xyz` |
| **Explorer** | [Polkadot.js Apps](https://polkadot.js.org/apps/?rpc=ws%3A%2F%2F127.0.0.1%3A9944#/explorer) | [portal.qfnetwork.xyz](https://portal.qfnetwork.xyz/#/explorer) | [portal.qfnetwork.xyz](https://portal.qfnetwork.xyz/#/explorer) |
| **Faucet** | Dev accounts (Alice, Bob, etc.) | [faucet.qfnetwork.xyz](https://faucet.qfnetwork.xyz) | — |
| **Token** | QF (18 decimals) | QF (18 decimals) | QF (18 decimals) |

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Zustand
- **Chain**: @polkadot/api + @polkadot/extension-dapp
- **Encryption**: TweetNaCl (NaCl box)
- **Contracts**: Rust → PolkaVM (qf-polkavm-sdk)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Browser wallet extension (optional — demo wallet available)

### Install & Run

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Open http://localhost:5173

### Build for Production

```bash
pnpm build
pnpm preview
```

### Test Chain Connection

```bash
npx tsx scripts/test-connection.ts
```

## Local Development

1. Clone and build QF node:
```bash
git clone https://github.com/QuantumFusion-network/qf-solochain.git
cd qf-solochain
cargo build --release
```

2. Run local devnet:
```bash
./target/release/qf-node --dev --state-pruning archive
```

3. Node runs on `ws://127.0.0.1:9944`

4. Dev accounts with tokens:

| Account | Address | Seed | Role |
|---|---|---|---|
| **Alice** | `5GrwvaEF...utQY` | `//Alice` | bank |
| **Bob** | `5FHneW46...94ty` | `//Bob` | whale |
| **Charlie** | `5FLSigC9...s59Y` | `//Charlie` | dolphin |
| **Dave** | `5DAAnrj7...TXFy` | `//Dave` | shrimp |
| **Eve** | `5HGjWAeF...Maw` | `//Eve` | plankton |
| **Ferdie** | `5CiPPseX...Rmhv` | `//Ferdie` | broke |

Use `//Alice` or `//Bob` seed in Polkadot.js extension to import.

5. Start QFLink:
```bash
pnpm dev
```

6. Select "Local Dev" network in Settings

## Environment Variables

Copy `.env.example` to `.env`:

```
VITE_DEFAULT_NETWORK=local
VITE_MESSAGING_CONTRACT_ADDRESS=
VITE_PODS_CONTRACT_ADDRESS=
VITE_LINKED_WALLETS_CONTRACT_ADDRESS=
```

Environment-specific files:
- `.env.development` → `VITE_DEFAULT_NETWORK=local`
- `.env.staging` → `VITE_DEFAULT_NETWORK=testnet`
- `.env.production` → `VITE_DEFAULT_NETWORK=mainnet`

Contract addresses are empty until deployed. The app uses mock data when addresses are empty and switches to real contract calls when filled in.

## Pod Tiers

| Tier | Fee | Max Members | Features |
|---|---|---|---|
| **Standard** | 500 QF | 100 | Public/private, basic chat |
| **Premium** | 5,000 QF | Unlimited | Custom avatar, pin messages, assign mods |
| **Elite** | 50,000 QF | Unlimited | Verified badge ✓, featured placement, analytics |

Fee distribution: **25% → Treasury**, **75% → Burned**

## Smart Contracts

Contracts are in `/contracts` and compile to PolkaVM:

```bash
cd contracts
chmod +x build.sh
./build.sh
```

Three contracts:
- **messaging** — On-chain encrypted message storage
- **pods** — Pod creation with tier fees, member management, balance gating
- **linked_wallets** — Multi-wallet linking via signature verification

## Project Structure

```
src/
├── components/
│   ├── ui/         # Button, Input, Card, Modal, Avatar, Badge, Spinner, Toast
│   ├── layout/     # Sidebar, Layout, WalletButton
│   ├── messages/   # ConversationList, ChatView, MessageBubble, NewMessageModal
│   └── pods/       # PodCard, PodGrid, PodChat, MemberList, CreatePodModal
├── pages/          # MessagesPage, PodsPage, SettingsPage
├── stores/         # wallet, messages, pods, ui (Zustand)
├── hooks/          # useWallet, useMessages, usePods, useToast
├── lib/            # network, chain, contracts, encryption, fees, utils
└── types/          # TypeScript type definitions
contracts/          # Rust PolkaVM smart contracts
scripts/            # deploy.ts, test-connection.ts
```

## License

MIT
