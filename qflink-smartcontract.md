# QFLink Smart Contracts — Full Implementation Spec for Windsurf

## READ THIS FIRST

You are building three smart contracts for QFLink, a wallet-to-wallet messaging dApp on QF Network. The frontend (React + TypeScript + Vite + Tailwind) is ~85% complete and runs on mock data. Your job is to build the smart contracts and wire them to the existing frontend.

**Do not modify the frontend design, layout, or component structure.** Only touch frontend files to replace mock data with real contract calls.

---

## 1. TECHNOLOGY STACK (NON-NEGOTIABLE)

### QF Network
- Substrate-based L1 blockchain, ~100ms blocks
- Native token: QF, 500M supply, 18 decimals
- Smart contracts via `pallet-revive` (NOT ink!, NOT pallet-contracts)
- Contracts compile to PolkaVM (RISC-V), deployed as `.polkavm` binaries

### RPCs
- Local dev: `ws://127.0.0.1:9944` (run `qf-node --dev --state-pruning archive`)
- Testnet: `wss://test.qfnetwork.xyz`
- Mainnet: `wss://rpc.qfnetwork.xyz`

### Contract Development
- Language: Rust (`no_std`, `no_main`)
- SDK: `qf-polkavm-sdk` v0.2.0 (crate on crates.io)
- Host API: `pallet-revive-uapi` v0.4.0
- Serialization: `parity-scale-codec` v3.7.4 (SCALE encoding)
- Linker: `polkavm-derive` v0.21.0
- Build tool: `polkatool` v0.21.0

### Contract Structure Pattern
Every contract follows this exact pattern (from qf-polkavm-sdk examples):

```rust
#![no_std]
#![no_main]

extern crate alloc;

use alloc::vec::Vec;
use codec::{Decode, Encode};
use pallet_revive_uapi::{
    input, unwrap_output, HostFn, HostFnImpl as api, ReturnFlags, StorageFlags,
};
use qf_polkavm_sdk::prelude::*;

#[export]
pub fn deploy() {
    // Constructor: runs once at deployment
    // Initialize storage here
}

#[export]
pub fn call() {
    // Entry point for all invocations
    // Read calldata, extract 4-byte selector, dispatch to functions
    let call_data_len = api::call_data_size();
    let mut call_data = alloc::vec![0u8; call_data_len as usize];
    api::call_data_copy(&mut call_data, 0);

    if call_data.len() < 4 {
        api::return_value(ReturnFlags::REVERT, b"Input too short");
    }
    let selector: [u8; 4] = call_data[0..4].try_into().unwrap();

    match selector {
        // dispatch to handler functions
        _ => api::return_value(ReturnFlags::REVERT, b"Unknown function"),
    }
}
```

### Cargo.toml Pattern
```toml
[package]
name = "contract-name"
version = "0.1.0"
edition = "2021"
publish = false

[dependencies]
codec = { version = "3.7.4", package = "parity-scale-codec", features = ["derive"], default-features = false }
pallet-revive-uapi = { version = "0.4.0", default-features = false }
polkavm-derive = { version = "0.21.0" }
qf-polkavm-sdk = { version = "0.2.0", features = ["global-allocator", "panic-handler"] }
```

### Build Script (build.sh)
```bash
#!/usr/bin/env bash
set -euo pipefail
TARGET_JSON_PATH=$(polkatool get-target-json-path)
CARGO_TARGET_DIR="$PWD/target"
sed -i 's/"target-pointer-width": "64",/"target-pointer-width": 64,/' $TARGET_JSON_PATH
RUSTFLAGS="--remap-path-prefix=$(pwd)= --remap-path-prefix=${HOME}=~" \
    CARGO_TARGET_DIR=$CARGO_TARGET_DIR \
    cargo +nightly build \
        -Z build-std=core,alloc \
        --target $TARGET_JSON_PATH \
        --release
CRATE=$(grep '^name = ' Cargo.toml | head -1 | sed 's/name = "\(.*\)"/\1/')
polkatool link \
    --strip --run-only-if-newer \
    "$CARGO_TARGET_DIR/riscv64emac-unknown-none-polkavm/release/${CRATE}" \
    -o "${CRATE}.polkavm"
```

### Available Host Functions (use ONLY these)
| Function | Signature | Purpose |
|----------|-----------|---------|
| `api::caller()` | `caller(output: &mut [u8; 20])` | Get caller's 20-byte address |
| `api::address()` | `address(output: &mut [u8; 20])` | Get contract's own address |
| `api::balance()` | `balance(output: &mut [u8; 32])` | Contract's own balance |
| `api::balance_of()` | `balance_of(addr: &[u8; 20], output: &mut [u8; 32])` | Query any address balance |
| `api::set_storage()` | `set_storage(flags: StorageFlags, key: &[u8], value: &[u8]) -> Option<u32>` | Write to storage |
| `api::get_storage()` | `get_storage(flags: StorageFlags, key: &[u8], output: &mut &mut [u8]) -> Result<(), ReturnErrorCode>` | Read from storage |
| `api::deposit_event()` | `deposit_event(topics: &[[u8; 32]], data: &[u8])` | Emit event |
| `api::now()` | `now(output: &mut [u8; 32])` | Block timestamp (seconds) |
| `api::block_number()` | `block_number(output: &mut [u8; 32])` | Current block number |
| `api::value_transferred()` | `value_transferred(output: &mut [u8; 32])` | QF sent with call |
| `api::call_data_size()` | `call_data_size() -> u64` | Input data length |
| `api::call_data_copy()` | `call_data_copy(output: &mut [u8], offset: u32)` | Copy input data |
| `api::return_value()` | `return_value(flags: ReturnFlags, data: &[u8]) -> !` | Return data and stop |
| `api::hash_keccak_256()` | `hash_keccak_256(input: &[u8], output: &mut [u8; 32])` | Keccak hash |
| `api::call()` | `call(flags, callee, ref_time, proof_size, deposit, value, input, output)` | Cross-contract call |

### CRITICAL: Addresses are 20 bytes (EVM-style)
QF Network uses `pallet-revive` which maps Substrate accounts to 20-byte EVM addresses. Users must call `revive.mapAccount()` before interacting with contracts. The frontend must handle this.

### Deployment
Contracts are deployed via the `revive::instantiateWithCode` extrinsic at `portal.qfnetwork.xyz`. The `.polkavm` binary is the deployment artifact.

---

## 2. STORAGE KEY STRATEGY

Since `pallet-revive` provides raw key-value storage (32-byte keys), use this consistent key derivation strategy across all contracts:

```rust
/// Generate a storage key by hashing a prefix + variable parts
fn storage_key(prefix: &[u8], parts: &[&[u8]]) -> [u8; 32] {
    let mut input = Vec::new();
    input.extend_from_slice(prefix);
    for part in parts {
        input.extend_from_slice(part);
    }
    let mut key = [0u8; 32];
    api::hash_keccak_256(&input, &mut key);
    key
}
```

This avoids key collisions and makes storage layout predictable.

---

## 3. CONTRACT #1: `qflink-registry` (Build First)

### Purpose
User registration, encryption key storage, display names, and linked wallet management. Every other contract depends on this.

### File Structure
```
contracts/qflink-registry/
├── Cargo.toml
├── build.sh
└── src/
    └── main.rs
```

### Storage Layout
| Key Derivation | Value (SCALE encoded) | Description |
|---|---|---|
| `keccak("user", caller_addr)` | `UserProfile { display_name: Vec<u8>, encryption_pubkey: [u8; 32], registered_at: u64 }` | User profile |
| `keccak("linked", primary_addr)` | `Vec<[u8; 20]>` | List of linked wallet addresses |
| `keccak("primary", linked_addr)` | `[u8; 20]` | Reverse lookup: linked → primary |
| `keccak("user_count")` | `u64` | Total registered users |

### Data Structures
```rust
#[derive(Encode, Decode)]
struct UserProfile {
    display_name: Vec<u8>,       // max 32 bytes
    encryption_pubkey: [u8; 32], // NaCl public key for DM encryption
    registered_at: u64,          // timestamp
}
```

### Function Selectors & Handlers

#### `register(display_name: Vec<u8>, encryption_pubkey: [u8; 32])`
Selector: first 4 bytes of `keccak("register(bytes,bytes32)")`

Logic:
1. Get caller address via `api::caller()`
2. Check user not already registered (load from storage, if exists → revert)
3. Validate display_name length ≤ 32 bytes
4. Create `UserProfile` struct with current timestamp from `api::now()`
5. Store under `keccak("user", caller_addr)`
6. Increment user count
7. Emit event: topic = `keccak("UserRegistered")`, data = `(caller_addr, display_name)`

#### `get_profile(address: [u8; 20]) → UserProfile`
Selector: first 4 bytes of `keccak("get_profile(address)")`

Logic:
1. Read input address from calldata (bytes 4..24)
2. Load from `keccak("user", address)`
3. If not found → return empty/revert
4. Return SCALE-encoded `UserProfile`

#### `update_profile(display_name: Vec<u8>, encryption_pubkey: [u8; 32])`
Selector: first 4 bytes of `keccak("update_profile(bytes,bytes32)")`

Logic:
1. Get caller, verify registered
2. Update stored profile
3. Emit event: `ProfileUpdated`

#### `link_wallet(linked_address: [u8; 20], signature: Vec<u8>)`
Selector: first 4 bytes of `keccak("link_wallet(address,bytes)")`

Logic:
1. Get caller (this is the primary/hot wallet)
2. Verify the `linked_address` is not already linked to someone else
3. Verify the `linked_address` is not a registered primary wallet
4. **Note on signature verification**: `pallet-revive-uapi` does NOT have a signature verify host function. Two options:
   - **Option A (Recommended for MVP)**: Skip on-chain signature verification. Instead, require BOTH wallets to submit a transaction. The linked wallet calls `confirm_link(primary_address)` and the primary wallet calls `link_wallet(linked_address, _)`. When both exist, the link is established.
   - **Option B**: Use `hash_keccak_256` to verify an Ethereum-style signed message if you implement the ecrecover logic in-contract (complex, defer for now).
5. Store: add `linked_address` to `keccak("linked", caller_addr)` array
6. Store: set `keccak("primary", linked_address)` → caller_addr
7. Emit event: `WalletLinked(primary, linked)`

#### `confirm_link(primary_address: [u8; 20])`
Selector: first 4 bytes of `keccak("confirm_link(address)")`

Logic:
1. Get caller (this is the cold/linked wallet being linked)
2. Verify primary_address has a pending link for caller
3. Mark link as confirmed
4. Emit event: `WalletLinkConfirmed`

#### `unlink_wallet(linked_address: [u8; 20])`
Selector: first 4 bytes of `keccak("unlink_wallet(address)")`

Logic:
1. Caller must be the primary
2. Remove from linked array and reverse mapping
3. Emit event: `WalletUnlinked`

#### `get_primary(address: [u8; 20]) → [u8; 20]`
Returns the primary wallet for a given address. If the address is itself a primary (or unlinked), return itself.

#### `get_linked_wallets(primary: [u8; 20]) → Vec<[u8; 20]>`
Returns all wallets linked to a primary.

#### `get_total_balance(primary: [u8; 20]) → [u8; 32]`
Logic:
1. Get balance of primary via `api::balance_of()`
2. Get all linked wallets
3. Sum all balances (u256 addition on [u8; 32] arrays)
4. Return total

**Important**: This is a read function. The frontend can also compute this client-side by querying balances directly. Having it in the contract is a convenience for other contracts (pods) that need it.

---

## 4. CONTRACT #2: `qflink-pods`

### Purpose
Pod creation, membership management, balance-gated access, and pod message storage.

### Storage Layout
| Key Derivation | Value | Description |
|---|---|---|
| `keccak("pod", pod_id)` | `Pod` struct | Pod metadata |
| `keccak("pod_count")` | `u64` | Total pods created |
| `keccak("pod_msg", pod_id, msg_index)` | `PodMessage` struct | Individual message |
| `keccak("pod_msg_count", pod_id)` | `u64` | Message count for pod |
| `keccak("pod_member", pod_id, member_addr)` | `bool` (1 byte) | Membership flag |
| `keccak("pod_member_count", pod_id)` | `u64` | Member count |
| `keccak("default_pods_init")` | `bool` | Whether defaults are initialized |

### Data Structures
```rust
#[derive(Encode, Decode)]
struct Pod {
    id: u64,
    name: Vec<u8>,           // max 32 bytes
    description: Vec<u8>,    // max 256 bytes
    min_balance: [u8; 32],   // u256: minimum QF balance to access
    creator: [u8; 20],
    created_at: u64,
    is_default: bool,        // true for the 6 default tier pods
    pod_type: u8,            // 0 = balance-gated (default), 1 = custom
}

#[derive(Encode, Decode)]
struct PodMessage {
    sender: [u8; 20],
    content_hash: [u8; 32],  // keccak hash of encrypted content
    timestamp: u64,
}
```

### Default Pods (Initialize in deploy())
```
Pod 0: "Shrimp"  - min_balance: 0 QF
Pod 1: "Crab"    - min_balance: 1,000 QF (1_000 * 10^18)
Pod 2: "Fish"    - min_balance: 10,000 QF
Pod 3: "Shark"   - min_balance: 50,000 QF
Pod 4: "Whale"   - min_balance: 100,000 QF
Pod 5: "Kraken"  - min_balance: 500,000 QF
```

Store these 6 pods during `deploy()`. Set `pod_count` to 6.

### Function Selectors & Handlers

#### `create_pod(name: Vec<u8>, description: Vec<u8>, min_balance: [u8; 32])`
Selector: `keccak("create_pod(bytes,bytes,uint256)")`

Logic:
1. Get caller, verify registered in registry contract
2. Validate name (≤ 32 bytes), description (≤ 256 bytes)
3. Increment `pod_count`, use as `pod_id`
4. Create `Pod` struct with `is_default = false`, `pod_type = 1`
5. Store pod
6. Emit event: `PodCreated(pod_id, name, creator)`

#### `send_pod_message(pod_id: u64, content_hash: [u8; 32])`
Selector: `keccak("send_pod_message(uint64,bytes32)")`

Logic:
1. Get caller
2. Load pod by pod_id (revert if not found)
3. **Balance gate check**:
   - Get caller's total balance. To do this from within this contract, either:
     - **Option A**: Use `api::balance_of()` for the caller address directly (doesn't include linked wallets)
     - **Option B**: Cross-contract call to `qflink-registry.get_total_balance()` (includes linked wallets but more complex)
     - **For MVP, use Option A.** Document that linked wallet balance aggregation will be added when cross-contract calls are wired.
   - Compare balance against pod's `min_balance`
   - If insufficient → revert with "Insufficient balance"
4. Create `PodMessage` with timestamp from `api::now()`
5. Get current message count for pod, use as index
6. Store message at `keccak("pod_msg", pod_id, msg_index)`
7. Increment message count
8. Emit event: `PodMessageSent(pod_id, sender, content_hash, timestamp)`

#### `get_pod(pod_id: u64) → Pod`
Read and return pod metadata.

#### `get_pod_messages(pod_id: u64, start: u64, limit: u64) → Vec<PodMessage>`
Logic:
1. Load message count for pod
2. Clamp `start` and `limit` to valid range
3. Load messages from `start` to `start + limit`
4. Return SCALE-encoded vector

#### `get_pod_count() → u64`
Return total number of pods.

#### `check_pod_access(pod_id: u64, address: [u8; 20]) → bool`
Check if an address meets the balance requirement for a pod. Returns true/false.

---

## 5. CONTRACT #3: `qflink-messages`

### Purpose
On-chain metadata storage for encrypted direct messages. The actual encrypted content is stored off-chain (localStorage for MVP, IPFS later). Only content hashes go on-chain.

### Storage Layout
| Key Derivation | Value | Description |
|---|---|---|
| `keccak("dm", sender, recipient, msg_index)` | `DirectMessage` struct | Individual DM |
| `keccak("dm_count", sender, recipient)` | `u64` | Message count for a conversation |
| `keccak("conversations", address)` | `Vec<[u8; 20]>` | List of addresses user has conversations with |
| `keccak("conv_count", address)` | `u64` | Number of conversations |

### Data Structures
```rust
#[derive(Encode, Decode)]
struct DirectMessage {
    sender: [u8; 20],
    recipient: [u8; 20],
    content_hash: [u8; 32],  // hash of encrypted content blob
    timestamp: u64,
    nonce: [u8; 24],         // NaCl nonce, needed by recipient to decrypt
}
```

### Function Selectors & Handlers

#### `send_message(recipient: [u8; 20], content_hash: [u8; 32], nonce: [u8; 24])`
Selector: `keccak("send_message(address,bytes32,bytes24)")`

Logic:
1. Get caller
2. Verify recipient ≠ caller
3. Create `DirectMessage` with timestamp
4. Determine conversation key: always use sorted pair `(min(sender, recipient), max(sender, recipient))` for consistent key derivation
5. Get message count for this conversation pair, use as index
6. Store message
7. Increment message count
8. If this is the first message between these addresses, add each to the other's conversations list
9. Emit event: `MessageSent(sender, recipient, content_hash, timestamp)`

The event is critical — the frontend subscribes to `MessageSent` events filtered by recipient address to get real-time notifications.

#### `get_messages(address1: [u8; 20], address2: [u8; 20], start: u64, limit: u64) → Vec<DirectMessage>`
Logic:
1. Sort addresses to get canonical conversation key
2. Load messages in range
3. Return SCALE-encoded

#### `get_conversations(address: [u8; 20]) → Vec<[u8; 20]>`
Return list of addresses the user has DM conversations with.

#### `get_message_count(address1: [u8; 20], address2: [u8; 20]) → u64`
Return number of messages in a conversation.

---

## 6. FRONTEND INTEGRATION

### File: `src/lib/contracts.ts`
This file already exists as scaffolding. Update it with:

```typescript
import { ApiPromise } from '@polkadot/api';
import { ContractPromise } from '@polkadot/api-contract'; // if available
// Note: pallet-revive uses revive.call() extrinsic, NOT contracts.call()

export const CONTRACT_ADDRESSES = {
  registry: import.meta.env.VITE_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000',
  pods: import.meta.env.VITE_PODS_ADDRESS || '0x0000000000000000000000000000000000000000',
  messages: import.meta.env.VITE_MESSAGES_ADDRESS || '0x0000000000000000000000000000000000000000',
};

// Function selector helper (first 4 bytes of keccak256)
function selector(signature: string): Uint8Array {
  // Use keccak256 from a JS lib (e.g., ethers.js or @polkadot/util-crypto)
  const hash = keccak256(new TextEncoder().encode(signature));
  return hash.slice(0, 4);
}

// Encode a contract call
function encodeCall(sig: string, ...args: Uint8Array[]): Uint8Array {
  const sel = selector(sig);
  const data = new Uint8Array(sel.length + args.reduce((sum, a) => sum + a.length, 0));
  data.set(sel, 0);
  let offset = sel.length;
  for (const arg of args) {
    data.set(arg, offset);
    offset += arg.length;
  }
  return data;
}
```

### Calling Contracts from Frontend
Contracts on `pallet-revive` are called via the `revive.call` extrinsic:

```typescript
// Example: register a user
async function registerUser(api: ApiPromise, signer: any, displayName: string, encryptionPubkey: Uint8Array) {
  // SCALE encode the arguments
  const nameBytes = new TextEncoder().encode(displayName);
  const callData = encodeCall(
    'register(bytes,bytes32)',
    scaleEncodeBytes(nameBytes),
    encryptionPubkey
  );

  const DECIMALS = BigInt(10) ** BigInt(18);
  const WEIGHT = BigInt(10) ** BigInt(9);

  const tx = api.tx.revive.call(
    CONTRACT_ADDRESSES.registry,          // dest (20-byte hex address)
    0,                                     // value (no QF transfer needed)
    { refTime: WEIGHT, proofSize: WEIGHT }, // gasLimit
    (DECIMALS).toString(),                 // storageDepositLimit
    callData                              // input data
  );

  return new Promise((resolve, reject) => {
    tx.signAndSend(signer, (result) => {
      if (result.status.isFinalized) resolve(result);
      if (result.status.isInvalid) reject(new Error('Invalid'));
    });
  });
}
```

### Account Mapping Requirement
Before ANY contract interaction, ensure the user's Substrate account is mapped to an EVM address:

```typescript
async function ensureAccountMapped(api: ApiPromise, signer: any) {
  // Check if already mapped
  const entries = await api.query.revive.originalAccount.entries();
  const mapped = entries.find(([_, value]) => value.toString() === signer.address);
  if (mapped) return;

  // Map the account
  const tx = api.tx.revive.mapAccount();
  await tx.signAndSend(signer);
}
```

This MUST be called once per account before contract calls work.

### Event Subscription for Real-Time Messages
```typescript
// Subscribe to MessageSent events for real-time DM notifications
api.query.system.events((events) => {
  events.forEach((record) => {
    const { event } = record;
    if (event.section === 'revive' && event.method === 'ContractEmitted') {
      // Decode the event data to check if it's a MessageSent event
      // Filter by recipient address
      // Update Zustand message store
    }
  });
});
```

### Zustand Store Updates
The existing stores in `src/stores/` need these changes:

#### `wallet.ts`
- Add `accountMapped: boolean` state
- Add `ensureMapping()` action that calls `revive.mapAccount()` if needed
- Add `evmAddress: string` derived from the mapping

#### `messages.ts`
- Replace mock data with contract query calls
- Add `sendMessage()` action that calls `qflink-messages` contract
- Add event subscription for real-time incoming messages
- Cache decrypted messages in Zustand (they come encrypted from chain)

#### `pods.ts`
- Replace mock pods with contract query for default pods + custom pods
- Add `sendPodMessage()` action
- Add `checkAccess()` that queries balance
- Add real-time event subscription for pod messages

#### `profile.ts`
- Replace mock profile with contract query
- Add `register()` action
- Add `linkWallet()` / `confirmLink()` actions
- Wire linked wallets to real contract state

---

## 7. ENCRYPTION FLOW (Frontend Only — Not On-Chain)

The file `src/lib/encryption.ts` already exists. Here's how it should work end-to-end:

### Key Derivation
```typescript
import nacl from 'tweetnacl';
import { decodeUTF8 } from 'tweetnacl-util';

// Derive encryption keypair from wallet signature (deterministic)
async function deriveEncryptionKeypair(signer: any): Promise<nacl.BoxKeyPair> {
  // Sign a deterministic message to derive a seed
  const message = 'QFLink Encryption Key Derivation v1';
  const signature = await signer.sign(decodeUTF8(message));
  // Use first 32 bytes of signature as seed
  const seed = signature.slice(0, 32);
  return nacl.box.keyPair.fromSecretKey(seed);
}
```

### DM Encryption
```typescript
function encryptMessage(
  plaintext: string,
  recipientPublicKey: Uint8Array,
  senderSecretKey: Uint8Array
): { encrypted: Uint8Array; nonce: Uint8Array } {
  const nonce = nacl.randomBytes(24);
  const messageBytes = decodeUTF8(plaintext);
  const encrypted = nacl.box(messageBytes, nonce, recipientPublicKey, senderSecretKey);
  return { encrypted, nonce };
}
```

### DM Send Flow
1. User types message
2. Frontend fetches recipient's `encryption_pubkey` from registry contract
3. Encrypt message with NaCl box
4. Store encrypted blob in localStorage (MVP) or IPFS (later)
5. Compute `content_hash = keccak256(encrypted_blob)`
6. Call `qflink-messages.send_message(recipient, content_hash, nonce)` on-chain
7. The nonce is stored on-chain so recipient can decrypt

### DM Receive Flow
1. Frontend subscribes to `MessageSent` events where recipient = current user
2. On new event: get `content_hash` and `nonce`
3. Fetch encrypted blob from localStorage/IPFS using content_hash as key
4. Decrypt using `nacl.box.open(encrypted, nonce, senderPublicKey, mySecretKey)`
5. Display in chat UI

### MVP Simplification
For local dev, encrypted blobs can be stored in **localStorage** keyed by content_hash. This means DMs only work on the same browser/device. For testnet, add IPFS or a simple blob server later.

---

## 8. BUILD ORDER & VERIFICATION

### Phase 1: Contracts (Do in this order)
1. **`qflink-registry`** — Build, compile to `.polkavm`, deploy on local dev
   - Test: register a user, query profile, link wallets
2. **`qflink-pods`** — Build, deploy
   - Test: verify 6 default pods exist, send pod message, verify balance gating
3. **`qflink-messages`** — Build, deploy
   - Test: send DM, query conversations, query messages

### Phase 2: Frontend Wiring (Do in this order)
1. Wire account mapping (`revive.mapAccount()`) into wallet connection flow
2. Wire user registration into onboarding (prompt after first wallet connect)
3. Wire pod queries to replace mock data in pods store
4. Wire pod message sending
5. Wire DM sending and receiving
6. Wire encryption key storage and retrieval
7. Wire linked wallet management

### Phase 3: Real-Time
1. Add event subscription for incoming DMs
2. Add event subscription for pod messages
3. Add toast notifications for new messages

### Testing on Local Dev
```bash
# Terminal 1: Run QF node
cd qf-solochain
target/release/qf-node --dev --state-pruning archive -lerror,runtime::revive::strace=trace,runtime::revive=debug

# Terminal 2: Build & deploy contracts
cd contracts/qflink-registry
./build.sh
# Deploy via portal.qfnetwork.xyz or script

# Terminal 3: Run frontend
cd qflink
npm run dev
```

Dev accounts for local testing (pre-funded):
- Alice: `5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY`
- Bob: `5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty`

---

## 9. FILE STRUCTURE

```
contracts/
├── qflink-registry/
│   ├── Cargo.toml
│   ├── build.sh
│   └── src/
│       └── main.rs
├── qflink-pods/
│   ├── Cargo.toml
│   ├── build.sh
│   └── src/
│       └── main.rs
├── qflink-messages/
│   ├── Cargo.toml
│   ├── build.sh
│   └── src/
│       └── main.rs
└── deploy/
    └── deploy.js          # Deployment script for portal.qfnetwork.xyz
```

Frontend files to modify:
```
src/
├── lib/
│   ├── contracts.ts       # Contract addresses, selectors, call helpers
│   ├── chain.ts           # Add revive.mapAccount(), revive.call() helpers
│   └── encryption.ts      # Wire actual NaCl encryption to send/receive flow
├── stores/
│   ├── wallet.ts          # Add accountMapped state, EVM address
│   ├── messages.ts        # Replace mocks with contract calls
│   ├── pods.ts            # Replace mocks with contract calls
│   └── profile.ts         # Replace mocks with contract calls
└── .env                   # Add VITE_REGISTRY_ADDRESS, VITE_PODS_ADDRESS, VITE_MESSAGES_ADDRESS
```

---

## 10. IMPORTANT CONSTRAINTS

1. **Do NOT use ink!** — QF Network uses `pallet-revive`, not `pallet-contracts`
2. **Do NOT use ethers.js or web3.js** — Use `@polkadot/api` for all chain interactions
3. **Addresses are 20 bytes** — Not 32-byte SS58. Stored as `[u8; 20]` in contracts, hex strings in frontend
4. **No floating point in contracts** — All amounts as `[u8; 32]` (u256) with 18 decimals
5. **SCALE encoding** — All contract I/O uses SCALE (parity-scale-codec), NOT ABI encoding
6. **Events via `deposit_event`** — Use topic[0] as event ID (keccak of event name), data as SCALE-encoded payload
7. **Storage costs money** — Each byte stored on-chain costs deposit. Keep stored data minimal. Content hashes (32 bytes) on-chain, actual content off-chain
8. **No signature verification host function** — `pallet-revive-uapi` does NOT provide ecrecover or sr25519_verify. Use two-transaction linking flow for wallet linking
9. **Cross-contract calls are possible** via `api::call()` but complex. For MVP, have the frontend orchestrate multi-contract workflows rather than contracts calling each other
10. **The frontend already works** — It's 85% complete with mock data. Only replace the mock data layer. Do not redesign components.
```

---

That's the complete spec. It covers the exact SDK, exact host functions, exact patterns, storage strategy, all three contracts, frontend wiring, encryption flow, build process, and deployment — all specific to QF Network's actual `pallet-revive` + `qf-polkavm-sdk` environment.

For Windsurf model: **use Claude Sonnet 4.5**. It'll follow this spec more precisely, which is what matters when the instructions are this detailed.