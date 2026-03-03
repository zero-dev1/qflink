import React, { useState, useEffect } from 'react'
import { LandingNav } from '@/components/landing/LandingNav'
import { FooterCTA } from '@/components/landing/FooterCTA'
import { QFLinkWordmark } from '@/components/QFLinkWordmark'
import {
  SectionNum, H2, H3, P, Em, Strong, Blockquote, HighlightBox, Divider,
  Check, Cross, TableWrap, Th, Td, StatGrid, TwoCol, TwoColItem,
  UL, OL, Code, TimelineItem,
} from '@/components/whitepaper/WpHelpers'

const tocItems = [
  { id: 'section-01', num: '01', title: 'Abstract' },
  { id: 'section-02', num: '02', title: 'Introduction & Problem Statement' },
  { id: 'section-03', num: '03', title: 'The QFLink Vision' },
  { id: 'section-04', num: '04', title: 'Architecture & Smart Contracts' },
  { id: 'section-05', num: '05', title: 'Pods: Token-Gated Community Spaces' },
  { id: 'section-06', num: '06', title: 'Direct Messaging & Encryption' },
  { id: 'section-07', num: '07', title: 'Competitive Landscape' },
  { id: 'integrations', num: '08', title: 'Ecosystem Integrations' },
  { id: 'section-09', num: '09', title: 'Tokenomics & Fee Model' },
  { id: 'section-10', num: '10', title: 'Roadmap' },
  { id: 'section-11', num: '11', title: 'Security & Audits' },
  { id: 'section-12', num: '12', title: 'Team & Contributors' },
  { id: 'section-13', num: '13', title: 'Conclusion' },
]

const WhitepaperPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('section-01')
  const [tocOpen, setTocOpen] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id)
        })
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    )
    tocItems.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setTocOpen(false)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0f] text-gray-600 dark:text-gray-400">
      <LandingNav />

      {/* Hero */}
      <div className="relative flex flex-col items-center justify-center text-center px-6 pt-40 pb-20 overflow-hidden">
        {/* Dark mode glow */}
        <div
          className="absolute inset-0 pointer-events-none hidden dark:block"
          style={{ background: 'radial-gradient(ellipse at center, rgba(8,145,178,0.09) 0%, #0a0a0f 65%)' }}
        />
        {/* Light mode glow */}
        <div
          className="absolute inset-0 pointer-events-none dark:hidden"
          style={{ background: 'radial-gradient(ellipse at center, rgba(8,145,178,0.06) 0%, #ffffff 70%)' }}
        />
        <div className="relative z-10">
          <div className="inline-block border-b border-cyan-600/40 mb-6 pb-2">
            <span className="text-xs font-bold tracking-widest uppercase text-cyan-600">Whitepaper</span>
          </div>
          <div className="flex justify-center mb-4">
            <QFLinkWordmark size={56} variant="auto" />
          </div>
          <p className="text-lg text-gray-500 dark:text-gray-400 mb-6 max-w-xl mx-auto">
            The On-Chain Community Layer for QuantumFusion
          </p>
          <div className="flex flex-wrap items-center justify-center">
            <span className="border border-gray-200 dark:border-[#1e293b] bg-gray-50 dark:bg-[#111118] px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Version 1.0</span>
            <span className="border border-gray-200 dark:border-[#1e293b] border-l-0 bg-gray-50 dark:bg-[#111118] px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">March 2026</span>
            <span className="border border-gray-200 dark:border-[#1e293b] border-l-0 bg-gray-50 dark:bg-[#111118] px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">QuantumFusion Network</span>
          </div>
        </div>
      </div>

      {/* Mobile TOC */}
      <div className="lg:hidden px-6 mb-6 max-w-3xl mx-auto">
        <button
          onClick={() => setTocOpen(!tocOpen)}
          className="w-full flex items-center justify-between border border-gray-200 dark:border-[#1e293b] bg-gray-50 dark:bg-[#111118] px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <span className="font-semibold">Table of Contents</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`transition-transform ${tocOpen ? 'rotate-180' : ''}`}>
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {tocOpen && (
          <div className="border border-t-0 border-gray-200 dark:border-[#1e293b] bg-white dark:bg-[#0a0a0f]">
            {tocItems.map(({ id, num, title }) => (
              <button key={id} onClick={() => scrollTo(id)}
                className={`w-full text-left flex items-baseline gap-3 px-4 py-2.5 text-sm border-b border-gray-200 dark:border-[#1e293b] last:border-b-0 transition-colors ${
                  activeSection === id ? 'text-cyan-600 dark:text-cyan-400' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
                }`}>
                <span className="text-xs font-bold text-cyan-600 flex-shrink-0">{num}</span>
                <span>{title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Layout */}
      <div className="max-w-7xl mx-auto px-6 flex gap-12 items-start">

        {/* Desktop TOC sidebar */}
        <aside className="hidden lg:block w-56 xl:w-64 flex-shrink-0 sticky top-24 self-start">
          <div className="border-l-2 border-gray-200 dark:border-[#1e293b] pl-4">
            <p className="text-xs font-bold tracking-widest uppercase text-gray-400 dark:text-gray-600 mb-4">Contents</p>
            <nav className="space-y-0.5">
              {tocItems.map(({ id, num, title }) => (
                <button key={id} onClick={() => scrollTo(id)}
                  className={`w-full text-left flex items-baseline gap-2.5 py-1.5 text-xs transition-colors ${
                    activeSection === id ? 'text-cyan-600 dark:text-cyan-400 font-semibold' : 'text-gray-400 dark:text-gray-600 hover:text-gray-700 dark:hover:text-gray-400'
                  }`}>
                  <span className={`flex-shrink-0 font-bold ${activeSection === id ? 'text-cyan-600' : 'text-gray-400 dark:text-gray-700'}`}>{num}</span>
                  <span className="leading-snug">{title}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 max-w-3xl">

          <Divider />
          <section id="section-01" className="scroll-mt-24">
            <SectionNum>01 — Abstract</SectionNum>
            <H2>Abstract</H2>
            <P>QFLink is a fully on-chain messaging and community platform built on the QuantumFusion (QF) Network. Unlike existing social and messaging applications that rely on centralised servers, proprietary databases, or off-chain storage layers, QFLink stores every message, every community configuration, and every membership record as a smart-contract transaction on-chain. The result is a communication layer that is <Em>censorship-resistant</Em>, <Em>transparent</Em>, and <Em>permanently verifiable</Em> — without sacrificing the user experience expected of modern applications.</P>
            <P>This document describes the motivation, architecture, economic model, and roadmap of QFLink. It is intended for developers, token holders, and community participants who want to understand how QFLink works, why it is built the way it is, and where it is going.</P>
            <Blockquote><p>"The goal is not to rebuild Discord on the blockchain. The goal is to make blockchain-native communication so seamless that users never need to think about the underlying infrastructure."</p></Blockquote>
          </section>

          <Divider />
          <section id="section-02" className="scroll-mt-24">
            <SectionNum>02 — Introduction</SectionNum>
            <H2>Introduction &amp; Problem Statement</H2>
            <P>Modern communication platforms — Discord, Telegram, Slack — are powerful tools, but they share a fundamental structural weakness: <Strong>centralisation</Strong>. Every message you send is stored on servers owned by a private company. That company can be hacked, go bankrupt, be acquired, receive government orders to delete data, or simply choose to ban users and communities without recourse.</P>
            <P>The Web3 community, paradoxically, organises itself almost entirely on these centralised platforms. DAOs hold governance discussions on Discord. NFT projects announce mints on Twitter. DeFi protocols distribute alpha in Telegram groups. The communities that exist to decentralise financial infrastructure have no decentralised infrastructure for their own communication.</P>
            <H3>The Core Problems</H3>
            <UL>
              <li><Strong>No ownership.</Strong> You do not own your message history, your community members list, or your identity on these platforms.</li>
              <li><Strong>No persistence guarantees.</Strong> Platforms shut down. Servers go offline. Discord has already sunset features and entire API versions, breaking integrations overnight.</li>
              <li><Strong>No programmability.</Strong> You cannot write a smart contract that reacts to a message being sent, or prove in zero-knowledge that you are a member of a community.</li>
              <li><Strong>No composability.</Strong> Your community on Discord cannot natively interact with your DAO treasury on-chain. These worlds are separated by custodial bridges that introduce centralised failure points.</li>
            </UL>
            <HighlightBox title="Key Insight">
              <P>The problem is not that Web3 communities use Discord. The problem is that there has been no viable alternative. QFLink is that alternative — one that inherits the permanence and programmability of the chain while matching the usability of consumer messaging apps.</P>
            </HighlightBox>
          </section>

          <Divider />
          <section id="section-03" className="scroll-mt-24">
            <SectionNum>03 — Vision</SectionNum>
            <H2>The QFLink Vision</H2>
            <P>QFLink's vision is simple: <Em>every community interaction should be on-chain, composable, and owned by its participants.</Em></P>
            <P>We are building the community layer for QuantumFusion — a substrate of social infrastructure that other protocols, DAOs, NFT projects, and dApps can build on top of. A world where:</P>
            <UL>
              <li>A DAO can tie governance participation directly to activity in its QFLink Pod.</li>
              <li>An NFT collection can automatically create a members-only Pod for holders at mint time.</li>
              <li>A DeFi protocol can send on-chain alerts directly to subscribed wallets.</li>
              <li>Developers can query message history, membership records, and Pod configurations from any on-chain indexer without needing an API key.</li>
            </UL>
            <TwoCol>
              <TwoColItem>
                <H3>What QFLink Is</H3>
                <UL>
                  <li>A fully on-chain messaging protocol</li>
                  <li>A token-gated community platform</li>
                  <li>A composable social primitive for QF Network dApps</li>
                  <li>A permanent, verifiable communication record</li>
                </UL>
              </TwoColItem>
              <TwoColItem>
                <H3>What QFLink Is Not</H3>
                <UL>
                  <li>A centralised chat application with a blockchain badge</li>
                  <li>A social media feed or content discovery platform</li>
                  <li>A layer-2 or sidechain solution</li>
                  <li>An off-chain system with on-chain settlement</li>
                </UL>
              </TwoColItem>
            </TwoCol>
          </section>

          <Divider />
          <section id="section-04" className="scroll-mt-24">
            <SectionNum>04 — Architecture</SectionNum>
            <H2>Architecture &amp; Smart Contracts</H2>
            <P>QFLink is composed of two primary smart contracts deployed on QuantumFusion, written in plain Rust using the <Code>qf-polkavm-sdk</Code> and <Code>pallet-revive-uapi</Code> crates, compiled to PolkaVM bytecode. Both contracts are <Code>#![no_std]</Code> / <Code>#![no_main]</Code> binaries — there is no <Code>ink!</Code> DSL or macro layer. Both contracts are immutable once deployed per version, with upgrade paths managed through a master controller contract.</P>
            <H3>qflink-pods</H3>
            <P>The Pods contract manages community spaces. It handles Pod creation, configuration, member management, and message storage for Pod channels. Key storage structures include:</P>
            <UL>
              <li><Code>pods: Mapping&lt;PodId, Pod&gt;</Code> — core Pod metadata including name, description, creator, token gate config, and creation timestamp.</li>
              <li><Code>pod_members: Mapping&lt;(PodId, AccountId), MemberInfo&gt;</Code> — per-pod membership records with join timestamps and roles.</li>
              <li><Code>pod_messages: Mapping&lt;(PodId, u64), Message&gt;</Code> — indexed message storage keyed by Pod ID and sequential message index.</li>
              <li><Code>pod_message_count: Mapping&lt;PodId, u64&gt;</Code> — monotonic counter per Pod for deterministic message ordering.</li>
            </UL>
            <H3>qflink-messages</H3>
            <P>The Messages contract handles direct wallet-to-wallet messaging. It maintains separate conversation threads keyed by a canonically-ordered pair of account IDs, ensuring that the conversation between addresses A and B is always stored under the same key regardless of who initiates.</P>
            <UL>
              <li><Code>conversations: Mapping&lt;ConversationId, Vec&lt;Message&gt;&gt;</Code> — ordered message history per conversation pair.</li>
              <li><Code>conversation_index: Mapping&lt;AccountId, Vec&lt;ConversationId&gt;&gt;</Code> — index of all conversation IDs an account participates in.</li>
            </UL>
            <HighlightBox title="On Storage Costs">
              <P>On-chain storage is finite and metered. Every message written to contract storage consumes storage deposit on QF Network. QFLink is designed to make this cost transparent and predictable, surfacing estimated fees to users before every message send. Future versions will support configurable message retention windows with partial on-chain storage and content-addressed IPFS fallback for archived messages.</P>
            </HighlightBox>
            <H3>Contract Interactions</H3>
            <P>The frontend communicates with both contracts via <Code>@polkadot/api</Code> directly, using <Code>api.call.reviveApi.call()</Code> for dry-run reads and <Code>api.tx.revive.call()</Code> for signed writes. All reads are performed as RPC dry-run calls (no fee, no signature). All writes — creating a Pod, sending a message, joining a Pod — are submitted as signed extrinsics and confirmed on-chain before the UI updates.</P>
            <P>This means the QFLink UI has <Strong>no optimistic updates</Strong> for write operations. The UI waits for on-chain confirmation before reflecting a new message or membership state. While this introduces a 2–6 second latency per write on current QF Network block times, it guarantees that the UI state is always a faithful representation of the on-chain state.</P>
          </section>

          <Divider />
          <section id="section-05" className="scroll-mt-24">
            <SectionNum>05 — Pods</SectionNum>
            <H2>Pods: Token-Gated Community Spaces</H2>
            <P>A <Strong>Pod</Strong> is QFLink's primary community primitive. Think of a Pod as a Discord server, but one that exists entirely as a smart-contract state object. Anyone with a QF Network wallet can create a Pod. The Pod creator becomes its first admin.</P>
            <H3>Pod Configuration</H3>
            <P>Each Pod has the following configurable properties at creation time:</P>
            <UL>
              <li><Strong>Name</Strong> — display name, stored on-chain (max 64 bytes).</li>
              <li><Strong>Description</Strong> — short description, stored on-chain (max 256 bytes).</li>
              <li><Strong>Token Gate</Strong> — optional. If set, only wallets holding a specified asset (NFT contract or fungible token above a threshold) can join.</li>
              <li><Strong>Visibility</Strong> — public (listed in the Pod discovery index) or private (known only to those with the Pod ID).</li>
              <li><Strong>Creation Fee</Strong> — Pod creation requires a protocol fee paid in QF native tokens, anti-spam mechanism discussed in Section 09.</li>
            </UL>
            <H3>Joining a Pod</H3>
            <P>Joining a Pod is a signed on-chain transaction. When a user calls <Code>join_pod(pod_id)</Code>, the contract verifies the token gate condition (if any) by querying the relevant token contract. If the condition is satisfied, the caller's account is added to the Pod's member mapping with the current block timestamp.</P>
            <P>Token gate verification happens <Em>at join time only</Em>. A member who sells their qualifying token after joining retains their membership. This is an intentional design choice — it reflects the snapshot-based membership model used by most token-gated communities today. Future versions will support <Em>continuous eligibility checking</Em> as an opt-in Pod configuration.</P>
            <H3>Sending Messages in a Pod</H3>
            <P>Once a member, a wallet can call <Code>send_pod_message(pod_id, content)</Code>. The contract verifies membership, increments the Pod's message counter, and stores the message with sender, content, and block timestamp. Each message is permanently and immutably stored in contract state.</P>
            <Blockquote><p>There is no delete. There is no edit. Once a message is on-chain, it is part of the permanent record of that Pod. QFLink surfaces a UI warning to users before their first message to ensure this is understood.</p></Blockquote>
            <H3>Pod Moderation</H3>
            <P>Pod admins can <Em>ban</Em> a member — preventing them from sending future messages — but cannot delete messages already sent. This is enforced at the contract level. The immutability of past messages is a core guarantee of QFLink and cannot be overridden by admin action. See <Code>docs/pod-moderation-spec.md</Code> for the full moderation specification.</P>
          </section>

          <Divider />
          <section id="section-06" className="scroll-mt-24">
            <SectionNum>06 — Direct Messaging</SectionNum>
            <H2>Direct Messaging &amp; Encryption</H2>
            <P>QFLink supports wallet-to-wallet direct messages. Like Pod messages, DMs are stored on-chain as contract state. Unlike Pod messages, DMs between two parties are visible only to those two parties — not because they are hidden from the chain (all chain state is public), but because their content is <Strong>end-to-end encrypted</Strong> before being written on-chain.</P>
            <H3>Encryption Model</H3>
            <P>QFLink uses an X25519 Diffie-Hellman key exchange scheme to derive a shared secret between two parties. Each user generates (or derives from their wallet keypair) a <Code>curve25519</Code> key pair. When Alice sends a DM to Bob:</P>
            <OL>
              <li>Alice's frontend performs ECDH between Alice's private key and Bob's public key to derive a shared secret.</li>
              <li>The message content is encrypted with AES-256-GCM using the derived shared secret.</li>
              <li>The ciphertext is submitted on-chain as the message content.</li>
              <li>When Bob reads the message, his frontend performs the same ECDH derivation and decrypts the ciphertext locally.</li>
            </OL>
            <P>No server ever sees the plaintext. The chain stores only ciphertext. This gives QFLink DMs a strong end-to-end encryption guarantee, with the additional property that the <Em>existence</Em> of a conversation is publicly verifiable on-chain, even if the <Em>content</Em> is not.</P>
            <HighlightBox title="Limitations &amp; Future Work">
              <P>The current encryption implementation derives the encryption key deterministically from the wallet keypair. This is a pragmatic choice for a first version — it means users don't need to manage a separate keypair — but it ties message security to wallet key security. Future versions will support session keys and forward secrecy via a ratchet protocol.</P>
            </HighlightBox>
          </section>

          <Divider />
          <section id="section-07" className="scroll-mt-24">
            <SectionNum>07 — Competitive Landscape</SectionNum>
            <H2>Competitive Landscape</H2>
            <P>Several projects have attempted to build decentralised messaging and community infrastructure. QFLink occupies a distinct position: <Em>fully on-chain, no off-chain storage layer, no token-gated access to basic functionality</Em>.</P>
            <TableWrap>
              <thead>
                <tr><Th>Platform</Th><Th>On-Chain Messages</Th><Th>Token Gating</Th><Th>E2E Encryption</Th><Th>No Off-Chain DB</Th><Th>Composable</Th></tr>
              </thead>
              <tbody>
                <tr><Td strong>QFLink</Td><Td><Check /></Td><Td><Check /></Td><Td><Check /></Td><Td><Check /></Td><Td><Check /></Td></tr>
                <tr><Td strong>Discord</Td><Td><Cross /></Td><Td>Via bots only</Td><Td><Cross /></Td><Td><Cross /></Td><Td><Cross /></Td></tr>
                <tr><Td strong>Telegram</Td><Td><Cross /></Td><Td><Cross /></Td><Td>Optional</Td><Td><Cross /></Td><Td><Cross /></Td></tr>
                <tr><Td strong>Lens Protocol</Td><Td>Partial</Td><Td>Via modules</Td><Td><Cross /></Td><Td><Cross /></Td><Td><Check /></Td></tr>
                <tr><Td strong>XMTP</Td><Td><Cross /></Td><Td><Cross /></Td><Td><Check /></Td><Td><Cross /></Td><Td>Partial</Td></tr>
                <tr><Td strong>Push Protocol</Td><Td><Cross /></Td><Td>Via channels</Td><Td>Partial</Td><Td><Cross /></Td><Td>Partial</Td></tr>
              </tbody>
            </TableWrap>
            <P>The key differentiator is <Em>full on-chain storage with no off-chain dependency</Em>. Competitors like XMTP or Push Protocol provide a superior developer experience for applications that don't require full on-chain storage, and they are better suited for high-frequency notification use cases. QFLink is not trying to compete in those use cases — it is purpose-built for the use case where permanence, composability, and verifiability of every message matter.</P>
          </section>

          <Divider />
          <section id="integrations" className="scroll-mt-24">
            <SectionNum>08 — Ecosystem Integrations</SectionNum>
            <H2>Ecosystem Integrations</H2>
            <P>QFLink is designed not as an isolated application but as the social infrastructure layer that every dApp on the QuantumFusion network plugs into. Each integration creates a bidirectional value flow: the partner dApp gains a native community channel, and QFLink gains automatic user acquisition and pod activity. The following integrations reflect the seven dApps currently in active development by Dapp Lab, all building on QuantumFusion.</P>
            <H3>QFPad — Launch a Token, Launch a Community</H3>
            <P>QFPad is a token launchpad that lets creators deploy tokens on QuantumFusion in minutes. The QFLink integration adds a "Create Token-Gated Pod" option to the launch flow. When a creator launches a token, they can simultaneously create a QFLink pod where access is automatically gated by ownership of that token. The token contract address is passed directly from QFPad to the pod creation call, configuring the access rule without any manual setup. The creator pays a single bundled fee covering both the token deployment and the pod creation, with QFPad receiving a service fee for the integration. This means every token launched on QFPad can have a verified, token-gated community from the moment it goes live — no Telegram group to set up, no Collab.Land bot to configure, no manual holder verification.</P>
            <H3>QFClash — Challenge from Chat</H3>
            <P>QFClash is a Gwent-style PvP card game with season passes and on-chain ELO ratings. The QFLink integration enables players to initiate game sessions directly from a DM or pod conversation. A user sends a challenge from within the chat interface, the opponent accepts, and the QFClash match launches — all without leaving the QFLink context. Match results can post back into the conversation or pod as activity messages ("Alice defeated Bob — ELO: 1247 → 1263"), turning pod chat into a live competitive feed. Season pass holders can have their own gated pod for strategy discussion and tournament coordination, with access verified by season pass ownership on-chain.</P>
            <H3>QFStream — Creator Communities with Dual Revenue</H3>
            <P>QFStream is a decentralized video platform where every like equals a QF micropayment to the creator. QFLink provides the community layer that QFStream creators need to engage their audience beyond passive viewership. Creators link their QFStream channel to a QFLink pod — free or paid — where subscribers discuss content, receive new video notifications posted automatically into the pod, and interact directly with the creator. Creators who set a paid pod entry fee earn from two complementary streams: micropayments from QFStream likes and membership fees from their QFLink pod. The two products reinforce each other: QFStream drives awareness, QFLink drives retention and recurring revenue.</P>
            <H3>52F — Holder Communities with Built-In Retention</H3>
            <P>52F is a math-based lottery token where buy tax equals Euler's number and sell tax equals pi, featuring Fibonacci prize slots. A 52F community pod on QFLink, gated by a minimum token balance, gives holders a dedicated space to discuss strategies, track draws, and coordinate around prize events. The token-gating mechanic creates a natural retention incentive: holders who sell below the required balance lose access to the community pod, adding a social cost to selling that complements the mathematical tax structure.</P>
            <H3>quantumNotary — Notarize from Chat</H3>
            <P>quantumNotary provides blockchain receipts for any file. Within QFLink pods, particularly those used for DAO operations, business coordination, or legal discussions, users can notarize shared documents directly from the chat interface. A file is shared in the conversation, the notarization action is triggered, the quantumNotary contract records the hash on-chain, and the receipt posts back into the chat. This transforms QFLink from a communication tool into a workspace where agreements are both discussed and recorded in the same on-chain context.</P>
            <H3>Dappstore — Discovery to Engagement</H3>
            <P>Dappstore is an on-chain dApp discovery and distribution layer for the QuantumFusion network. Every dApp listed on Dappstore — including all Dapp Lab products — can surface a "Join Community" button linking to its QFLink pod. New users browsing Dappstore discover a project, read its description, and join its community in one action. Dappstore serves as the top-of-funnel discovery engine for the entire ecosystem, and QFLink converts that discovery into sustained engagement. As more dApps launch on QuantumFusion and list on Dappstore, the QFLink Explore page grows automatically.</P>
            <H3>NucleuX — From Trading to Community</H3>
            <P>NucleuX is the decentralized exchange being built for QuantumFusion. The integration surfaces a "Join Community" button on each token's trading page when that token has an associated QFLink pod. Traders move from price chart to community discussion in one click, without leaving the QF ecosystem for Telegram or Discord. For tokens launched on QFPad with a QFLink pod already configured, the entire user journey — launch on QFPad, community on QFLink, trade on NucleuX — is seamless and fully on-chain.</P>
            <HighlightBox title="Common Architectural Pattern">
              <P>These integrations share a common architectural pattern: each partner dApp calls the QFLink pods contract to either create a pod (QFPad), read pod membership (QFClash, QFStream, 52F), post activity messages (QFClash, QFStream, quantumNotary), or link to a pod's join flow (Dappstore, NucleuX). Because QFLink's pods contract exposes public functions for all of these operations, any future dApp on QuantumFusion can integrate with the same pattern — no partnership agreement, API key, or permission required. The community layer is composable by design.</P>
            </HighlightBox>
          </section>

          <Divider />
          <section id="section-09" className="scroll-mt-24">
            <SectionNum>09 — Tokenomics</SectionNum>
            <H2>Tokenomics &amp; Fee Model</H2>
            <P>QFLink does not have a native token. It runs entirely on QF Network's native token for gas and protocol fees. This is an intentional design choice: introducing a QFLink-specific token would add speculative complexity and create misaligned incentives between token price and protocol usage.</P>
            <H3>Protocol Fee Summary</H3>
            <StatGrid items={[
              { value: '0.1 QF', label: 'Pod Creation Fee' },
              { value: '~0.001 QF', label: 'Per Message (gas)' },
              { value: '500 QF', label: 'Max Paid Pod Entry' },
              { value: '0 QF', label: 'Read Operations' },
            ]} />
            <H3>Pod Creation Fee</H3>
            <P>Creating a Pod requires a one-time fee of <Strong>0.1 QF</Strong>. This fee serves as an anti-spam mechanism — it makes it economically unattractive to create thousands of junk Pods. The fee is sent to a protocol treasury address controlled by the QFLink development multisig. Future governance upgrades may route treasury funds to a community-controlled DAO.</P>
            <H3>Pod Access Types</H3>
            <P>QFLink supports four distinct Pod access configurations. Creators choose freely between them at Pod creation time — any combination of a token gate threshold and an entry fee is valid:</P>
            <TableWrap>
              <thead>
                <tr><Th>Access Type</Th><Th>Token Gate</Th><Th>Entry Fee</Th><Th>Example Use Case</Th></tr>
              </thead>
              <tbody>
                <tr><Td strong>Open</Td><Td><span className="text-gray-400 dark:text-gray-600">None</span></Td><Td><span className="text-gray-400 dark:text-gray-600">None</span></Td><Td>Public community Pod, no requirements</Td></tr>
                <tr><Td strong>Token-Gated</Td><Td><span className="text-cyan-600 dark:text-cyan-400">Threshold &gt; 0</span></Td><Td><span className="text-gray-400 dark:text-gray-600">None</span></Td><Td>Holders-only Pod (e.g. 10,000+ QF balance)</Td></tr>
                <tr><Td strong>Paid</Td><Td><span className="text-gray-400 dark:text-gray-600">None</span></Td><Td><span className="text-cyan-600 dark:text-cyan-400">Fee &gt; 0</span></Td><Td>Creator charges entry; any wallet can join</Td></tr>
                <tr><Td strong>Token-Gated + Paid</Td><Td><span className="text-cyan-600 dark:text-cyan-400">Threshold &gt; 0</span></Td><Td><span className="text-cyan-600 dark:text-cyan-400">Fee &gt; 0</span></Td><Td>Whale holders pay additional alpha-access fee</Td></tr>
              </tbody>
            </TableWrap>
            <H3>Paid Pod Entry Fees</H3>
            <P>Paid Pods are live on QFLink today. A Pod creator sets a one-time entry fee in QF tokens when creating the Pod. The fee is anchored to a fiat reference: the <Strong>maximum recommended entry fee is 500 QF, anchored to approximately $15 USD</Strong> at launch pricing. Creators may set any fee above the minimum of 1 QF — the $15 anchor applies to the 500 QF recommended ceiling, not a hard cap.</P>
            <P>When a user joins a Paid Pod, the <Code>join_pod(pod_id)</Code> contract call is payable. The contract enforces the exact fee amount, then immediately and atomically splits the payment on-chain:</P>
            <StatGrid items={[
              { value: '95%', label: "To Pod Creator's Payout Wallet" },
              { value: '5%', label: 'To Platform Treasury' },
            ]} />
            <P>The creator specifies a <Em>payout wallet</Em> at Pod creation time — it defaults to the creator's connected wallet but can be any valid QF address. The platform treasury address is set in the contract constructor and updateable only by the protocol admin via <Code>set_treasury(new_address)</Code>.</P>
            <HighlightBox title="Payment Rules">
              <P>All entry fees are in QF tokens only. Payment is one-time (lifetime access — no subscriptions in the current version). Payments are <Strong>non-refundable</Strong>, even if the member is later banned. Users pay before accessing Pod content — there is no preview. The revenue split is enforced at the smart-contract level and cannot be overridden by the Pod creator.</P>
            </HighlightBox>
            <H3>Message Gas Costs</H3>
            <P>Sending a message is a contract call on QF Network and incurs standard gas fees. The cost depends on the length of the message content (longer messages consume more storage and therefore more gas). The QFLink UI calculates and displays the estimated cost before submission. Current average cost per message is approximately <Strong>0.001 QF</Strong> at current network gas prices.</P>
            <H3>Storage Deposits</H3>
            <P>QF Network requires storage deposits for contract state. Every message written to contract storage locks a small amount of QF as a storage deposit. This deposit is permanently locked — it is not returned if the message could theoretically be deleted (which it cannot, by design). Users should be aware that sending many messages will lock small amounts of QF permanently.</P>
            <Blockquote><p>The economic cost of storing data forever on-chain is by design a feature, not a bug. It aligns user incentives: you pay a small permanent cost to store a permanent record. Free ephemeral messages belong on centralised servers. Permanent on-chain messages have a cost that reflects their permanence.</p></Blockquote>
          </section>

          <Divider />
          <section id="section-10" className="scroll-mt-24">
            <SectionNum>10 — Roadmap</SectionNum>
            <H2>Roadmap</H2>
            <P>QFLink is developed iteratively. Each phase ships a working product increment before work on the next phase begins. The following roadmap reflects the current plan as of the date of this document.</P>
            <div className="relative border-l-2 border-gray-200 dark:border-[#1e293b] pl-6 my-6">
              <TimelineItem phase="Phase 1 — Completed" title="Core Protocol & MVP" completed
                description={<>Deployment of <Code>qflink-pods</Code> and <Code>qflink-messages</Code> contracts on QF Network testnet. Basic UI for Pod creation, messaging, and DMs. Wallet connection via Polkadot.js extension.</>} />
              <TimelineItem phase="Phase 2 — Completed" title="Token Gating & Production Launch" completed
                description="Token-gated Pod support. End-to-end encryption for DMs. Production deployment on QF Network mainnet. Landing page and public launch." />
              <TimelineItem phase="Phase 3 — In Progress" title="Moderation, Roles & Pod Discovery"
                description="Full Pod moderation system (ban, mute, admin roles). Pod discovery index contract. Search and browse Pods. Light/dark mode UI polish and mobile responsiveness." />
              <TimelineItem phase="Phase 4 — Planned Q3 2026" title="Paid Pods & Creator Economy"
                description="Paid membership Pods with on-chain revenue routing to creators. Tipping and reactions as on-chain micro-transactions. Pod analytics dashboard." />
              <TimelineItem phase="Phase 5 — Planned Q4 2026" title="Protocol SDK & Composability"
                description="Public TypeScript SDK for QFLink contract interactions. Developer documentation and integration guides. First third-party integrations (DAO tooling, NFT launchpads)." />
              <TimelineItem phase="Phase 6 — Planned 2027" title="Governance & Community Ownership"
                description="On-chain governance for protocol parameters. Community treasury DAO. Potential QFLink-native token if ecosystem growth warrants it (community vote required)." />
            </div>
          </section>

          <Divider />
          <section id="section-11" className="scroll-mt-24">
            <SectionNum>11 — Security</SectionNum>
            <H2>Security &amp; Audits</H2>
            <P>QFLink's security model is built on the security of QF Network itself and the correctness of the two smart contracts. The following security properties are in scope:</P>
            <H3>Contract Security</H3>
            <UL>
              <li><Strong>Access control.</Strong> All privileged operations (creating a Pod, banning a member, updating Pod config) enforce on-chain ownership checks. There is no admin backdoor that bypasses contract logic.</li>
              <li><Strong>Reentrancy.</Strong> The contracts do not make external calls during state-modifying operations. Token gate checks are read-only calls and are performed before state changes, following the checks-effects-interactions pattern.</li>
              <li><Strong>Integer overflow.</Strong> Message counters use Rust's checked arithmetic. Overflow panics rather than wrapping silently.</li>
              <li><Strong>Storage exhaustion.</Strong> Storage deposits enforced by QF Network prevent unbounded storage growth from malicious actors.</li>
            </UL>
            <H3>Encryption Security</H3>
            <UL>
              <li>X25519 ECDH is a well-studied, widely deployed key exchange scheme.</li>
              <li>AES-256-GCM provides authenticated encryption — ciphertext tampering is detectable by the recipient.</li>
              <li>The current scheme does not provide forward secrecy. A compromised wallet key exposes all past DMs. This is a known limitation documented in Section 06.</li>
            </UL>
            <H3>Audit Status</H3>
            <P>The v1.0 contracts have undergone an internal security review. An independent third-party audit is scheduled for Q2 2026 ahead of the Phase 3 deployment. Audit reports will be published publicly in the QFLink repository.</P>
            <HighlightBox title="Responsible Disclosure">
              <P>Security vulnerabilities should be reported privately to the QFLink team before public disclosure. A responsible disclosure policy and contact details are available in the project repository. There is currently no bug bounty programme, but one is planned for launch alongside the Phase 3 release.</P>
            </HighlightBox>
          </section>

          <Divider />
          <section id="section-12" className="scroll-mt-24">
            <SectionNum>12 — Team</SectionNum>
            <H2>Team &amp; Contributors</H2>
            <P>QFLink is built by a small, focused team of community members from dApp Lab who are passionate about the QF ecosystem. The project is open-source, and contributions from the broader QuantumFusion ecosystem are actively welcomed.</P>
            <P>The core team operates pseudonymously consistent with the ethos of the broader Web3 community. Public contributions are tracked on-chain and in the open-source repository.</P>
            <H3>Contribution</H3>
            <P>QFLink's contracts and frontend are open-source. Developers who want to contribute should start with the issues labelled <Strong>good-first-issue</Strong> in the repository. The project follows a standard fork-and-PR workflow. All significant changes require discussion in the public QFLink Pod on QFLink itself — naturally.</P>
          </section>

          <Divider />
          <section id="section-13" className="scroll-mt-24">
            <SectionNum>13 — Conclusion</SectionNum>
            <H2>Conclusion</H2>
            <P>QFLink represents a first-principles approach to the question: <Em>what would messaging and community infrastructure look like if it were designed natively for a blockchain world?</Em></P>
            <P>The answer is not to bolt a blockchain onto an existing messaging app. It is to start from the chain and build upward — using smart contracts as the primitive, on-chain storage as the persistence layer, and wallet addresses as the identity system. The result is a platform that is architecturally incapable of censoring messages, losing data, or being taken away from its users.</P>
            <P>The tradeoffs are real: higher latency per write, cost per message, no free ephemeral communication. But for the communities that need permanence, verifiability, and composability — DAO communities, NFT projects, DeFi protocols, on-chain organisations of every kind — these tradeoffs are not just acceptable. They are desirable.</P>
            <P>QFLink is live on QuantumFusion today. Every message sent through it is a small act of infrastructure sovereignty. We believe that over time, the communities that choose to communicate on-chain will be the ones that outlast the servers of their centralised counterparts.</P>
            <Blockquote><p>Every message. On-chain. Forever.</p></Blockquote>
          </section>

          <Divider />
          <p className="text-xs text-gray-400 dark:text-gray-600 leading-relaxed pb-0">
            This document is provided for informational purposes only. It does not constitute financial advice, investment advice, or a solicitation to purchase any asset. QFLink is experimental software deployed on a live blockchain network. Users should exercise caution and understand the risks of interacting with smart contracts and on-chain storage before using QFLink. The QFLink team makes no warranties, express or implied, regarding the software or this document. Protocol parameters, fee structures, and roadmap items are subject to change. &copy; 2026 QFLink. All rights reserved.
          </p>

        </main>
      </div>

      <FooterCTA />
    </div>
  )
}

export default WhitepaperPage
