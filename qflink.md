# QFLink - Complete Product Reference Document

## Version 1.0 MVP | February 2026

---

# Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [Technical Architecture](#3-technical-architecture)
4. [Smart Contracts](#4-smart-contracts)
5. [Design System](#5-design-system)
6. [Screens & Components](#6-screens--components)
7. [Features Specification](#7-features-specification)
8. [Data Models](#8-data-models)
9. [API & Contract Interfaces](#9-api--contract-interfaces)
10. [User Flows](#10-user-flows)
11. [Development Guide](#11-development-guide)
12. [File Structure](#12-file-structure)
13. [Testing](#13-testing)
14. [Deployment](#14-deployment)
15. [Future Integrations](#15-future-integrations)
16. [Appendix](#16-appendix)

---

# 1. Executive Summary

## What is QFLink?

QFLink is a decentralized, wallet-gated messaging platform built on QF Network. It enables token holders to communicate in exclusive groups (Pods) based on their on-chain holdings. All messages are encrypted and stored fully on-chain, showcasing the speed and capability of QF Network's 100ms block times.

## Core Value Proposition

- **Balance-Gated Access**: Only holders above certain thresholds can access specific Pods
- **Fully On-Chain**: All messages encrypted and stored on-chain (not IPFS, not off-chain)
- **Multi-Wallet Support**: Link up to 5 wallets, aggregate balance determines access
- **End-to-End Encrypted**: DMs use TweetNaCl box encryption
- **QF Network Showcase**: Demonstrates what's possible with 100ms blocks and minimal gas

## Target Users

- QF token holders seeking exclusive community access
- Token projects wanting gated communities for their holders
- Crypto traders wanting private, verified-holder-only discussions

## Timeline

**MVP Delivery: 7 days**

---

# 2. Product Overview

## 2.1 Pod Types

### Default Pods (System-Created, Always Exist)

| Pod Name | Balance Requirement | Description |
|----------|---------------------|-------------|
| **Krakens** | 500,000+ QF | Elite QF holders discussing alpha and market strategies |
| **Whales** | 250,000 - 500,000 QF | High-tier trading discussions and technical analysis |
| **Chefs** | 10 - 250,000 QF | Active traders sharing insights and staking strategies |

**Membership Rules:**
- Users automatically join ALL default pods they qualify for
- 600K QF holder → Member of Krakens, Whales, and Chefs
- 300K QF holder → Member of Whales and Chefs
- 50K QF holder → Member of Chefs only
- 5 QF holder → No default pod access
- Daily on-chain cron checks balances; users auto-removed if below threshold

### Custom Pods (User-Created)

| Tier | Creation Fee | Max Members | Features |
|------|--------------|-------------|----------|
| **Standard** | 500 QF | 100 | Basic pod, balance or invite gating |
| **Premium** | 5,000 QF | 250 | All Standard features + larger capacity |
| **Elite** | 50,000 QF | Unlimited | All features, unlimited members |

**Fee Distribution:**
- 25% → Treasury (single wallet, upgradeable to multisig)
- 75% → Burned

**Custom Pod Join Methods:**
1. **Balance-Based**: Creator selects token (any PSP22) and minimum balance
2. **Invite-Only**: Creator generates invite links, no balance requirement

**Custom Pod Balance Checks:**
- Same daily on-chain cron as default pods
- Users auto-removed if balance drops below requirement

## 2.2 Messaging

### Direct Messages (DMs)
- 1-to-1 encrypted conversations
- End-to-end encrypted using TweetNaCl (nacl.box)
- Fully on-chain storage
- 280 character limit per message
- Immutable once sent

### Pod Messages
- Group chat within pods
- Same encryption and on-chain storage
- 280 character limit
- Immutable once sent

## 2.3 Linked Wallets

- Users can link up to 5 wallets
- Prove ownership by signing a message from each wallet
- Balance is aggregated across all linked wallets
- Aggregate balance determines pod access

---

# 3. Technical Architecture

## 3.1 Stack Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  React 18 + TypeScript + Vite + TailwindCSS + Zustand       │
│  @polkadot/api + @polkadot/extension-dapp                   │
│  TweetNaCl (encryption)                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      QF NETWORK                              │
│  Runtime: PolkaVM (RISC-V)                                  │
│  Pallet: pallet-revive                                       │
│  Block Time: 100ms                                           │
│  Token: QF (18 decimals)                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SMART CONTRACTS                           │
│  Language: Native Rust                                       │
│  SDK: qf-polkavm-sdk                                        │
│  Standard: PSP22 (OpenBrush)                                │
│  ABI: Dual (SCALE + Solidity-compatible)                    │
└─────────────────────────────────────────────────────────────┘
```

## 3.2 Network Configuration

| Environment | RPC Endpoint | Usage |
|-------------|--------------|-------|
| **Local Devnet** | `ws://127.0.0.1:9944` | Development & testing |
| **Mainnet** | `wss://mainnet.qfnode.net` | Production |

## 3.3 Frontend Stack

| Package | Version | Purpose |
|---------|---------|---------|
| React | 18.2+ | UI framework |
| TypeScript | 5+ | Type safety |
| Vite | 5+ | Build tool |
| TailwindCSS | 3.4+ | Styling |
| Zustand | 4+ | State management |
| React Router | 6+ | Routing |
| @polkadot/api | latest | Chain interaction |
| @polkadot/extension-dapp | latest | Wallet connection |
| tweetnacl | latest | Encryption |
| tweetnacl-util | latest | Encoding utilities |

## 3.4 Smart Contract Stack

| Component | Value |
|-----------|-------|
| Language | Native Rust (not Solidity) |
| SDK | qf-polkavm-sdk |
| Runtime | PolkaVM (RISC-V virtual machine) |
| Pallet | pallet-revive from Polkadot SDK |
| API | pallet-revive-uapi |
| Compiler | polkatool v0.21.0 |
| Token Standard | PSP22 (OpenBrush) |
| ABI | Dual-ABI (SCALE + Solidity-compatible) |

**SDK Repository:** https://github.com/QuantumFusion-network/qf-polkavm-sdk

## 3.5 Build Process

```bash
# Install polkatool (must match chain's pallet-revive version)
cargo install --git https://github.com/paritytech/polkavm.git --tag v0.21.0 polkatool

# Build contract
./build_polkavm.sh contract-name

# Output
output/contract-name.polkavm
```

---

# 4. Smart Contracts

## 4.1 Contract Overview

QFLink requires 4 smart contracts:

| Contract | Purpose |
|----------|---------|
| `qflink_pods.rs` | Pod creation, membership, settings |
| `qflink_messages.rs` | On-chain encrypted message storage |
| `qflink_wallets.rs` | Linked wallet management |
| `qflink_cron.rs` | Daily balance checks, auto-removal |

## 4.2 Contract: qflink_pods.rs

### Storage

```rust
#[ink(storage)]
pub struct QFLinkPods {
    // Default pods (initialized once)
    default_pods: Mapping<u8, DefaultPod>,        // 0=Krakens, 1=Whales, 2=Chefs
    
    // Custom pods
    pods: Mapping<u64, Pod>,
    pod_count: u64,
    
    // Membership
    pod_members: Mapping<(u64, AccountId), bool>,
    user_pods: Mapping<AccountId, Vec<u64>>,
    
    // Fees
    treasury: AccountId,
    total_fees_collected: Balance,
    total_burned: Balance,
    
    // Config
    tier_fees: [Balance; 3],                      // [500, 5000, 50000] QF
    tier_max_members: [u32; 3],                   // [100, 250, u32::MAX]
}

#[derive(scale::Encode, scale::Decode)]
pub struct DefaultPod {
    name: String,
    min_balance: Balance,
    max_balance: Option<Balance>,                 // None for Krakens (no upper limit)
    description: String,
    member_count: u32,
}

#[derive(scale::Encode, scale::Decode)]
pub struct Pod {
    id: u64,
    name: String,
    description: String,
    creator: AccountId,
    created_at: Timestamp,
    tier: u8,                                     // 0=Standard, 1=Premium, 2=Elite
    max_members: u32,
    member_count: u32,
    join_method: JoinMethod,
    token_address: Option<AccountId>,            // For balance-gated (PSP22 address)
    min_balance: Option<Balance>,
    is_active: bool,
}

#[derive(scale::Encode, scale::Decode)]
pub enum JoinMethod {
    BalanceBased,
    InviteOnly,
}
```

### Messages (Functions)

```rust
#[ink(message)]
impl QFLinkPods {
    // Initialize default pods (called once at deployment)
    #[ink(message)]
    pub fn initialize_defaults(&mut self) -> Result<(), Error>;
    
    // Create custom pod
    #[ink(message, payable)]
    pub fn create_pod(
        &mut self,
        name: String,
        description: String,
        tier: u8,
        join_method: JoinMethod,
        token_address: Option<AccountId>,
        min_balance: Option<Balance>,
    ) -> Result<u64, Error>;
    
    // Join pod (checks balance or invite)
    #[ink(message)]
    pub fn join_pod(&mut self, pod_id: u64) -> Result<(), Error>;
    
    // Join via invite link
    #[ink(message)]
    pub fn join_pod_with_invite(
        &mut self, 
        pod_id: u64, 
        invite_code: [u8; 32]
    ) -> Result<(), Error>;
    
    // Leave custom pod (cannot leave default pods manually)
    #[ink(message)]
    pub fn leave_pod(&mut self, pod_id: u64) -> Result<(), Error>;
    
    // Generate invite link (creator only)
    #[ink(message)]
    pub fn generate_invite(&mut self, pod_id: u64) -> Result<[u8; 32], Error>;
    
    // Update default pod membership based on balance
    #[ink(message)]
    pub fn update_default_membership(&mut self, user: AccountId) -> Result<(), Error>;
    
    // Get pod info
    #[ink(message)]
    pub fn get_pod(&self, pod_id: u64) -> Option<Pod>;
    
    // Get user's pods
    #[ink(message)]
    pub fn get_user_pods(&self, user: AccountId) -> Vec<u64>;
    
    // Get pod members
    #[ink(message)]
    pub fn get_pod_members(&self, pod_id: u64) -> Vec<AccountId>;
    
    // Check if user is member
    #[ink(message)]
    pub fn is_member(&self, pod_id: u64, user: AccountId) -> bool;
    
    // Admin: Update treasury address
    #[ink(message)]
    pub fn set_treasury(&mut self, new_treasury: AccountId) -> Result<(), Error>;
}
```

### Events

```rust
#[ink(event)]
pub struct PodCreated {
    #[ink(topic)]
    pod_id: u64,
    #[ink(topic)]
    creator: AccountId,
    name: String,
    tier: u8,
    fee_paid: Balance,
    treasury_amount: Balance,
    burned_amount: Balance,
}

#[ink(event)]
pub struct MemberJoined {
    #[ink(topic)]
    pod_id: u64,
    #[ink(topic)]
    member: AccountId,
}

#[ink(event)]
pub struct MemberLeft {
    #[ink(topic)]
    pod_id: u64,
    #[ink(topic)]
    member: AccountId,
    reason: LeaveReason,  // Voluntary, BalanceCheck, Kicked
}
```

## 4.3 Contract: qflink_messages.rs

### Storage

```rust
#[ink(storage)]
pub struct QFLinkMessages {
    // DM storage
    dm_messages: Mapping<(AccountId, AccountId, u64), EncryptedMessage>,
    dm_count: Mapping<(AccountId, AccountId), u64>,
    
    // Pod message storage
    pod_messages: Mapping<(u64, u64), EncryptedMessage>,  // (pod_id, msg_index)
    pod_message_count: Mapping<u64, u64>,
    
    // User conversations
    user_conversations: Mapping<AccountId, Vec<AccountId>>,
}

#[derive(scale::Encode, scale::Decode)]
pub struct EncryptedMessage {
    sender: AccountId,
    encrypted_content: Vec<u8>,      // nacl.box encrypted, max ~400 bytes for 280 chars
    nonce: [u8; 24],                  // nacl.box nonce
    timestamp: Timestamp,
}
```

### Messages (Functions)

```rust
#[ink(message)]
impl QFLinkMessages {
    // Send DM
    #[ink(message)]
    pub fn send_dm(
        &mut self,
        recipient: AccountId,
        encrypted_content: Vec<u8>,
        nonce: [u8; 24],
    ) -> Result<u64, Error>;
    
    // Send pod message
    #[ink(message)]
    pub fn send_pod_message(
        &mut self,
        pod_id: u64,
        encrypted_content: Vec<u8>,
        nonce: [u8; 24],
    ) -> Result<u64, Error>;
    
    // Get DMs between two users
    #[ink(message)]
    pub fn get_dms(
        &self,
        user_a: AccountId,
        user_b: AccountId,
        offset: u64,
        limit: u64,
    ) -> Vec<EncryptedMessage>;
    
    // Get pod messages
    #[ink(message)]
    pub fn get_pod_messages(
        &self,
        pod_id: u64,
        offset: u64,
        limit: u64,
    ) -> Vec<EncryptedMessage>;
    
    // Get user's conversation list
    #[ink(message)]
    pub fn get_conversations(&self, user: AccountId) -> Vec<AccountId>;
}
```

## 4.4 Contract: qflink_wallets.rs

### Storage

```rust
#[ink(storage)]
pub struct QFLinkWallets {
    // Primary wallet -> linked wallets
    linked_wallets: Mapping<AccountId, Vec<AccountId>>,
    
    // Reverse mapping: linked wallet -> primary wallet
    primary_wallet: Mapping<AccountId, AccountId>,
    
    // User profiles
    profiles: Mapping<AccountId, UserProfile>,
    
    // Public keys for encryption
    public_keys: Mapping<AccountId, [u8; 32]>,
    
    // Max linked wallets
    max_linked: u8,  // 5
}

#[derive(scale::Encode, scale::Decode)]
pub struct UserProfile {
    display_name: Option<String>,
    primary_wallet: AccountId,
    created_at: Timestamp,
}
```

### Messages (Functions)

```rust
#[ink(message)]
impl QFLinkWallets {
    // Register user (set display name, public key)
    #[ink(message)]
    pub fn register(
        &mut self,
        display_name: Option<String>,
        public_key: [u8; 32],
    ) -> Result<(), Error>;
    
    // Update display name
    #[ink(message)]
    pub fn set_display_name(&mut self, name: String) -> Result<(), Error>;
    
    // Link a wallet (requires signature proof)
    #[ink(message)]
    pub fn link_wallet(
        &mut self,
        wallet_to_link: AccountId,
        signature: [u8; 64],          // sr25519 signature
        message: Vec<u8>,              // signed message
    ) -> Result<(), Error>;
    
    // Unlink a wallet
    #[ink(message)]
    pub fn unlink_wallet(&mut self, wallet: AccountId) -> Result<(), Error>;
    
    // Get linked wallets
    #[ink(message)]
    pub fn get_linked_wallets(&self, user: AccountId) -> Vec<AccountId>;
    
    // Get aggregate balance (calls into QF token contract)
    #[ink(message)]
    pub fn get_aggregate_balance(&self, user: AccountId) -> Balance;
    
    // Get aggregate balance for specific token
    #[ink(message)]
    pub fn get_aggregate_token_balance(
        &self,
        user: AccountId,
        token: AccountId,
    ) -> Balance;
    
    // Get profile
    #[ink(message)]
    pub fn get_profile(&self, user: AccountId) -> Option<UserProfile>;
    
    // Get public key for encryption
    #[ink(message)]
    pub fn get_public_key(&self, user: AccountId) -> Option<[u8; 32]>;
}
```

## 4.5 Contract: qflink_cron.rs

### Storage

```rust
#[ink(storage)]
pub struct QFLinkCron {
    pods_contract: AccountId,
    wallets_contract: AccountId,
    last_check: Timestamp,
    check_interval: Timestamp,        // 24 hours in milliseconds
}
```

### Messages (Functions)

```rust
#[ink(message)]
impl QFLinkCron {
    // Run daily balance check (can be called by anyone, but only executes once per interval)
    #[ink(message)]
    pub fn run_daily_check(&mut self) -> Result<u32, Error>;  // Returns number of users removed
    
    // Check single user's membership
    #[ink(message)]
    pub fn check_user(&mut self, user: AccountId) -> Result<(), Error>;
    
    // Get last check timestamp
    #[ink(message)]
    pub fn get_last_check(&self) -> Timestamp;
}
```

---

# 5. Design System

## 5.1 Colors

### Light Mode

| Element | Color | Hex |
|---------|-------|-----|
| Background | Light Gray | `#DADADA` |
| Card Background | White | `#FFFFFF` |
| Primary Text | Near Black | `#161616` |
| Secondary Text | Gray | `#6B6B6B` |
| Accent | Cyan | `#00FFFF` |
| Accent Text (on cyan) | Dark | `#161616` |
| User Message Bubble | Cyan | `#00FFFF` |
| Other Message Bubble | Dark Gray | `#2A2A2A` |
| Other Message Text | White | `#FFFFFF` |
| Border | Light | `#E0E0E0` |
| Success | Green | `#00FF66` |
| Error | Red | `#FF4466` |
| Warning | Orange | `#FFAA00` |

### Dark Mode

| Element | Color | Hex |
|---------|-------|-----|
| Background | Near Black | `#0D0D0D` |
| Card Background | Dark Gray | `#1A1A1A` |
| Primary Text | White | `#FFFFFF` |
| Secondary Text | Light Gray | `#A0A0A0` |
| Accent | Cyan | `#00FFFF` |
| Accent Text (on cyan) | Dark | `#161616` |
| User Message Bubble | Cyan | `#00FFFF` |
| Other Message Bubble | Dark Gray | `#2A2A2A` |
| Other Message Text | White | `#FFFFFF` |
| Border | Dark | `#2A2A2A` |
| Success | Green | `#00FF66` |
| Error | Red | `#FF4466` |
| Warning | Orange | `#FFAA00` |

## 5.2 Typography

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Logo | Inter | Bold | 24px |
| Page Title | Inter | Semibold | 24px |
| Section Title | Inter | Semibold | 18px |
| Card Title | Inter | Semibold | 16px |
| Body Text | Inter | Regular | 14px |
| Secondary Text | Inter | Regular | 12px |
| Button Text | Inter | Medium | 14px |
| Badge Text | Inter | Medium | 12px |

## 5.3 Spacing

| Name | Value |
|------|-------|
| xs | 4px |
| sm | 8px |
| md | 16px |
| lg | 24px |
| xl | 32px |
| 2xl | 48px |

## 5.4 Border Radius

| Element | Radius |
|---------|--------|
| Buttons | 8px |
| Cards | 12px |
| Input Fields | 8px |
| Message Bubbles | 16px |
| Avatars | 50% (circle) |
| Badges | 16px (pill) |

## 5.5 Shadows

Light Mode:
```css
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
```

Dark Mode:
```css
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
```

---

# 6. Screens & Components

## 6.1 Screen List

| Screen | Route | Description |
|--------|-------|-------------|
| Home | `/` | Your Pods + Direct messages overview |
| Explore | `/explore` | Discover and search pods |
| Pod Chat | `/pod/:id` | Pod group chat |
| Direct Messages | `/direct` | DM conversation list |
| DM Chat | `/direct/:address` | 1-on-1 conversation |
| Profile | `/profile` | User profile + linked wallets |
| Settings | `/settings` | App settings |
| Create Pod | `/create-pod` | Pod creation flow |
| View Members | `/pod/:id/members` | Pod member list (modal) |

## 6.2 Layout Structure

### Desktop Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Header: Logo | Wallet Address | Balance | Theme Toggle | Avatar │
├────────────┬────────────────────────────────────────────────────┤
│            │                                                    │
│  Sidebar   │                    Main Content                    │
│            │                                                    │
│  - Home    │                                                    │
│  - Explore │                                                    │
│  - Direct  │                                                    │
│  - Profile │                                                    │
│  - Settings│                                                    │
│            │                                                    │
│            │                                                    │
│ [Network]  │                                                    │
└────────────┴────────────────────────────────────────────────────┘
```

### Mobile Layout

```
┌─────────────────────────────────┐
│ Header: Menu | Logo | Theme | ○ │
├─────────────────────────────────┤
│                                 │
│                                 │
│         Main Content            │
│                                 │
│                                 │
│                                 │
│                                 │
├─────────────────────────────────┤
│ Home | Explore | Direct | Profile│
└─────────────────────────────────┘
```

## 6.3 Component Specifications

### Header Component

**Desktop:**
- Left: "QFLink" logo
- Right: Wallet address (truncated: `0x7f...a91`), Balance badge (`52.3K QF`), Theme toggle, Avatar

**Mobile:**
- Left: Hamburger menu
- Center: "QFLink" logo
- Right: Theme toggle, Avatar

### Sidebar Component (Desktop Only)

- Navigation items with icons:
  - Home (house icon)
  - Explore (people icon)
  - Direct (chat bubble icon)
  - Profile (person icon)
  - Settings (gear icon)
- Active state: Cyan background, cyan text
- Bottom: Network indicator ("Local Devnet" with green dot)

### Bottom Navigation (Mobile Only)

- 4 tabs: Home, Explore, Direct, Profile
- Active state: Cyan icon and text
- Settings accessible via hamburger menu

### Pod Card Component

**Home View (Compact):**
```
┌─────────────────────────────────────┐
│ Krakens                         →   │
│ 500K+ Holders                       │
│                                     │
│ [======progress bar======]          │
│ 210k to go                    2m    │
└─────────────────────────────────────┘
```

**Explore View (Full):**
```
┌─────────────────────────────────────┐
│ ☆ Featured                          │
│                                     │
│ Krakens                             │
│ Elite QF holders discussing alpha   │
│ and market strategies               │
│                                     │
│ Requirement          Members        │
│ 500K+ QF Holders     👥 127         │
│                                     │
│ [      View Pod (cyan button)     ] │
└─────────────────────────────────────┘
```

### Message Bubble Component

**Other User's Message (Left):**
```
┌─────────────────────────────────────┐
│ CryptoWhale                         │
│ ┌──────────────────┐                │
│ │ GM everyone      │ (dark bubble)  │
│ └──────────────────┘                │
│ 9:42 AM                             │
└─────────────────────────────────────┘
```

**Your Message (Right):**
```
┌─────────────────────────────────────┐
│                                     │
│      ┌──────────────────────────┐   │
│      │ GM! Ready for today's    │   │
│      │ action                   │   │
│      └──────────────────────────┘   │
│                          9:43 AM    │
└─────────────────────────────────────┘
```
(Cyan bubble, dark text)

### Direct Message Preview Component

```
┌─────────────────────────────────────┐
│ ○  HW Media                         │
│    Hey, when moon?                  │
│    5m                               │
└─────────────────────────────────────┘
```

Selected state: Cyan background, cyan text for name

### Profile Card Component

```
┌─────────────────────────────────────┐
│        ┌────┐                       │
│        │ ○  │  (cyan avatar)        │
│        └────┘                       │
│                                     │
│        QF Holder                    │
│        Member since February 2026   │
│        📋 0x7f...a91               │
│                                     │
│  QF Balance          Pods Joined    │
│  52.3K QF            3              │
└─────────────────────────────────────┘
```

### Pod Info Sidebar Component

```
┌─────────────────────────────────────┐
│ POD INFO                            │
│                                     │
│ About                               │
│ Krakens pod for 500K+ QF holders    │
│                                     │
│ Requirements                        │
│ Requires 500K QF aggregated balance │
│                                     │
│ Members                             │
│ 127 holders                         │
│                                     │
│ [    ⟷ Invite Link    ]            │
│ [    👥 View Members   ]            │
│ [    ← Leave Pod (red) ]            │
└─────────────────────────────────────┘
```

### Balance Progress Bar Component

```
You hold 290K QF                210K to go
[████████████████░░░░░░░░]
```
- Cyan fill for current balance
- Gray for remaining

### Category Filter Pills

```
[ All ] [ Trading ] [ Builders ] [ NFTs ] [ Macro ] [ Meme ]
```
- Active: Cyan background, dark text
- Inactive: Transparent background, border, text color

### Featured Badge

```
☆ Featured
```
- Cyan background, dark text, pill shape

### Unread Indicator

- Cyan dot with number (e.g., "3", "12")
- Positioned top-right of pod card or conversation

### Network Indicator

```
● Local Devnet
```
- Green dot = connected
- Yellow dot = connecting
- Red dot = disconnected

---

## 6.4 Screen Specifications

### Screen: Home (`/`)

**Purpose:** Dashboard showing user's pods and recent DMs

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Your Pods                                                   │
│                                                             │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │ Krakens     │ │ Whales  ●3  │ │ Chefs   ●12 │            │
│ │ 500K+       │ │ 250K+       │ │ 10+         │            │
│ │ progress... │ │ last msg... │ │ last msg... │            │
│ └─────────────┘ └─────────────┘ └─────────────┘            │
│                                                             │
│ Direct                                                      │
│                                                             │
│ ┌─────────────┐ ┌─────────────┐                            │
│ │ ○ HW Media  │ │ ○ Sir Bool  │                            │
│ │ Hey, when...│ │ Hey, when...│                            │
│ │ 5m          │ │ 1m          │                            │
│ └─────────────┘ └─────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

**States:**
- Loading: Skeleton cards
- No pods: "You don't have enough QF to join any pods. Get more QF to unlock exclusive communities."
- No DMs: "No conversations yet. Find someone in a pod and start chatting!"

### Screen: Explore (`/explore`)

**Purpose:** Discover and search for pods

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Explore Pods                                                │
│ Discover gated communities based on your QF holdings        │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔍 Search pods by name, token, or category...          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [All] [Trading] [Builders] [NFTs] [Macro] [Meme]           │
│                                                             │
│ ┌─────────────────┐ ┌─────────────────┐ ┌────────────────┐ │
│ │ ☆ Featured      │ │ ☆ Featured      │ │ Chefs          │ │
│ │ Krakens         │ │ Whales          │ │ Active traders │ │
│ │ Elite QF...     │ │ High-tier...    │ │ sharing...     │ │
│ │ 500K+ | 127     │ │ 250K+ | 453     │ │ 10+ | 1247     │ │
│ │ [View Pod]      │ │ [View Pod]      │ │ [View Pod]     │ │
│ └─────────────────┘ └─────────────────┘ └────────────────┘ │
│                                                             │
│ ┌─────────────────┐ ┌─────────────────┐ ┌────────────────┐ │
│ │ Dolphins        │ │ QF Builders     │ │ DeFi Degens    │ │
│ │ Growing QF...   │ │ Developers...   │ │ High-risk...   │ │
│ └─────────────────┘ └─────────────────┘ └────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Search by pod name, token, or category
- Filter by category
- Default pods marked as "Featured"
- Shows requirement and member count
- "View Pod" button (disabled if user doesn't meet requirements)

### Screen: Pod Chat (`/pod/:id`)

**Purpose:** Group chat within a pod

**Desktop Layout:**
```
┌─────────────┬───────────────────────────────────┬─────────────┐
│ YOUR PODS   │ Krakens              👥 127       │ POD INFO    │
│             │ 500K+ Holders                     │             │
│ Krakens  ←  │                                   │ About       │
│ 500K+       │ You hold 290K QF    210K to go   │ Krakens pod │
│             │ [========progress=======]         │ for 500K+   │
│ Whales  ●3  │                                   │             │
│ 250K+       │ CryptoWhale                       │ Requirements│
│             │ ┌─────────────┐                   │ Requires    │
│ Chefs   ●12 │ │ GM everyone │                   │ 500K QF     │
│ 10+         │ └─────────────┘                   │             │
│             │ 9:42 AM                           │ Members     │
│             │                                   │ 127 holders │
│             │        ┌──────────────────────┐   │             │
│             │        │ GM! Ready for today's│   │ [Invite]    │
│             │        │ action               │   │ [Members]   │
│             │        └──────────────────────┘   │ [Leave Pod] │
│             │                       9:43 AM     │             │
│             │                                   │             │
│             │ ┌─────────────────────────────┐   │             │
│             │ │ Type a message...        ➤ │   │             │
│             │ └─────────────────────────────┘   │             │
└─────────────┴───────────────────────────────────┴─────────────┘
```

**Mobile Layout:**
```
┌─────────────────────────────────────┐
│ ← Krakens            👥 127   👥    │
│   500K+ Holders                     │
├─────────────────────────────────────┤
│ You hold 290K QF        210K to go  │
│ [===========progress==========]     │
├─────────────────────────────────────┤
│                                     │
│ CryptoWhale                         │
│ ┌─────────────┐                     │
│ │ GM everyone │                     │
│ └─────────────┘                     │
│ 9:42 AM                             │
│                                     │
│        ┌──────────────────────┐     │
│        │ GM! Ready for today's│     │
│        │ action               │     │
│        └──────────────────────┘     │
│                       9:43 AM       │
│                                     │
├─────────────────────────────────────┤
│ Type a message...              ➤    │
├─────────────────────────────────────┤
│ Home | Explore | Direct | Profile   │
└─────────────────────────────────────┘
```

**Features:**
- Pod list sidebar (desktop) or back navigation (mobile)
- Balance progress bar (for default pods)
- Real-time messages
- Pod info panel with invite/members/leave options
- "Leave Pod" only visible for custom pods
- "End-to-end encrypted" badge for DMs

### Screen: Direct Messages (`/direct`)

**Purpose:** List of DM conversations

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ DIRECT MESSAGES                                        ←    │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ○  HW Media                                             │ │
│ │    Hey, when moon?                                      │ │
│ │    5m                                                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ○  Sir Boolean                                  (cyan)  │ │
│ │    Hey, when qfpad?                                     │ │
│ │    1m                                                   │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Screen: DM Chat (`/direct/:address`)

**Purpose:** 1-on-1 encrypted conversation

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Sir Boolean                           🔒 End-to-end encrypted│
│ QF Builder                                                  │
│ ● Online                                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌────────────────┐                                          │
│ │ Quick question │                                          │
│ └────────────────┘                                          │
│ 3:42 PM                                                     │
│                                                             │
│                    ┌──────────────────┐                     │
│                    │ Sure, what's up? │                     │
│                    └──────────────────┘                     │
│                              3:43 PM                        │
│                                                             │
│ ┌──────────────────┐                                        │
│ │ Hey, when qfpad? │                                        │
│ └──────────────────┘                                        │
│ 3:44 PM                                                     │
│                                                             │
│                    ┌───────────────────────────────┐        │
│                    │ Working on it! Should be      │        │
│                    │ ready Q2                      │        │
│                    └───────────────────────────────┘        │
│                                          3:45 PM            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Type a message...                                      ➤    │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- User profile header (name, role, online status)
- "End-to-end encrypted" badge
- Message history
- Character counter (280 limit)

### Screen: Profile (`/profile`)

**Purpose:** View and manage user profile

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Profile                                                     │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │            ┌────────┐                                   │ │
│ │            │   ○    │  (cyan avatar)                    │ │
│ │            └────────┘                                   │ │
│ │                                                         │ │
│ │         QF Holder                        [Edit]         │ │
│ │         Member since February 2026                      │ │
│ │         📋 0x7f...a91                                  │ │
│ │                                                         │ │
│ │  QF Balance              Pods Joined                    │ │
│ │  52.3K QF                3                              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Linked Wallets (2/5)                                        │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 0x7f...a91 (Primary)                      52,300 QF     │ │
│ │ 0x3b...c42                                12,500 QF     │ │
│ │                                                         │ │
│ │ [+ Link Another Wallet]                                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Aggregate Balance: 64,800 QF                                │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Editable display name
- Primary wallet address (copy button)
- Balance and pods joined stats
- Linked wallets section with individual balances
- "Link Another Wallet" button (if < 5 linked)
- Aggregate balance display

### Screen: Settings (`/settings`)

**Purpose:** App configuration

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Settings                                                    │
│                                                             │
│ Network                                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ● Local Devnet                                     ✓    │ │
│ │   ws://127.0.0.1:9944                                   │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ ○ Mainnet                                               │ │
│ │   wss://mainnet.qfnode.net                              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Appearance                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Theme                                                   │ │
│ │ ○ Light  ○ Dark  ● System                              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Session                                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Connected Wallet                                        │ │
│ │ 0x7f...a91 via Talisman                                │ │
│ │                                                         │ │
│ │ [Disconnect Wallet]                                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ About                                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ QFLink v1.0.0                                           │ │
│ │ Built on QF Network                                     │ │
│ │                                                         │ │
│ │ [View on GitHub]  [QF Network]                          │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Screen: Create Pod (`/create-pod`)

**Purpose:** Multi-step pod creation flow

**Step 1: Select Tier**
```
┌─────────────────────────────────────────────────────────────┐
│ Create a Pod                                                │
│ Step 1 of 3: Choose Your Plan                               │
│                                                             │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│ │ Standard        │ │ Premium         │ │ Elite           │ │
│ │                 │ │                 │ │                 │ │
│ │ 500 QF          │ │ 5,000 QF        │ │ 50,000 QF       │ │
│ │                 │ │                 │ │                 │ │
│ │ • 100 members   │ │ • 250 members   │ │ • Unlimited     │ │
│ │ • Basic features│ │ • All Standard  │ │ • All Premium   │ │
│ │                 │ │ • Priority      │ │ • Featured      │ │
│ │                 │ │   support       │ │   placement     │ │
│ │                 │ │                 │ │ • Verified badge│ │
│ │                 │ │                 │ │                 │ │
│ │ [Select]        │ │ [Select]        │ │ [Select]        │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Step 2: Pod Details**
```
┌─────────────────────────────────────────────────────────────┐
│ Create a Pod                                                │
│ Step 2 of 3: Pod Details                                    │
│                                                             │
│ Pod Name                                                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ My Awesome Pod                                          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Description                                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ A community for...                                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Category                                                    │
│ [Trading ▼]                                                 │
│                                                             │
│ Join Method                                                 │
│ ○ Balance-Based (require token holdings)                    │
│ ● Invite-Only (generate invite links)                       │
│                                                             │
│ [If Balance-Based selected:]                                │
│ Token                                                       │
│ [QF (Native) ▼] or [Enter PSP22 address]                   │
│                                                             │
│ Minimum Balance                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 10,000                                                  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Back]                                        [Continue]    │
└─────────────────────────────────────────────────────────────┘
```

**Step 3: Confirm & Pay**
```
┌─────────────────────────────────────────────────────────────┐
│ Create a Pod                                                │
│ Step 3 of 3: Confirm & Pay                                  │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Pod Summary                                             │ │
│ │                                                         │ │
│ │ Name:        My Awesome Pod                             │ │
│ │ Tier:        Premium                                    │ │
│ │ Max Members: 250                                        │ │
│ │ Join Method: Balance-Based                              │ │
│ │ Requirement: 10,000 QF                                  │ │
│ │ Category:    Trading                                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Fee Breakdown                                           │ │
│ │                                                         │ │
│ │ Creation Fee:     5,000 QF                              │ │
│ │ → Treasury (25%): 1,250 QF                              │ │
│ │ → Burned (75%):   3,750 QF                              │ │
│ │                                                         │ │
│ │ Your Balance:     52,300 QF                             │ │
│ │ After Creation:   47,300 QF                             │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Back]                                    [Create Pod]      │
└─────────────────────────────────────────────────────────────┘
```

### Modal: Connect Wallet

```
┌─────────────────────────────────────────────────────────────┐
│ Connect Wallet                                         ✕    │
│                                                             │
│ Select a wallet to connect:                                 │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🦊 Talisman                                        →    │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔴 Polkadot.js                                     →    │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📱 SubWallet                                       →    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Don't have a wallet?                                        │
│ [Get Talisman] [Get SubWallet]                              │
└─────────────────────────────────────────────────────────────┘
```

### Modal: Select Account

```
┌─────────────────────────────────────────────────────────────┐
│ Select Account                                         ✕    │
│                                                             │
│ Choose an account from Talisman:                            │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ○ My Main Wallet                                        │ │
│ │   0x7f4a...3a91                                         │ │
│ │   Balance: 52,300 QF                                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ○ Trading Wallet                                        │ │
│ │   0x3b2c...c42f                                         │ │
│ │   Balance: 12,500 QF                                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                                            [Connect]        │
└─────────────────────────────────────────────────────────────┘
```

### Modal: Link Wallet

```
┌─────────────────────────────────────────────────────────────┐
│ Link a Wallet                                          ✕    │
│                                                             │
│ Link another wallet to aggregate your balance.              │
│                                                             │
│ Step 1: Enter the wallet address                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 0x...                                                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Step 2: Sign a message from that wallet                     │
│ You'll need to sign this message to prove ownership:        │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ "I authorize linking this wallet to 0x7f...a91 on       │ │
│ │  QFLink. Timestamp: 1708444800"                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Copy Message]                                              │
│                                                             │
│ Step 3: Paste the signature                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 0x...                                                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                                         [Link Wallet]       │
└─────────────────────────────────────────────────────────────┘
```

### Modal: View Members

```
┌─────────────────────────────────────────────────────────────┐
│ Krakens Members (127)                                  ✕    │
│                                                             │
│ 🔍 Search members...                                        │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ○ CryptoWhale                              1,250,000 QF │ │
│ │   0x8a2b...f91c                                         │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ ○ TokenSurfer                                892,000 QF │ │
│ │   0x2c4d...a82e                                         │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ ○ DeFiKing                                   756,000 QF │ │
│ │   0x5f1a...b73d                                         │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ ○ ChartMaster                                623,000 QF │ │
│ │   0x9e3c...d54f                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Showing 4 of 127 members                      [Load More]   │
└─────────────────────────────────────────────────────────────┘
```

### Modal: Invite Link

```
┌─────────────────────────────────────────────────────────────┐
│ Invite to Pod                                          ✕    │
│                                                             │
│ Share this link to invite others to your pod:               │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ https://qflink.app/invite/abc123def456...          📋  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ⚠️ This link can be used by anyone. Share carefully.        │
│                                                             │
│ [Generate New Link]                          [Done]         │
└─────────────────────────────────────────────────────────────┘
```

---

# 7. Features Specification

## 7.1 Wallet Connection

**Supported Wallets:**
- Talisman
- Polkadot.js Extension
- SubWallet

**Connection Flow:**
1. User clicks "Connect Wallet"
2. Modal shows available wallet extensions
3. User selects wallet
4. Extension prompts for authorization
5. User selects account from wallet
6. App fetches balance and checks pod eligibility
7. User is auto-joined to eligible default pods
8. Session stored (persists across refreshes)

**Session Management:**
- Session persists until user disconnects
- State synced across browser tabs
- Auto-reconnect on page refresh

## 7.2 Pod Membership

### Default Pod Auto-Join

**On wallet connect or balance change:**
1. Fetch aggregate balance (all linked wallets)
2. Check against default pod thresholds:
   - ≥500,000 QF → Join Krakens
   - ≥250,000 QF → Join Whales
   - ≥10 QF → Join Chefs
3. Add user to all qualifying pods

### Custom Pod Join

**Balance-Based:**
1. User clicks "View Pod" on Explore page
2. App checks aggregate balance for required token
3. If sufficient, user can join
4. If insufficient, show error with required vs actual balance

**Invite-Only:**
1. User receives invite link
2. Clicks link, app validates invite code
3. If valid and pod has capacity, user joins
4. If invalid or full, show error

### Daily Balance Check (On-Chain Cron)

**Triggered once per 24 hours:**
1. Iterate through all pod memberships
2. For each member, fetch current aggregate balance
3. If below threshold, remove from pod
4. Emit `MemberLeft` event with reason `BalanceCheck`

## 7.3 Messaging

### Encryption (DMs)

**Using TweetNaCl (nacl.box):**

**Sending:**
1. Sender fetches recipient's public key from contract
2. Generate random 24-byte nonce
3. Encrypt message: `nacl.box(message, nonce, recipientPublicKey, senderSecretKey)`
4. Store encrypted bytes + nonce on-chain

**Receiving:**
1. Fetch encrypted message + nonce from contract
2. Decrypt: `nacl.box.open(encrypted, nonce, senderPublicKey, recipientSecretKey)`
3. Display decrypted message

### Pod Messages

**Same encryption but with shared pod key:**
1. Pod has a shared symmetric key
2. Key distributed to members on join (encrypted per-member)
3. Messages encrypted with shared key
4. All members can decrypt

### Message Constraints

- Max length: 280 characters
- Immutable once sent (no edit/delete)
- Stored fully on-chain
- Real-time updates via subscription

## 7.4 Linked Wallets

**Linking Process:**
1. User enters address of wallet to link
2. App generates message to sign: `"I authorize linking this wallet to {primary} on QFLink. Timestamp: {timestamp}"`
3. User signs message with wallet to link
4. User submits signature to contract
5. Contract verifies signature matches address
6. Wallet added to linked wallets list

**Balance Aggregation:**
- Sum of free balance across all linked wallets
- For custom pods with token requirement, sum of that token across all wallets
- Updated in real-time on balance changes

**Constraints:**
- Maximum 5 linked wallets
- Cannot link wallet already linked to another account
- Can unlink at any time

## 7.5 Pod Creation

**Flow:**
1. User selects tier (Standard/Premium/Elite)
2. User enters pod details:
   - Name (required, 3-50 chars)
   - Description (required, 10-280 chars)
   - Category (required, select from list)
   - Join method (Balance-Based or Invite-Only)
   - If Balance-Based: Token address + minimum balance
3. User reviews summary and fee breakdown
4. User confirms and signs transaction
5. Contract:
   - Verifies user has sufficient balance for fee
   - Transfers 25% to treasury
   - Burns 75%
   - Creates pod
   - Adds creator as first member
6. User redirected to new pod

**Fee Structure:**

| Tier | Fee | Treasury (25%) | Burned (75%) |
|------|-----|----------------|--------------|
| Standard | 500 QF | 125 QF | 375 QF |
| Premium | 5,000 QF | 1,250 QF | 3,750 QF |
| Elite | 50,000 QF | 12,500 QF | 37,500 QF |

## 7.6 Theme System

**Modes:**
- Light
- Dark
- System (follows OS preference)

**Implementation:**
- Stored in localStorage
- Applied via CSS variables and Tailwind dark mode
- Synced across tabs

---

# 8. Data Models

## 8.1 Frontend Types

```typescript
// Network
type Network = 'local' | 'mainnet';

interface NetworkConfig {
  id: Network;
  name: string;
  rpcUrl: string;
  explorerUrl?: string;
}

// Wallet
interface WalletAccount {
  address: string;
  name?: string;
  source: 'talisman' | 'polkadot-js' | 'subwallet';
}

interface LinkedWallet {
  address: string;
  balance: bigint;
  isPrimary: boolean;
}

interface UserProfile {
  primaryWallet: string;
  displayName?: string;
  linkedWallets: LinkedWallet[];
  aggregateBalance: bigint;
  publicKey: Uint8Array;
  createdAt: number;
}

// Pods
type PodTier = 'standard' | 'premium' | 'elite';
type JoinMethod = 'balance' | 'invite';
type PodCategory = 'trading' | 'builders' | 'nfts' | 'macro' | 'meme';

interface DefaultPod {
  id: number; // 0, 1, 2
  name: string;
  minBalance: bigint;
  maxBalance?: bigint;
  description: string;
  memberCount: number;
}

interface CustomPod {
  id: number;
  name: string;
  description: string;
  creator: string;
  createdAt: number;
  tier: PodTier;
  maxMembers: number;
  memberCount: number;
  joinMethod: JoinMethod;
  tokenAddress?: string; // For balance-based
  minBalance?: bigint;
  category: PodCategory;
  isActive: boolean;
}

type Pod = DefaultPod | CustomPod;

interface PodMember {
  address: string;
  displayName?: string;
  balance: bigint;
  joinedAt: number;
}

// Messages
interface EncryptedMessage {
  id: number;
  sender: string;
  encryptedContent: Uint8Array;
  nonce: Uint8Array;
  timestamp: number;
}

interface DecryptedMessage {
  id: number;
  sender: string;
  senderName?: string;
  content: string;
  timestamp: number;
  isMine: boolean;
}

interface Conversation {
  address: string;
  displayName?: string;
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount: number;
}

// UI State
type Theme = 'light' | 'dark' | 'system';
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
```

## 8.2 Contract Types (Rust)

```rust
use ink::prelude::{string::String, vec::Vec};
use ink::primitives::AccountId;

pub type PodId = u64;
pub type MessageId = u64;
pub type Timestamp = u64;
pub type Balance = u128;

#[derive(scale::Encode, scale::Decode, Clone)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum PodTier {
    Standard,
    Premium,
    Elite,
}

#[derive(scale::Encode, scale::Decode, Clone)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum JoinMethod {
    BalanceBased,
    InviteOnly,
}

#[derive(scale::Encode, scale::Decode, Clone)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum PodCategory {
    Trading,
    Builders,
    NFTs,
    Macro,
    Meme,
}

#[derive(scale::Encode, scale::Decode, Clone)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum LeaveReason {
    Voluntary,
    BalanceCheck,
    Kicked,
}

#[derive(scale::Encode, scale::Decode, Clone)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct DefaultPod {
    pub name: String,
    pub min_balance: Balance,
    pub max_balance: Option<Balance>,
    pub description: String,
    pub member_count: u32,
}

#[derive(scale::Encode, scale::Decode, Clone)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct Pod {
    pub id: PodId,
    pub name: String,
    pub description: String,
    pub creator: AccountId,
    pub created_at: Timestamp,
    pub tier: PodTier,
    pub max_members: u32,
    pub member_count: u32,
    pub join_method: JoinMethod,
    pub token_address: Option<AccountId>,
    pub min_balance: Option<Balance>,
    pub category: PodCategory,
    pub is_active: bool,
}

#[derive(scale::Encode, scale::Decode, Clone)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct UserProfile {
    pub display_name: Option<String>,
    pub primary_wallet: AccountId,
    pub created_at: Timestamp,
}

#[derive(scale::Encode, scale::Decode, Clone)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct EncryptedMessage {
    pub sender: AccountId,
    pub encrypted_content: Vec<u8>,
    pub nonce: [u8; 24],
    pub timestamp: Timestamp,
}
```

---

# 9. API & Contract Interfaces

## 9.1 Frontend API Layer

```typescript
// src/lib/api/pods.ts

import { ApiPromise } from '@polkadot/api';
import { ContractPromise } from '@polkadot/api-contract';

export class PodsAPI {
  private contract: ContractPromise;
  
  constructor(api: ApiPromise, contractAddress: string, abi: any) {
    this.contract = new ContractPromise(api, abi, contractAddress);
  }
  
  // Read methods
  async getDefaultPods(): Promise<DefaultPod[]>;
  async getPod(podId: number): Promise<Pod | null>;
  async getUserPods(address: string): Promise<number[]>;
  async getPodMembers(podId: number, offset: number, limit: number): Promise<PodMember[]>;
  async isMember(podId: number, address: string): Promise<boolean>;
  async canJoin(podId: number, address: string): Promise<boolean>;
  
  // Write methods
  async createPod(params: CreatePodParams, signer: Signer): Promise<number>;
  async joinPod(podId: number, signer: Signer): Promise<void>;
  async joinWithInvite(podId: number, inviteCode: string, signer: Signer): Promise<void>;
  async leavePod(podId: number, signer: Signer): Promise<void>;
  async generateInvite(podId: number, signer: Signer): Promise<string>;
}

// src/lib/api/messages.ts

export class MessagesAPI {
  private contract: ContractPromise;
  
  constructor(api: ApiPromise, contractAddress: string, abi: any) {
    this.contract = new ContractPromise(api, abi, contractAddress);
  }
  
  // Read methods
  async getDMs(userA: string, userB: string, offset: number, limit: number): Promise<EncryptedMessage[]>;
  async getPodMessages(podId: number, offset: number, limit: number): Promise<EncryptedMessage[]>;
  async getConversations(address: string): Promise<string[]>;
  
  // Write methods
  async sendDM(recipient: string, encryptedContent: Uint8Array, nonce: Uint8Array, signer: Signer): Promise<number>;
  async sendPodMessage(podId: number, encryptedContent: Uint8Array, nonce: Uint8Array, signer: Signer): Promise<number>;
  
  // Subscriptions
  subscribeToDMs(userA: string, userB: string, callback: (msg: EncryptedMessage) => void): () => void;
  subscribeToPodMessages(podId: number, callback: (msg: EncryptedMessage) => void): () => void;
}

// src/lib/api/wallets.ts

export class WalletsAPI {
  private contract: ContractPromise;
  
  constructor(api: ApiPromise, contractAddress: string, abi: any) {
    this.contract = new ContractPromise(api, abi, contractAddress);
  }
  
  // Read methods
  async getProfile(address: string): Promise<UserProfile | null>;
  async getLinkedWallets(address: string): Promise<string[]>;
  async getAggregateBalance(address: string): Promise<bigint>;
  async getAggregateTokenBalance(address: string, tokenAddress: string): Promise<bigint>;
  async getPublicKey(address: string): Promise<Uint8Array | null>;
  
  // Write methods
  async register(displayName: string | null, publicKey: Uint8Array, signer: Signer): Promise<void>;
  async setDisplayName(name: string, signer: Signer): Promise<void>;
  async linkWallet(walletToLink: string, signature: Uint8Array, message: Uint8Array, signer: Signer): Promise<void>;
  async unlinkWallet(wallet: string, signer: Signer): Promise<void>;
}
```

## 9.2 Encryption Utilities

```typescript
// src/lib/crypto.ts

import nacl from 'tweetnacl';
import { encodeUTF8, decodeUTF8, encodeBase64, decodeBase64 } from 'tweetnacl-util';

export class CryptoUtils {
  // Generate keypair for new user
  static generateKeyPair(): { publicKey: Uint8Array; secretKey: Uint8Array } {
    return nacl.box.keyPair();
  }
  
  // Encrypt message for DM
  static encryptDM(
    message: string,
    recipientPublicKey: Uint8Array,
    senderSecretKey: Uint8Array
  ): { encrypted: Uint8Array; nonce: Uint8Array } {
    const messageBytes = decodeUTF8(message);
    const nonce = nacl.randomBytes(24);
    const encrypted = nacl.box(messageBytes, nonce, recipientPublicKey, senderSecretKey);
    return { encrypted, nonce };
  }
  
  // Decrypt DM
  static decryptDM(
    encrypted: Uint8Array,
    nonce: Uint8Array,
    senderPublicKey: Uint8Array,
    recipientSecretKey: Uint8Array
  ): string | null {
    const decrypted = nacl.box.open(encrypted, nonce, senderPublicKey, recipientSecretKey);
    if (!decrypted) return null;
    return encodeUTF8(decrypted);
  }
  
  // Encrypt for pod (symmetric)
  static encryptPodMessage(
    message: string,
    sharedKey: Uint8Array
  ): { encrypted: Uint8Array; nonce: Uint8Array } {
    const messageBytes = decodeUTF8(message);
    const nonce = nacl.randomBytes(24);
    const encrypted = nacl.secretbox(messageBytes, nonce, sharedKey);
    return { encrypted, nonce };
  }
  
  // Decrypt pod message
  static decryptPodMessage(
    encrypted: Uint8Array,
    nonce: Uint8Array,
    sharedKey: Uint8Array
  ): string | null {
    const decrypted = nacl.secretbox.open(encrypted, nonce, sharedKey);
    if (!decrypted) return null;
    return encodeUTF8(decrypted);
  }
}
```

---

# 10. User Flows

## 10.1 First-Time User Flow

```
┌─────────────────┐
│   Land on App   │
│   (no wallet)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ "Connect Wallet"│
│    Button       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Select Wallet   │
│ (Talisman, etc) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Authorize in    │
│ Extension       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Select Account  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generate Keys   │
│ (if new user)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Set Display     │
│ Name (optional) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Register        │
│ On-Chain        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Check Balance   │
│ Auto-Join Pods  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Home Screen     │
│ (Your Pods)     │
└─────────────────┘
```

## 10.2 Send DM Flow

```
┌─────────────────┐
│ Find User       │
│ (in pod or      │
│  search)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Click to DM     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Fetch Recipient │
│ Public Key      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Type Message    │
│ (280 char max)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Click Send      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Encrypt with    │
│ TweetNaCl       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Submit TX       │
│ (sign & send)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ TX Confirmed    │
│ (~100ms)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Message Appears │
│ in Chat         │
└─────────────────┘
```

## 10.3 Create Custom Pod Flow

```
┌─────────────────┐
│ Click "Create   │
│ Pod" Button     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Step 1:         │
│ Select Tier     │
│ (500/5K/50K QF) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Step 2:         │
│ Enter Details   │
│ - Name          │
│ - Description   │
│ - Category      │
│ - Join Method   │
│ - Token/Balance │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Step 3:         │
│ Review Summary  │
│ & Fee Breakdown │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Click "Create"  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Sign TX         │
│ (fee deducted)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Contract:       │
│ - 25% treasury  │
│ - 75% burned    │
│ - Pod created   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Redirect to     │
│ New Pod         │
└─────────────────┘
```

## 10.4 Link Wallet Flow

```
┌─────────────────┐
│ Go to Profile   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Click "Link     │
│ Another Wallet" │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Enter Wallet    │
│ Address         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ App Generates   │
│ Sign Message    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Switch to       │
│ Other Wallet    │
│ in Extension    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Sign Message    │
│ with Other      │
│ Wallet          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Paste Signature │
│ Back in App     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Submit TX       │
│ (verify + link) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Wallet Linked!  │
│ Balance Updated │
└─────────────────┘
```

---

# 11. Development Guide

## 11.1 Prerequisites

```bash
# Node.js 18+
node --version  # v18.x or higher

# pnpm (recommended)
npm install -g pnpm

# Rust (for contracts)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup default stable
rustup target add wasm32-unknown-unknown

# polkatool
cargo install --git https://github.com/paritytech/polkavm.git --tag v0.21.0 polkatool
```

## 11.2 Local Development Setup

```bash
# 1. Clone QF solochain for local devnet
git clone https://github.com/QuantumFusion-network/qf-solochain.git
cd qf-solochain
cargo build --release

# 2. Run local devnet
./target/release/qf-node --dev --state-pruning archive
# Exposes ws://127.0.0.1:9944

# 3. In another terminal, clone QFLink
git clone <qflink-repo>
cd qflink

# 4. Install dependencies
pnpm install

# 5. Copy environment file
cp .env.example .env.local

# 6. Start development server
pnpm dev
```

## 11.3 Environment Variables

```bash
# .env.local (development)
VITE_DEFAULT_NETWORK=local
VITE_LOCAL_RPC=ws://127.0.0.1:9944
VITE_MAINNET_RPC=wss://mainnet.qfnode.net

# Contract addresses (update after deployment)
VITE_PODS_CONTRACT=
VITE_MESSAGES_CONTRACT=
VITE_WALLETS_CONTRACT=
VITE_CRON_CONTRACT=

# .env.production
VITE_DEFAULT_NETWORK=mainnet
VITE_MAINNET_RPC=wss://mainnet.qfnode.net
VITE_PODS_CONTRACT=<deployed-address>
VITE_MESSAGES_CONTRACT=<deployed-address>
VITE_WALLETS_CONTRACT=<deployed-address>
VITE_CRON_CONTRACT=<deployed-address>
```

## 11.4 Dev Accounts (Local Devnet)

| Name | Address | Seed | Balance |
|------|---------|------|---------|
| Alice | 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY | //Alice | 1,000,000+ QF |
| Bob | 5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty | //Bob | 1,000,000+ QF |
| Charlie | 5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y | //Charlie | 1,000,000+ QF |

**Testing Tip:** Transfer different amounts to different accounts to test pod thresholds.

## 11.5 Building Contracts

```bash
# Navigate to contracts directory
cd contracts

# Build all contracts
./build.sh

# Or build individually
./build_polkavm.sh qflink_pods
./build_polkavm.sh qflink_messages
./build_polkavm.sh qflink_wallets
./build_polkavm.sh qflink_cron

# Output files
ls output/
# qflink_pods.polkavm
# qflink_messages.polkavm
# qflink_wallets.polkavm
# qflink_cron.polkavm
```

## 11.6 Deploying Contracts

```bash
# Deploy to local devnet
pnpm deploy:local

# Deploy to mainnet
DEPLOYER_SEED="your seed phrase" pnpm deploy:mainnet

# The deploy script will:
# 1. Connect to RPC
# 2. Deploy each contract
# 3. Initialize default pods
# 4. Output contract addresses
# 5. Update .env file
```

---

# 12. File Structure

```
qflink/
├── contracts/                    # Smart contracts (Rust)
│   ├── qflink_pods/
│   │   ├── Cargo.toml
│   │   └── lib.rs
│   ├── qflink_messages/
│   │   ├── Cargo.toml
│   │   └── lib.rs
│   ├── qflink_wallets/
│   │   ├── Cargo.toml
│   │   └── lib.rs
│   ├── qflink_cron/
│   │   ├── Cargo.toml
│   │   └── lib.rs
│   ├── build.sh
│   └── output/                   # Compiled .polkavm files
│
├── src/
│   ├── main.tsx                  # App entry point
│   ├── App.tsx                   # Root component with routing
│   ├── index.css                 # Global styles + Tailwind
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   └── Layout.tsx
│   │   │
│   │   ├── pods/
│   │   │   ├── PodCard.tsx
│   │   │   ├── PodList.tsx
│   │   │   ├── PodChat.tsx
│   │   │   ├── PodInfo.tsx
│   │   │   ├── PodMembers.tsx
│   │   │   ├── CreatePodModal.tsx
│   │   │   └── InviteModal.tsx
│   │   │
│   │   ├── messages/
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── ConversationCard.tsx
│   │   │   └── ConversationList.tsx
│   │   │
│   │   ├── wallet/
│   │   │   ├── ConnectWalletModal.tsx
│   │   │   ├── SelectAccountModal.tsx
│   │   │   ├── WalletButton.tsx
│   │   │   ├── LinkWalletModal.tsx
│   │   │   └── LinkedWalletsList.tsx
│   │   │
│   │   ├── profile/
│   │   │   ├── ProfileCard.tsx
│   │   │   └── EditProfileModal.tsx
│   │   │
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Modal.tsx
│   │       ├── Badge.tsx
│   │       ├── Avatar.tsx
│   │       ├── ProgressBar.tsx
│   │       ├── CategoryPills.tsx
│   │       ├── NetworkIndicator.tsx
│   │       ├── ThemeToggle.tsx
│   │       └── Skeleton.tsx
│   │
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Explore.tsx
│   │   ├── PodPage.tsx
│   │   ├── DirectMessages.tsx
│   │   ├── DMChat.tsx
│   │   ├── Profile.tsx
│   │   ├── Settings.tsx
│   │   └── CreatePod.tsx
│   │
│   ├── stores/
│   │   ├── wallet.ts             # Wallet connection state
│   │   ├── pods.ts               # Pods state
│   │   ├── messages.ts           # Messages state
│   │   ├── profile.ts            # User profile state
│   │   └── ui.ts                 # UI state (theme, modals)
│   │
│   ├── lib/
│   │   ├── api/
│   │   │   ├── pods.ts           # Pods contract API
│   │   │   ├── messages.ts       # Messages contract API
│   │   │   ├── wallets.ts        # Wallets contract API
│   │   │   └── index.ts          # API exports
│   │   │
│   │   ├── network.ts            # Network configuration
│   │   ├── wallet.ts             # Wallet utilities
│   │   ├── crypto.ts             # Encryption utilities
│   │   ├── format.ts             # Formatting utilities
│   │   └── constants.ts          # App constants
│   │
│   ├── hooks/
│   │   ├── useWallet.ts
│   │   ├── usePods.ts
│   │   ├── useMessages.ts
│   │   ├── useProfile.ts
│   │   └── useTheme.ts
│   │
│   └── types/
│       └── index.ts              # TypeScript types
│
├── public/
│   ├── favicon.ico
│   └── manifest.json             # PWA manifest
│
├── scripts/
│   ├── deploy.ts                 # Contract deployment
│   └── test-connection.ts        # Test RPC connection
│
├── .env.example
├── .env.local
├── .env.production
├── index.html
├── package.json
├── pnpm-lock.yaml
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

# 13. Testing

## 13.1 Test Scenarios

### Wallet Connection
- [ ] Connect with Talisman
- [ ] Connect with Polkadot.js
- [ ] Connect with SubWallet
- [ ] Switch accounts
- [ ] Disconnect wallet
- [ ] Session persistence across refresh
- [ ] Session sync across tabs

### Default Pod Membership
- [ ] User with 600K QF joins all 3 pods automatically
- [ ] User with 300K QF joins Whales and Chefs
- [ ] User with 50K QF joins Chefs only
- [ ] User with 5 QF has no default pod access
- [ ] Balance change triggers membership update

### Custom Pod Creation
- [ ] Create Standard pod (500 QF fee)
- [ ] Create Premium pod (5,000 QF fee)
- [ ] Create Elite pod (50,000 QF fee)
- [ ] Fee split: 25% treasury, 75% burned
- [ ] Balance-based join method works
- [ ] Invite-only join method works

### Messaging
- [ ] Send DM (encrypted)
- [ ] Receive DM (decrypted)
- [ ] Send pod message
- [ ] Receive pod message in real-time
- [ ] 280 character limit enforced
- [ ] Messages persist on-chain

### Linked Wallets
- [ ] Link wallet with signature
- [ ] Unlink wallet
- [ ] Balance aggregation works
- [ ] Max 5 wallets enforced
- [ ] Aggregate balance affects pod access

### Daily Balance Check
- [ ] Cron runs once per 24 hours
- [ ] Users below threshold removed from default pods
- [ ] Users below threshold removed from custom balance-gated pods
- [ ] Events emitted correctly

## 13.2 Test Commands

```bash
# Run unit tests
pnpm test

# Run e2e tests
pnpm test:e2e

# Test contract deployment
pnpm test:deploy

# Test RPC connection
pnpm test:connection
```

---

# 14. Deployment

## 14.1 Contract Deployment Order

1. **qflink_wallets** (no dependencies)
2. **qflink_pods** (depends on wallets for balance checks)
3. **qflink_messages** (depends on pods for membership checks)
4. **qflink_cron** (depends on pods and wallets)

## 14.2 Post-Deployment Steps

1. Initialize default pods (Krakens, Whales, Chefs)
2. Set treasury address
3. Verify contracts on explorer
4. Update frontend environment variables
5. Test all flows on mainnet

## 14.3 Frontend Deployment

```bash
# Build for production
pnpm build

# Preview build
pnpm preview

# Deploy to hosting (e.g., Vercel, Netlify)
# Configure environment variables in hosting dashboard
```

## 14.4 PWA Configuration

```json
// public/manifest.json
{
  "name": "QFLink",
  "short_name": "QFLink",
  "description": "Decentralized messaging for QF holders",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#DADADA",
  "theme_color": "#00FFFF",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

# 15. Future Integrations

## 15.1 QFPad Integration

**When creating a token on QFPad:**
- Option to create a pod simultaneously
- Pod pre-populated with token address
- Creator sets minimum balance requirement
- Pod created before/during presale

**API Hook:**
```typescript
// QFPad calls this after token creation
await qflinkAPI.createPodForToken({
  tokenAddress: newTokenAddress,
  tokenName: tokenName,
  creator: creatorAddress,
  tier: 'standard', // or premium/elite based on QFPad tier
  minBalance: creatorDefinedMinimum,
});
```

## 15.2 QFClash Integration

**Profile Integration:**
- Show QFClash rating on QFLink profile
- Display rank badge (Bronze → Master)
- Show season stats

**Pod Integration:**
- QFClash player pods (by rank tier)
- Challenge players from within QFLink DMs

## 15.3 QFStream Integration

**Profile Integration:**
- Link to creator's QFStream channel
- Show subscriber count

**Pod Integration:**
- Creator-specific pods for subscribers
- Token-gated based on subscription tier

## 15.4 52F Integration

**Pod Example:**
- 52F Holders pod
- Minimum balance: 5,200,000 52F (visible 52 theme)
- Auto-created when 52F launches on QF Network

---

# 16. Appendix

## 16.1 Constants

```typescript
// src/lib/constants.ts

// Default Pods
export const DEFAULT_PODS = {
  KRAKENS: {
    id: 0,
    name: 'Krakens',
    minBalance: 500_000n * 10n ** 18n, // 500K QF
    maxBalance: null,
    description: 'Elite QF holders discussing alpha and market strategies',
  },
  WHALES: {
    id: 1,
    name: 'Whales',
    minBalance: 250_000n * 10n ** 18n, // 250K QF
    maxBalance: 500_000n * 10n ** 18n,
    description: 'High-tier trading discussions and technical analysis',
  },
  CHEFS: {
    id: 2,
    name: 'Chefs',
    minBalance: 10n * 10n ** 18n, // 10 QF
    maxBalance: 250_000n * 10n ** 18n,
    description: 'Active traders sharing insights and staking strategies',
  },
};

// Pod Tiers
export const POD_TIERS = {
  STANDARD: {
    fee: 500n * 10n ** 18n,
    maxMembers: 100,
    treasuryPercent: 25,
    burnPercent: 75,
  },
  PREMIUM: {
    fee: 5_000n * 10n ** 18n,
    maxMembers: 250,
    treasuryPercent: 25,
    burnPercent: 75,
  },
  ELITE: {
    fee: 50_000n * 10n ** 18n,
    maxMembers: Infinity,
    treasuryPercent: 25,
    burnPercent: 75,
  },
};

// Limits
export const LIMITS = {
  MAX_MESSAGE_LENGTH: 280,
  MAX_LINKED_WALLETS: 5,
  MAX_POD_NAME_LENGTH: 50,
  MIN_POD_NAME_LENGTH: 3,
  MAX_POD_DESCRIPTION_LENGTH: 280,
  MIN_POD_DESCRIPTION_LENGTH: 10,
  MAX_DISPLAY_NAME_LENGTH: 30,
};

// Categories
export const POD_CATEGORIES = [
  'trading',
  'builders',
  'nfts',
  'macro',
  'meme',
] as const;

// Networks
export const NETWORKS = {
  local: {
    id: 'local',
    name: 'Local Devnet',
    rpcUrl: 'ws://127.0.0.1:9944',
  },
  mainnet: {
    id: 'mainnet',
    name: 'Mainnet',
    rpcUrl: 'wss://mainnet.qfnode.net',
  },
};
```

## 16.2 Utility Functions

```typescript
// src/lib/format.ts

export function truncateAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatBalance(balance: bigint, decimals = 18, displayDecimals = 2): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = balance / divisor;
  const fraction = balance % divisor;
  
  if (whole >= 1_000_000n) {
    return `${(Number(whole) / 1_000_000).toFixed(displayDecimals)}M`;
  }
  if (whole >= 1_000n) {
    return `${(Number(whole) / 1_000).toFixed(displayDecimals)}K`;
  }
  
  const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, displayDecimals);
  return `${whole}.${fractionStr}`;
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  
  return date.toLocaleDateString();
}

export function formatMessageTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { 
    hour: 'numeric', 
    minute: '2-digit' 
  });
}
```

## 16.3 Error Codes

| Code | Description |
|------|-------------|
| `E001` | Wallet not connected |
| `E002` | Insufficient balance for pod fee |
| `E003` | Insufficient balance to join pod |
| `E004` | Pod is full |
| `E005` | Invalid invite code |
| `E006` | Already a member |
| `E007` | Not a member |
| `E008` | Cannot leave default pod |
| `E009` | Max linked wallets reached |
| `E010` | Invalid signature |
| `E011` | Wallet already linked |
| `E012` | Message too long |
| `E013` | Pod not found |
| `E014` | User not found |
| `E015` | Unauthorized |

## 16.4 Gas Estimates

| Action | Estimated Gas |
|--------|---------------|
| Register user | ~50,000 |
| Create pod | ~100,000 |
| Join pod | ~30,000 |
| Leave pod | ~25,000 |
| Send message | ~40,000 |
| Link wallet | ~35,000 |
| Daily cron (per user) | ~20,000 |

*Note: QF Network has minimal gas costs due to 100ms block times and efficient PolkaVM execution.*

---

# Document Info

**Version:** 1.0.0
**Created:** February 2026
**Author:** QF Team
**Target Completion:** 7 days

---

# Quick Start Checklist

- [ ] Clone repository
- [ ] Set up local devnet (`qf-solochain --dev`)
- [ ] Install dependencies (`pnpm install`)
- [ ] Copy `.env.example` to `.env.local`
- [ ] Build contracts (`./contracts/build.sh`)
- [ ] Deploy contracts (`pnpm deploy:local`)
- [ ] Update `.env.local` with contract addresses
- [ ] Start dev server (`pnpm dev`)
- [ ] Test wallet connection
- [ ] Test default pod auto-join
- [ ] Test messaging
- [ ] Test pod creation
- [ ] Test linked wallets
- [ ] Deploy to mainnet when ready