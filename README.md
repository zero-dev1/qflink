# QFLink

**Every Message. On-Chain. Forever.**

QFLink is the first fully on-chain messaging application built on [QF Network](https://qfnetwork.xyz). Token-gated group chats (Pods), encrypted direct messages, no database, no server — just the chain.

---

## Overview

QFLink enables censorship-resistant communication through two core features:

**Pods** — Token-gated group chats where access is determined by your QF holdings. The more you hold, the higher-tier Pods you can enter. Three default tiers exist: Chefs (10+ QF), Whale (250K+ QF), and Kraken (500K+ QF). Custom Pods with user-defined requirements are on the roadmap.

**Direct Messages** — Encrypted wallet-to-wallet messaging. No intermediary, no server, no database. Messages are stored on-chain and encrypted end-to-end between sender and recipient.

Every message is an on-chain transaction. Nothing can be deleted, censored, or tampered with.

---

## Features

- **Wallet-Gated Access** — Connect your Substrate wallet and create an on-chain profile to enter the app.
- **Token-Gated Pods** — Group chats gated by QF token balance. Holdings are verified across up to 3 linked wallets.
- **Encrypted DMs** — End-to-end encrypted direct messages between any two wallet addresses.
- **On-Chain Identity** — Display names and profiles stored on-chain via a registry contract.
- **Dark & Light Mode** — Full theme support across the entire application.
- **Mobile Responsive** — Optimised for both desktop and mobile browsers.
- **Live Block Feed** — Real-time block numbers displayed on the landing page, demonstrating chain liveness.

---

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Fonts:** Urbanist (UI), Geist Mono (code/addresses)
- **Blockchain:** Substrate (QF Network)
- **Contracts:** ink! smart contracts (messaging, registry, pod management)
- **Wallet Integration:** Polkadot.js, Talisman, SubWallet, MetaMask (EVM)

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Substrate wallet browser extension (Polkadot.js, Talisman, or SubWallet)
- A local Substrate node running (for development)

### Run the Local Node

```bash
cd /path/to/your-substrate-node
cargo build --release
./target/release/node-template --dev --tmp
Copy
Deploy Contracts
Copycd /path/to/your-contracts
cargo contract build
cargo contract instantiate --constructor new --args ... --suri //Alice --url ws://127.0.0.1:9944
Note the contract addresses and update your .env file.

Run the Frontend
Copycd qflink-frontend
npm install
npm run dev
The app will be available at http://localhost:5173.

Environment Variables
Create a .env file in the project root:

VITE_WS_URL=ws://127.0.0.1:9944
VITE_MESSAGING_CONTRACT_ADDRESS=<your_messaging_contract_address>
VITE_REGISTRY_CONTRACT_ADDRESS=<your_registry_contract_address>
VITE_POD_CONTRACT_ADDRESS=<your_pod_contract_address>
User Flow
Landing Page — Learn about QFLink and click "Launch App".
Connect Wallet — Select and connect your Substrate or EVM wallet.
Create Profile — Choose a display name (stored on-chain).
Home — View your Pods and recent Direct Messages.
Explore — Browse and join token-gated Pods based on your holdings.
Pod Chat — Send messages in group chats. All messages are on-chain transactions.
Direct Messages — Send encrypted wallet-to-wallet messages.
Profile — Edit your display name, bio, and manage linked wallets.
Roadmap
Phase 1 (Current — MVP)

Free-balance token gating for 3 default Pod tiers
On-chain messaging (Pods + DMs)
Wallet-gated onboarding with profile creation
Dark/light mode, mobile responsive
Phase 2 — Mainnet Launch

Staking-aware Pod access (read from QF Network staking)
Weighted balance mode (staked tokens valued higher than free balance)
Mainnet deployment
Phase 3 — Monetisation

Paid Pods with creator revenue share (80/20 split)
One-off entry fees for premium Pods
Phase 4 — Scaling

Tiered Pod creation fees (Free / Standard / Premium)
Recurring subscription Pods
Wallet delegation (cold wallet to hot wallet)
NFT mod badges and cosmetics
Activity tracking and decay indicators
Architecture
Landing Page (public)
    ↓ Launch App
Connect Wallet Screen (public, always dark)
    ↓ Wallet connected
Profile Creation (if new wallet)
    ↓ Profile created
App Shell (auth-guarded)
    ├── Home (Pods + DMs overview)
    ├── Explore (browse/join Pods)
    ├── Pods (your joined Pods + chat)
    ├── Direct (encrypted DM conversations)
    ├── Profile (edit name, bio, linked wallets)
    └── Settings
Design System
Colors

Accent: #0891B2 (cyan-600) — used across both light and dark modes
Dark background: #0D0D0D
Light background: #FFFFFF
Typography

UI/Body: Urbanist (Google Fonts, variable 100–900)
Code/Addresses: Geist Mono (Google Fonts)
Logo

Icon: Interlocking link mark (rounded square + diagonal)
Wordmark: Icon + "QFLink" (QF in cyan, Link in primary text color)
Variants: dark background (logo-full-dark.svg), light background (logo-full-light.svg)
Built On
QF Network — A Substrate-based blockchain.

License
MIT

Sovereign. On-Chain. Yours.