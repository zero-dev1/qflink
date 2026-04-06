# QFLink — Post-Audit Fix & Complete Implementation

> Read `DESIGN_SYSTEM.md` at repo root first. Then read this entire file before writing any code. Execute in the exact order below — P0 first, then P1, then P2, then P3. Do not skip ahead. After each fix, verify the app still builds and runs.

---

## P0 — Fix What's Broken

### Fix 1: Connect Animation — Avatar Inside Circle Container

The avatar renders as a separate element instead of inside the animating circle. Fix:

- There must be ONE single `motion.div` that persists through all 8 connect states. Call it `connect-orb` or similar.
- This div starts as the wallet circle, becomes the spinner circle, becomes the checkmark circle, becomes the QFLink seal circle, becomes the avatar circle. It is always the SAME element.
- When the avatar needs to appear (State 6), inject the avatar `<img>` as a CHILD of this same `motion.div` with an opacity fade-in (`opacity: 0 → 1`). Do NOT replace the circle div with a new avatar div. The avatar is content inside the circle, not a replacement for it.
- The circle's border, size, and position animations continue on the parent. The avatar image just fades in inside it with `overflow: hidden` and `border-radius: 9999px` on the parent.

```tsx
// WRONG — swapping elements
{state === 'avatar' ? <motion.div layoutId="orb"><Avatar /></motion.div> : <motion.div layoutId="orb"><Spinner /></motion.div>}

// RIGHT — one element, content changes inside
<motion.div layoutId="connect-orb" className="rounded-full overflow-hidden" animate={orbAnimations[state]}>
  {state === 'spinner' && <SpinnerArc />}
  {state === 'checkmark' && <CheckmarkSVG />}
  {state === 'avatar' && <motion.img initial={{ opacity: 0 }} animate={{ opacity: 1 }} src={avatarUrl} />}
</motion.div>
```

### Fix 2: Connect → Sidebar Pill Continuity (layoutId)

The connect screen's final pill must physically animate into the sidebar's profile capsule position. Fix:

- The connect page's pill (State 7-8) and the Sidebar's profile capsule must share the SAME `layoutId="profile-capsule"`.
- Both must render a `motion.div` with this layoutId.
- Navigation from `/connect` to `/home` must happen INSIDE an `AnimatePresence` wrapper so Framer Motion can animate the shared layout element between routes.
- The connect page should NOT navigate until the pill formation animation completes. Use `onAnimationComplete` on the pill's formation animation to trigger navigation.
- In `AppLayout.tsx` or the router wrapper, ensure `AnimatePresence` wraps the route outlet so layout animations work across page changes.
- The sidebar capsule should initially render at the position Framer Motion calculates from the connect page's pill position, then settle into its sidebar position via layout animation.

Test: Connect wallet → watch the pill form → it should physically fly to the sidebar bottom-left as the Home page fades in. No jump cut.

### Fix 3: Kill Every Emoji — Replace with Icons

Install lucide-react if not already installed: `npm install lucide-react` or `pnpm add lucide-react`.

Search the entire `src/` directory for emoji usage. Every emoji must become a Lucide icon or a custom SVG icon component. Here's the mapping:

```
🔒 (lock, encrypted) → <Lock size={14} /> from lucide-react
⚡ (instant mode) → <Zap size={14} /> from lucide-react  
👥 (members) → <Users size={14} /> from lucide-react
📣 (ambassador badge) → custom SVG or <Megaphone size={14} />
👑 (pioneer badge) → custom SVG or <Crown size={14} />
🛡️ (team badge) → <Shield size={14} /> from lucide-react
🧪 (dapplab badge) → <FlaskConical size={14} /> from lucide-react
```

Files to check (at minimum):
- `src/components/messages/ConversationRow.tsx` — 🔒 for encryption
- `src/components/pods/PodCard.tsx` — 🔒 for gated pods
- `src/pages/Profile.tsx` — badge emoji (👑🛡️🧪📣)
- `src/pages/DMChat.tsx` — encryption indicators
- `src/pages/Landing.tsx` — any emoji in section content
- `src/pages/Home.tsx` — any emoji
- `src/pages/Explore.tsx` — any emoji
- `src/components/ui/ModePill.tsx` — ⚡ and 🔒

Run `grep -rn '[\x{1F300}-\x{1F9FF}]' src/` or `grep -rn '🔒\|⚡\|👥\|📣\|👑\|🛡️\|🧪' src/` to find all instances. Replace every single one. Zero emoji should remain in the codebase.

For the Mode Pill specifically: the ⚡ and 🔒 should be `<Zap />` and `<Lock />` Lucide icons, styled with the same cyan/dim treatment described in the design system. These icons accept `className` for Tailwind styling and `strokeWidth` for matching the 1.5px design language.

---

## P1 — Verify & Fix New Features

### Fix 4: PodComposer Smoke Test & Fixes

Open Explore page → trigger pod creation flow. Verify each beat:

1. Name input appears, is focused, allows typing
2. Category chips appear after 3+ characters typed
3. Access choice appears after category selected
4. Price input appears after access choice
5. Description textarea appears
6. Launch button appears with creation fee

If any beat doesn't trigger the next, fix the progressive reveal logic — each beat should check the previous beat's state and conditionally render.

Verify the Launch button:
- Shows the creation fee in the button label ("Launch Pod · X QF")
- Calls `writeContract` via `contractCalls.createPod()` or `createPaidPod()` depending on whether price > 0
- Shows the signing state ("Approve in wallet →") while waiting for signature
- On success: closes the composer, shows success toast, navigates to the new pod or refreshes Explore
- On cancel/error: restores the button, shows appropriate feedback

If the composer doesn't call the real contract functions, wire it to `createPod` / `createPaidPod` from `src/lib/contractCalls.ts`.

### Fix 5: ProfileSheet Smoke Test & Wire Everywhere

Tap an avatar in PodChat message bubble → ProfileSheet should appear. Verify:
- Shows avatar, .qf name (or truncated address), badges if any
- Shows "Message" button that navigates to DM
- Animates in as bottom sheet (mobile) or panel (desktop)
- Dismisses on tap outside, swipe down, or Escape

Then wire ProfileSheet into EVERY avatar surface. Check each of these and add `onAvatarTap` if missing:
- `src/pages/PodChat.tsx` — sender avatars in message bubbles ✓ (likely done)
- `src/pages/DMChat.tsx` — header avatar AND message bubble avatars
- `src/components/messages/ConversationRow.tsx` — conversation avatar ✓ (likely done)
- `src/pages/Home.tsx` — pod card avatars, recent DM avatars
- `src/pages/Explore.tsx` — pod creator names/avatars in pod detail expansion
- `src/pages/CreatorDashboard.tsx` — member list avatars
- `src/components/pods/PodCard.tsx` — if creator avatar is shown

Every avatar that represents a person must open ProfileSheet on tap. No decorative avatars.

### Fix 6: ActionBar (⌘K) Smoke Test & Fixes

Press ⌘K (or Ctrl+K on Windows/Linux). Verify:
- ActionBar opens as a centered floating panel with glass treatment
- Input is auto-focused
- Typing a pod name shows pod results
- Typing a .qf name or 0x address shows people results
- Typing "create" shows "Create a Pod" action
- Typing "disconnect" shows "Disconnect Wallet" action
- Arrow keys navigate results, Enter selects, Escape closes
- Clicking outside closes

On Messages page specifically:
- ActionBar should be visible inline at the top of the conversation list (always visible, not just on ⌘K)
- Typing in it should filter existing conversations AND allow starting new ones
- Tapping a person result should navigate to the DM chat (existing or new)

If any of this doesn't work, fix it. The ActionBar is the unified command surface — it replaces Spotlight and NewMessageModal entirely. Verify those old components are no longer rendered anywhere.

### Fix 7: Mode Pill — Disable Non-Functional Toggles

Check if Instant Mode has actual session key infrastructure behind it. If the session key signing flow is NOT implemented (i.e., tapping Instant doesn't actually sign a session key that allows message sending without per-message approval), then:

- Keep the Instant Mode toggle visible but show a tooltip or small label "Coming soon" when tapped
- Do NOT let it toggle to an "active" visual state if it doesn't actually work
- The Privacy Mode toggle IS tractable if encryption is wired (from Session 10 Block 1). If the encryption keypair derivation works on wallet connect, Privacy toggle should work — verify it persists the preference and the DM send path checks it.

A non-functional toggle that looks active is worse than no toggle. Be honest about what works.

---

## P2 — Spec Compliance

### Fix 8: Typography — Clash Display + Satoshi

Check `tailwind.config.js` for font family definitions. The spec requires:
- **Clash Display** for headings/display text (font-display class)
- **Satoshi** for body/UI text (font-body or default sans)
- **System monospace** for addresses/hashes (font-mono)

Check `public/fonts/` — Clash Display and Satoshi font files should already be there (they were listed in the project tree). If the Tailwind config still references Urbanist or Geist Mono, update it:

```js
fontFamily: {
  display: ['Clash Display', 'sans-serif'],
  sans: ['Satoshi', 'sans-serif'],
  mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
}
```

Verify `src/index.css` has the correct `@font-face` declarations loading from `public/fonts/`.

Then check all heading elements use `font-display` class and body text uses the default sans. Grep for any hardcoded `font-family` that references old fonts.

### Fix 9: Color Audit — #00EFE7 is Primary

Check `tailwind.config.js` for the cyan-primary color value. It must be `#00EFE7`, not `#0891B2` or `#06B6D4` (those are Tailwind's default cyan shades).

Search for any hardcoded color values in the codebase:
```bash
grep -rn '#0891B2\|#06B6D4\|cyan-600\|cyan-500' src/
```

Replace all instances with the proper design token (`cyan-primary` or `#00EFE7`).

Verify badge colors exist in the badge utility (`src/lib/badges.ts` or wherever BADGE_TYPES is defined):
- Team: `#DADADA`
- Dapp Lab: `#00EFE7`
- Pioneer: `#FFD700`
- Ambassador: `#FF6B35`

### Fix 10: Landing Page — 5-Section Snap Scroll

Open the landing page (`/` or `/landing`). Verify:

1. **Scroll behavior:** Each section snaps to viewport. Check for `scroll-snap-type: y mandatory` on the container and `scroll-snap-align: start` on each section. If using GSAP ScrollTrigger snap, verify it's installed and the snap config works.

2. **Section 1 (Hero):** Staggered text reveal on load ("Every message," → "on-chain," → "forever." each appearing 200ms apart). "Enter App →" cyan text link. Network Pulse stats at bottom.

3. **Section 2 (Split):** Does the split-screen animation play on scroll? Left half (cyan) should slide up, right half (black) should slide down. If the animation isn't implemented, add it using Framer Motion `whileInView` or GSAP ScrollTrigger.

4. **Section 3 (Lock):** Does the SVG lock self-draw? If not implemented, add SVG path animation using `stroke-dasharray` / `stroke-dashoffset` with a CSS animation or GSAP tween.

5. **Section 4 (Name Morph):** Does the hex address type out and morph to a .qf name? If not implemented, use a sequence: type "0x5b34...9cc7" character by character → pause → morph each character to the corresponding character in "alice.qf" (slot machine effect).

6. **Section 5 (CTA):** "The chain is waiting" with round "Enter QFLink" button. Footer below.

If any section is missing its entrance animation, implement it. The landing page should be an EXPERIENCE, not a static page that happens to snap-scroll.

### Fix 11: Creator Dashboard — Inline Editing

Open Creator Dashboard for a pod you created. Verify:

- Entry fee value is displayed as text. Tapping it transforms to an input field. Changing the value and confirming fires an on-chain transaction via `setEntryFee()`.
- Token gate threshold: same tap-to-edit pattern via the appropriate contract call.
- If inline editing is not implemented, implement it: each editable value should be a component that toggles between display mode (text) and edit mode (input + confirm/cancel) on tap. On confirm, call the contract function.

### Fix 12: Toast Persistence

Verify in `src/stores/toast.ts` or wherever toasts are managed:
- Success toasts auto-dismiss after 3 seconds
- Error toasts do NOT auto-dismiss — they require manual dismissal (tap X)
- Warning toasts do NOT auto-dismiss

If all toasts auto-dismiss, fix the toast store to check the toast type and only set a timeout for success/info types.

---

## P3 — Polish

### Fix 13: Page Transitions

If `PageTransition.tsx` does generic fade/slide, that's acceptable for now. The spatial-origin transitions (pod card expands into chat, conversation row pushes into DM) are a polish item. If time allows, implement for the highest-impact transition:

- Messages → DM Chat: right-slide on mobile
- Pod card tap → Pod Chat: expand animation from card position

Use Framer Motion `AnimatePresence` with `mode="wait"` on the route outlet.

### Fix 14: Sound & Haptic Audit

Check `src/lib/feedback.ts` and `src/lib/sounds.ts` (if it exists). Verify:
- `hapticTap()` fires on every button press / send action
- `hapticSuccess()` / `chimeSuccess()` fires on confirmed transactions
- `hapticError()` / `chimeError()` fires on failed transactions
- The signing state ("Approve in wallet →") does NOT play any sound (intentional silence)

If `sounds.ts` doesn't exist, create it with at minimum:
```ts
export function playSuccess() { /* Web Audio API tone or audio element */ }
export function playError() { /* descending tone */ }
export function playSend() { /* soft pip for Instant Mode sends */ }
```

Wire these into the confirmation flows in `src/stores/pods.ts` and `src/stores/messages.ts`.

### Fix 15: ProfileSheet Coverage

After Fix 5 wired ProfileSheet into main surfaces, do a final sweep. Open every page and tap every avatar you see. If any avatar doesn't open ProfileSheet, wire it. The zero-exceptions rule from the design system: "Every avatar is a portal."

### Fix 16: Empty States

Check every page for "nothing here" type messages and replace with action-inviting CTAs:

- Explore with zero pods → "This is where pods live. Launch the first one." + creation CTA
- Explore category filter with zero results → "No [category] pods yet — be the first"
- Messages with zero conversations → "Your conversations will appear here. Type a .qf name above to start."
- Home with zero pods → "Join your first pod" card linking to Explore
- Home with zero DMs → "Start a conversation" with link
- Profile with zero pods → section doesn't render (not "0 pods")

Every dead end is a doorway. No screen should ever feel empty or dead.

---

## Verification Checklist

After completing all fixes, run through this:

- [ ] Connect wallet → avatar appears INSIDE the animated circle (Fix 1)
- [ ] Connect pill flies to sidebar position with layout animation (Fix 2)
- [ ] `grep -rn '🔒\|⚡\|👥\|📣\|👑\|🛡️\|🧪' src/` returns zero results (Fix 3)
- [ ] Pod creation works end-to-end from Explore (Fix 4)
- [ ] Tap any avatar anywhere → ProfileSheet opens (Fix 5)
- [ ] ⌘K opens ActionBar, search works, navigation works (Fix 6)
- [ ] Non-functional mode toggles are disabled/labeled (Fix 7)
- [ ] Headings use Clash Display, body uses Satoshi (Fix 8)
- [ ] Primary cyan is #00EFE7 everywhere (Fix 9)
- [ ] Landing page snaps between 5 sections with animations (Fix 10)
- [ ] Creator Dashboard entry fee is tap-to-edit inline (Fix 11)
- [ ] Error toasts require manual dismiss (Fix 12)
- [ ] App builds with zero TypeScript errors
- [ ] App runs without console errors on Home, Explore, Messages, Profile
- [ ] Wallet connect → pod join → send message flow works end-to-end
