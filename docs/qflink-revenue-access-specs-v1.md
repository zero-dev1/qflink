# QFLink Revenue & Access Specs – v1.0 Final

## Document Map
1. Pod Creation Fees (Platform Revenue)
2. Paid Pods (Creator Revenue)  
3. Pod Moderation
4. Staking-Aware Access (Outline)

---

# 1. Pod Creation Fees

## Overview
Creators pay a one-time fee to create a Pro pod.
Free pods exist for adoption — no payment required.
Pro fee is anchored to ~$15 USD, paid in QF tokens.
Admin adjusts the QF amount periodically to track fiat anchor.

## Tiers

| Feature | Free | Pro |
|---|---|---|
| Cost | 0 QF | ~$15 USD in QF (admin-set, e.g. 500 QF at launch) |
| Max members | 50 | Unlimited |
| Custom token gate | No (default thresholds) | Yes (any amount) |
| Entry fee charging | No | Yes |
| Moderator slots | 1 | 3 |
| Custom icon/banner | No | Yes |
| Explore priority listing | No | Yes |
| Verified badge | No | Yes |
| Join method | Balance-based only | Balance, Paid, or Both |

## Pro Fee Split

| Recipient | Share | Example (500 QF) |
|---|---|---|
| Platform treasury | 95% | 475 QF |
| Burned | 5% | 25 QF |

## Upgrades
- Free → Pro: creator pays full Pro fee at any time
- Pod retains all members, messages, settings
- No downgrade in MVP
- No pod limit per wallet

## Contract Requirements

### Storage
Copy
pod_tier: mapping(pod_id → u8) // 0 = Free, 1 = Pro pro_creation_fee: u256 // admin-updatable treasury_address: H160 // admin-set


### Functions

| Function | Caller | Description |
|---|---|---|
| create_pod(...) | Any | If value >= pro_fee → Pro; else → Free |
| upgrade_pod(pod_id) | Creator (payable) | Pay pro fee, upgrade Free → Pro |
| set_pro_fee(amount) | Admin | Update Pro creation fee |
| set_treasury(address) | Admin | Update treasury wallet |
| get_pod_tier(pod_id) | Any | Return tier |

### Enforcement

| Action | Free | Pro |
|---|---|---|
| Set entry_fee > 0 | Rejected | Allowed |
| add_mod when count >= 1 | Rejected | Allowed (up to 3) |
| join_pod when members >= 50 | Rejected | Allowed |

---

# 2. Paid Pods (Creator Revenue)

## Overview
Pro pod creators can charge a one-time entry fee.
Platform takes 5% of each entry fee payment.
Creator receives 95% to their specified payout wallet.
Lifetime access — no subscriptions in MVP.

## Access Types

| Type | Threshold | Fee | Example |
|---|---|---|---|
| Open | 0 | 0 | Free pod, anyone enters |
| Token-Gated | > 0 | 0 | Hold 10K QF to enter |
| Paid | 0 | > 0 | Pay 100 QF, no hold required |
| Token-Gated + Paid | > 0 | > 0 | Hold 1M QF AND pay 500 QF |

Creator sets both fields during pod creation. Either, both, or neither.

## Entry Fee Split

| Recipient | Share | Example (100 QF fee) |
|---|---|---|
| Creator payout wallet | 95% | 95 QF |
| Platform treasury | 5% | 5 QF |
| Burned | 0% | 0 QF |

## Payment Flow

1. User clicks "Join" on paid pod in Explore
2. UI shows: "Join [Pod Name] for [X] QF?"
3. User confirms → calls join_pod(pod_id) with value = fee
4. Contract checks:
   - Not banned (pod or global)
   - Meets token threshold (if set)
   - value_transferred == entry_fee
   - Not already a paid member
5. Contract splits: 95% → creator wallet, 5% → treasury
6. Records user as paid member
7. User enters pod

## Payment Rules

- Currency: QF only
- Type: One-time lifetime access
- No refunds (even if later banned)
- No preview (creator markets elsewhere)
- Minimum fee: 1 QF
- Maximum fee: uncapped
- Payout wallet: set at creation, defaults to creator wallet, can be any address

## Explore UI

- Open pods: badge "Open"
- Token-gated: badge "10,000+ QF"
- Paid: badge with price e.g. "50 QF" + paid indicator
- Token-gated + Paid: "1M+ QF · 500 QF entry"

## Contract Requirements

### Storage
paid_members: mapping(pod_id + H160 → bool) pod_entry_fee: mapping(pod_id → u256) // 0 = free pod_payout_wallet: mapping(pod_id → H160)


### Functions

| Function | Caller | Description |
|---|---|---|
| join_pod(pod_id) | Any (payable) | Pay fee, split 95/5, record member |
| get_pod_fee(pod_id) | Any | Return entry fee |
| has_paid(pod_id, address) | Any | Check paid status |

### Modified Functions

| Function | Change |
|---|---|
| create_pod(...) | Add entry_fee + payout_wallet params |
| check_pod_access(...) | Add: if fee > 0, require has_paid |
| send_pod_message(...) | Add paid membership check |

---

# 3. Pod Moderation

## Overview
On-chain messages are immutable. Moderation controls visibility
and access, not deletion. Messages from banned users are hidden
client-side.

## Roles

### Pod Creator
- Full control: ban/unban, appoint/remove mods
- Cannot be banned from own pod
- Max 1 creator per pod (non-transferable in MVP)

### Moderator
- Appointed by creator only
- Can ban/unban members (not other mods or creator)
- Free pods: 1 mod slot | Pro pods: 3 mod slots

### App-Wide Admin (Deployer Wallet)
- Can ban wallet from ALL pods and DMs platform-wide
- Safety net for illegal content, scams, severe abuse
- Not advertised in UI

## Ban Behaviour
- Permanent until manually unbanned
- No timed bans in MVP
- Banned user: pod disappears from their view, cannot send
  messages, cannot rejoin regardless of balance
- Existing messages hidden client-side
- No refund if banned from paid pod
- No appeal mechanism — decision is final

## Contract Requirements

### Storage
ban_list: mapping(pod_id + H160 → bool) mod_list: mapping(pod_id + u8_index → H160) // max 3 Pro, 1 Free mod_count: mapping(pod_id → u8) global_ban: mapping(H160 → bool)


### Functions

| Function | Caller | Description |
|---|---|---|
| ban_member(pod_id, addr) | Creator or Mod | Add to pod ban list |
| unban_member(pod_id, addr) | Creator or Mod | Remove from pod ban list |
| add_mod(pod_id, addr) | Creator only | Appoint mod (1 Free / 3 Pro) |
| remove_mod(pod_id, addr) | Creator only | Remove mod |
| get_ban_list(pod_id) | Any | Return banned addresses |
| get_mods(pod_id) | Any | Return mod addresses |
| is_banned(pod_id, addr) | Any | Check pod ban |
| global_ban(addr) | Admin only | Platform-wide ban |
| global_unban(addr) | Admin only | Remove global ban |
| is_global_banned(addr) | Any | Check global ban |

### Modified Functions

| Function | Change |
|---|---|
| check_pod_access | Deny if banned (pod or global) |
| send_pod_message | Deny if banned |

## Access Check Flow (Final)

function canAccessPod(wallet, pod_id): if is_global_banned(wallet): return DENIED if is_banned(pod_id, wallet): return DENIED if pod.threshold == 0 AND pod.fee == 0: return GRANTED // open pod if pod.threshold > 0: balance = getBalance(wallet) if balance < pod.threshold: return INSUFFICIENT if pod.fee > 0: if not has_paid(pod_id, wallet): return PAYMENT_REQUIRED return GRANTED


## Frontend Changes
- Ban button visible to creator/mods on each message sender
- Mod badge next to moderator names in chat
- Creator sees "Add Mod" / "Remove Mod" in pod settings
- Filter banned addresses' messages client-side
- Hide pods where user is banned from Explore/Home

---

# 4. Staking-Aware Access (Outline — Phase 2)

## Purpose
Prevent flash-holding by checking staked + unbonding + free balance.
Mainnet only. Depends on QF Network staking pallet.

## Approach
- Query pallet-staking.ledger (staked)
- Query unlocking chunks (unbonding)
- Query system.account (free)
- Sum across linked wallets (max 3)
- Compare to pod threshold

## Open Questions
- Weight staked tokens higher? (e.g. 1.5x)
- Creator chooses "staked only" vs "any balance"?
- Unbonding period length on QF Network?

## No Contract Changes Now
Current free-balance check is sufficient for MVP/testnet.

---

# Implementation Build Order

## Phase 1 — Moderation (build first)
1. Contract: ban_list, mod_list, global_ban storage
2. Contract: ban/unban, add/remove mod, global ban functions
3. Contract: update check_pod_access + send_pod_message
4. Frontend: ban button for creator/mods
5. Frontend: client-side message filtering
6. Frontend: hide banned pods from user view

## Phase 2 — Pod Creation Tiers (build second)
1. Contract: pod_tier, pro_creation_fee, treasury storage
2. Contract: tier logic in create_pod, upgrade_pod
3. Contract: enforce Free limits (50 members, 1 mod, no fees)
4. Frontend: consolidate 3-tier UI → Free + Pro
5. Frontend: update creation flow
6. Frontend: upgrade button in pod settings
7. Frontend: update fee breakdown (95% treasury / 5% burn)

## Phase 3 — Paid Pods (build third)
1. Contract: paid_members, pod_entry_fee, payout_wallet storage
2. Contract: join_pod (payable) with 95/5 split
3. Contract: update create_pod with fee + wallet params
4. Contract: update access checks
5. Frontend: entry fee field in Pro pod creation
6. Frontend: join confirmation modal with price
7. Frontend: paid badge on pod cards
8. Frontend: payout wallet field in creation flow

## Phase 4 — Staking (mainnet)
- Per outline above

## Not Planned for MVP
- Subscription/recurring fees
- Timed bans
- Message-level hiding
- Reporting system
- Appeals
- AI moderation
- Oracle-based fee pricing