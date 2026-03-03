# QFLink Paid Pods – Technical Spec v1.0

## Overview
Pod creators can charge a one-time entry fee for access to their pod.
The platform takes a 5% cut; the creator receives 95%.
Payments are in QF tokens only.

---

## Access Types

| Type | Balance Check | Payment Check | Example |
|---|---|---|---|
| Token-Gated | Yes (threshold > 0) | No (fee = 0) | Default pods: Chefs, Whale |
| Paid | No (threshold = 0) | Yes (fee > 0) | Creator charges 100 QF, anyone can join |
| Token-Gated + Paid | Yes | Yes | "Whale holders pay 500 QF for alpha" |
| Open | No | No | Free pod, no requirements |

Creator sets both fields during pod creation. Either, both, or neither can be zero.

---

## Payment Flow

1. User clicks "Join" on a paid pod in Explore
2. UI shows confirmation: "Join [Pod Name] for [X] QF?"
3. User confirms → frontend calls `join_pod(pod_id)` with value = entry fee
4. Contract verifies:
   - User is not banned (pod or global)
   - User meets token threshold (if set)
   - Value transferred == entry fee
   - User has not already joined/paid
5. Contract splits payment:
   - 95% transferred to creator's payout wallet
   - 5% transferred to platform treasury wallet
6. Contract records user as paid member for that pod
7. User enters pod

---

## Payment Rules

- **Currency:** QF tokens only
- **Type:** One-time (lifetime access)
- **No subscriptions** in MVP
- **No refunds** — payment is final even if later banned
- **No preview** — pay before accessing content
- **Fee range:** Minimum 1 QF, no maximum
- **Creator payout wallet:** Specified during pod creation, defaults to
  creator's connected wallet, can be any valid address

---

## Revenue Split

| Recipient | Share | Example (100 QF fee) |
|---|---|---|
| Creator payout wallet | 95% | 95 QF |
| Platform treasury | 5% | 5 QF |

Platform treasury address is set in contract constructor (admin-controlled).
Admin can update treasury address via `set_treasury(new_address)`.

---

## Explore UI Changes

- Free pods: badge shows "Open" (existing)
- Token-gated pods: badge shows "10,000+ QF" (existing)
- Paid pods: badge shows price e.g. "50 QF" with a small paid indicator
- Token-gated + Paid: badge shows "1M+ QF · 500 QF entry"

---

## Contract Changes

### New Storage
Copy
paid_members: mapping(pod_id + H160 → bool) pod_entry_fee: mapping(pod_id → u256) // 0 = free pod_payout_wallet: mapping(pod_id → H160) treasury_address: H160 // set at init


### New Functions

| Function | Caller | Description |
|---|---|---|
| `join_pod(pod_id)` | Any (payable) | Pay entry fee, record membership |
| `set_treasury(address)` | Admin only | Update platform treasury address |
| `get_pod_fee(pod_id)` | Any | Return entry fee for pod |
| `has_paid(pod_id, address)` | Any | Check if address has paid |

### Modified Functions

| Function | Change |
|---|---|
| `create_pod(...)` | Add `entry_fee` and `payout_wallet` parameters |
| `check_pod_access(...)` | Add: if fee > 0, check `has_paid`; combine with threshold check |
| `send_pod_message(...)` | Add paid membership check |

---

## Implementation Priority

### MVP
1. Contract: `pod_entry_fee`, `pod_payout_wallet`, `paid_members` storage
2. Contract: `join_pod` (payable) with 95/5 split
3. Contract: `set_treasury` (admin)
4. Contract: Update `create_pod` with fee + payout params
5. Contract: Update `check_pod_access` with paid check
6. Frontend: Pod creation form — entry fee field + payout wallet field
7. Frontend: Join confirmation modal with price
8. Frontend: Paid badge on pod cards

### Post-Launch
- Monthly/seasonal subscription pods
- Bulk discounts (pay for 10 members at once)
- Revenue dashboard for creators
- Withdrawal history

---

## Burn Logic (CLARIFICATION NEEDED)

Current UI reportedly burns ~70% of some fee.
**Decision required:** Does this apply to:
  (a) Pod creation fees → burned? treasury? split?
  (b) Entry fees → the 5% platform cut is burned? kept? split?
  (c) Something else entirely?

This must be clarified before implementation to avoid
conflicting token flows.