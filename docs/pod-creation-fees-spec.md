# QFLink Pod Creation Fees – Technical Spec v1.0

## Overview
Creating a pod may cost QF tokens depending on the tier.
Creation fees go to the platform treasury (or burn — TBD per burn logic).
This is separate from entry fees that members pay to join.

---

## Tiers

| Feature | Free | Pro (500 QF) |
|---|---|---|
| Basic pod | Yes | Yes |
| Max members | 50 | Unlimited |
| Token gate (custom threshold) | Default only | Custom amount |
| Entry fee charging | No | Yes |
| Moderator slots | 1 | 3 |
| Custom icon/banner | No | Yes |
| Explore priority listing | No | Yes |

---

## Key Decisions

- **Free tier exists** — critical for adoption and experimentation
- **One paid tier only** — "Pro" at 500 QF (0.0001% of 500M circulating)
- **Upgradeable** — Free → Pro by paying 500 QF at any time
- **No downgrade** in MVP
- **No pod limit per wallet** — create as many as you want
- **Creation fee goes to:** Platform treasury wallet

---

## Why Free Tier Matters

Free pods cannot charge entry fees. The moment a creator wants
to monetise, they must upgrade to Pro (500 QF). This means:
- Free tier drives adoption (zero friction to try QFLink)
- Pro upgrade pays for itself from the creator's first few paying members
- Platform earns from Pro upgrades AND 5% of all entry fees

---

## Upgrade Flow

1. Creator opens pod settings
2. Clicks "Upgrade to Pro"
3. Confirmation: "Upgrade [Pod Name] to Pro for 500 QF?"
4. Payment sent to treasury
5. Pod tier updated on-chain
6. New features (entry fee, extra mod slots, etc.) immediately available
7. Members and messages preserved

---

## Contract Changes

### New Storage
Copy
pod_tier: mapping(pod_id → u8) // 0 = Free, 1 = Pro pro_creation_fee: u256 // 500 QF (admin-updatable)


### New / Modified Functions

| Function | Caller | Description |
|---|---|---|
| `create_pod(...)` | Any | Accepts optional payment; if value >= pro fee, tier = Pro; else tier = Free |
| `upgrade_pod(pod_id)` | Creator only (payable) | Pay pro fee, upgrade tier from Free to Pro |
| `set_pro_fee(amount)` | Admin only | Update the Pro creation fee |
| `get_pod_tier(pod_id)` | Any | Return tier for pod |

### Enforcement

| Action | Free Pod | Pro Pod |
|---|---|---|
| `create_pod` with entry_fee > 0 | Rejected | Allowed |
| `add_mod` when mod_count >= 1 | Rejected | Allowed (up to 3) |
| `join_pod` when member_count >= 50 | Rejected | Allowed |

---

## Frontend Changes

### Pod Creation Flow
- Step 1: Pod name, description
- Step 2: Access type (token gate threshold, entry fee) — entry fee
  field disabled with "Upgrade to Pro" prompt if creating free pod
- Step 3: Payout wallet (if Pro + entry fee set)
- Step 4: Confirm & create (shows cost: "Free" or "500 QF for Pro")

### Pod Settings (Creator View)
- Show current tier with upgrade button if Free
- Pro badge on pod card in Explore

---

## Implementation Priority

### MVP
1. Contract: `pod_tier` storage, `pro_creation_fee`
2. Contract: Tier check in `create_pod`
3. Contract: `upgrade_pod` function
4. Contract: Enforce member cap (50) and mod cap (1) for free pods
5. Contract: Enforce entry-fee-only-for-pro
6. Frontend: Creation flow with tier selection
7. Frontend: Upgrade button in pod settings
8. Frontend: Pro badge on pod cards

### Post-Launch
- Additional tiers if demand warrants
- Analytics dashboard (Pro feature)
- Pinned messages (Pro feature)
- Custom pod themes/branding (Pro feature)