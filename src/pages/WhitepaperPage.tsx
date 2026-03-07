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
            <P>QFLink is composed of a modular multi-contract system deployed on QuantumFusion, written in Solidity 0.8.x and compiled with <Code>resolc</Code> (the Revive compiler) to PolkaVM bytecode. The contracts are deployed via the <Code>pallet-revive</Code> EVM compatibility layer, enabling standard EVM tooling and wallet compatibility. The architecture separates concerns across storage, logic, and read layers for maintainability and upgradeability.</P>
            <H3>Storage Layer</H3>
            <P>Storage contracts hold the protocol state and are designed to be persistent across logic upgrades:</P>
            <UL>
              <li><Code>QFLinkRegistry</Code> — user registration and account mapping.</li>
              <li><Code>QFLinkPodsStorage</Code> — pod state, members, bans, and moderator lists. Key structures include <Code>mapping(uint64 =&gt; Pod) pods</Code> and <Code>mapping(uint64 =&gt; mapping(address =&gt; bool)) podMembers</Code>.</li>
              <li><Code>QFLinkPayments</Code> — fee handling, treasury accounting, and payment splits.</li>
              <li><Code>QFLinkMessageStorage</Code> — pod message storage with sequential indexing.</li>
              <li><Code>QFLinkDMStorage</Code> — direct message storage between wallet pairs.</li>
            </UL>
            <H3>Logic Layer</H3>
            <P>Logic contracts contain the executable business logic and interact with storage contracts:</P>
            <UL>
              <li><Code>QFLinkPodsCreate</Code> — pod creation with 500 QF protocol fee.</li>
              <li><Code>QFLinkPodsCreatePaid</Code> — paid pod creation with creator-defined entry fees.</li>
              <li><Code>QFLinkPodsJoin</Code> — joining logic with fee splitting between creator and treasury.</li>
              <li><Code>QFLinkPodsLeave</Code> — member exit handling.</li>
              <li><Code>QFLinkPodsAddMod / QFLinkPodsRemoveMod</Code> — moderator management (up to 3 per pod).</li>
              <li><Code>QFLinkPodsBan</Code> — ban and unban functionality.</li>
            </UL>
            <H3>Read Layer</H3>
            <P>Read-optimized contracts provide efficient data access without modifying state:</P>
            <UL>
              <li><Code>QFLinkPodsReader</Code> — aggregated pod data queries.</li>
              <li><Code>QFLinkPodsGetPod</Code> — individual pod detail queries.</li>
              <li><Code>QFLinkMessageReader</Code> — pod message history retrieval.</li>
              <li><Code>QFLinkDMReader</Code> — direct message conversation retrieval.</li>
            </UL>
            <HighlightBox title="On Storage Costs">
              <P>On-chain storage is finite and metered. Every message written to contract storage consumes storage deposit on QF Network. QFLink is designed to make this cost transparent and predictable, surfacing estimated fees to users before every message send. Future versions will support configurable message retention windows with partial on-chain storage and content-addressed IPFS fallback for archived messages.</P>
            </HighlightBox>
            <H3>Contract Interactions</H3>
            <P>The frontend communicates with contracts via <Code>viem</Code> for type-safe EVM interactions through the <Code>eth-rpc</Code> proxy layer that translates EVM JSON-RPC calls to Substrate extrinsics. Wallet connection is via MetaMask and other EVM-compatible wallets — not Polkadot.js extension. All reads are performed as standard <Code>eth_call</Code> operations (no fee, no signature). All writes — creating a Pod, sending a message, joining a Pod — are submitted as signed EVM transactions and confirmed on-chain before the UI updates.</P>
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
              <li><Strong>Name</Strong> — display name, stored on-chain as <Code>bytes32</Code> (max 32 bytes).</li>
              <li><Strong>Description</Strong> — short description, stored on-chain as <Code>bytes</Code> (max ~200 bytes, enforced by gas limit).</li>
              <li><Strong>Category</Strong> — stored on-chain as <Code>bytes32</Code>. Options: Trading, Tokens, NFTs, DeFi, Gaming, Builders, Social, Alpha.</li>
              <li><Strong>Token Gate</Strong> — optional minimum QF balance threshold, verified at join time.</li>
              <li><Strong>Visibility</Strong> — public (listed on the Explore page) or private (known only to those with the Pod ID).</li>
              <li><Strong>Creation Fee</Strong> — 500 QF (95% to protocol treasury, 5% burned).</li>
              <li><Strong>Entry Fee</Strong> — optional fee set by creator for paid pods (95% to creator, 5% to treasury).</li>
              <li><Strong>Moderators</Strong> — all pods support up to 3 moderators appointed by the creator.</li>
            </UL>
            <H3>Pod Types</H3>
            <P>All pods cost 500 QF to create with identical features. There is no longer a distinction between "free" and "pro" pod types. Creators can optionally set an entry fee that joiners must pay to access the pod.</P>
            <H3>Joining a Pod</H3>
            <P>Joining a Pod is a signed on-chain transaction. When a user calls the join function, the contract verifies the token gate condition (if any) by checking the caller's QF balance. If an entry fee is set, the payment is split 95% to the creator and 5% to the protocol treasury. If the conditions are satisfied, the caller's address is added to the pod's member mapping.</P>
            <P>Token gate verification happens <Em>at join time only</Em>. A member who sells their qualifying tokens after joining retains their membership. This is an intentional design choice — it reflects the snapshot-based membership model used by most token-gated communities today. Future versions will support <Em>continuous eligibility checking</Em> as an opt-in pod configuration.</P>
            <H3>Sending Messages in a Pod</H3>
            <P>Once a member, a wallet can call the send message function. The contract verifies membership, increments the pod's message counter, and stores the message with sender, content, and block timestamp. Each message is permanently and immutably stored in contract state.</P>
            <Blockquote><p>There is no delete. There is no edit. Once a message is on-chain, it is part of the permanent record of that Pod. QFLink surfaces a UI warning to users before their first message to ensure this is understood.</p></Blockquote>
            <H3>Pod Moderation</H3>
            <P>Pod creators and appointed moderators can <Em>ban</Em> a member — preventing them from sending future messages — but cannot delete messages already sent. This is enforced at the contract level. The immutability of past messages is a core guarantee of QFLink and cannot be overridden by admin action. Creators can appoint up to 3 moderators per pod.</P>
          </section>

          <Divider />
          <section id="section-06" className="scroll-mt-24">
            <SectionNum>06 — Direct Messaging</SectionNum>
            <H2>Direct Messaging &amp; Encryption</H2>
            <P>QFLink supports wallet-to-wallet direct messages. DMs are stored on-chain as contract state and are fully functional. Each conversation is keyed by a canonically-ordered pair of addresses, ensuring that the conversation between addresses A and B is always stored under the same key regardless of who initiates.</P>
            <H3>Current Implementation</H3>
            <P>DMs are currently stored as <Strong>plaintext on-chain</Strong>. While the conversation is only accessible to the two participants through the UI, the content is visible on-chain to anyone with access to query the contract state. We believe in transparency about this — users should understand that their DMs are not currently encrypted.</P>
            <H3>Planned Encryption Model</H3>
            <P>End-to-end encryption is planned for a future release. The planned implementation uses an X25519 Diffie-Hellman key exchange scheme to derive a shared secret between two parties:</P>
            <OL>
              <li>Each user generates (or derives from their wallet keypair) a <Code>curve25519</Code> key pair.</li>
              <li>When Alice sends a DM to Bob, Alice's frontend performs ECDH between Alice's private key and Bob's public key to derive a shared secret.</li>
              <li>The message content is encrypted with AES-256-GCM using the derived shared secret.</li>
              <li>The ciphertext is submitted on-chain as the message content.</li>
              <li>When Bob reads the message, his frontend performs the same ECDH derivation and decrypts the ciphertext locally.</li>
            </OL>
            <P>This model would ensure that no server ever sees the plaintext — only ciphertext would be stored on-chain. The <Em>existence</Em> of a conversation would remain publicly verifiable on-chain, even if the <Em>content</Em> is not readable without the shared secret.</P>
            <HighlightBox title="Transparency Note">
              <P>We are committed to being honest about the current state of DM encryption. Current DMs are plaintext on-chain. Do not send sensitive information through QFLink DMs until end-to-end encryption is implemented and deployed. Transparency builds trust, and we want users to make informed decisions about their communication.</P>
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
                <tr><Td strong>QFLink</Td><Td><Check /></Td><Td><Check /></Td><Td>Planned</Td><Td><Check /></Td><Td><Check /></Td></tr>
                <tr><Td strong>Discord</Td><Td><Cross /></Td><Td>Via bots only</Td><Td><Cross /></Td><Td><Cross /></Td><Td><Cross /></Td></tr>
                <tr><Td strong>Telegram</Td><Td><Cross /></Td><Td><Cross /></Td><Td>Optional</Td><Td><Cross /></Td><Td><Cross /></Td></tr>
                <tr><Td strong>Lens Protocol</Td><Td>Partial</Td><Td>Via modules</Td><Td><Cross /></Td><Td><Cross /></Td><Td><Check /></Td></tr>
                <tr><Td strong>XMTP</Td><Td><Cross /></Td><Td><Cross /></Td><Td><Check /></Td><Td><Cross /></Td><Td>Partial</Td></tr>
                <tr><Td strong>Push Protocol</Td><Td><Cross /></Td><Td>Via channels</Td><Td>Partial</Td><Td><Cross /></Td><Td>Partial</Td></tr>
              </tbody>
            </TableWrap>
            <H3>Fee Comparison</H3>
            <TableWrap>
              <thead>
                <tr><Th>Platform</Th><Th>Platform Fee</Th></tr>
              </thead>
              <tbody>
                <tr><Td strong>QFLink</Td><Td>5% of entry fees, 0% monthly</Td></tr>
                <tr><Td strong>Patreon</Td><Td>8-12% + 2.9% + $0.30 per transaction</Td></tr>
                <tr><Td strong>Whop</Td><Td>3% transaction fee</Td></tr>
                <tr><Td strong>Discord</Td><Td>Free but no monetization</Td></tr>
                <tr><Td strong>Telegram</Td><Td>Free but no monetization</Td></tr>
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
            <TableWrap>
              <thead>
                <tr><Th>Fee</Th><Th>Amount</Th></tr>
              </thead>
              <tbody>
                <tr><Td strong>Pod Creation Fee</Td><Td>500 QF (95% treasury, 5% burned)</Td></tr>
                <tr><Td strong>Paid Pod Entry Fee</Td><Td>Set by creator (95% to creator, 5% to treasury)</Td></tr>
                <tr><Td strong>Per Message</Td><Td>~gas cost in QF</Td></tr>
                <tr><Td strong>Read Operations</Td><Td>0 QF</Td></tr>
              </tbody>
            </TableWrap>
            <H3>Pod Creation Fee</H3>
            <P>Creating a Pod requires a one-time fee of <Strong>500 QF</Strong>. This fee serves as an anti-spam mechanism — it makes it economically unattractive to create thousands of junk Pods. The fee is split: <Strong>95% to the protocol treasury</Strong> and <Strong>5% burned</Strong>. The treasury is controlled by the QFLink development multisig. Future governance upgrades may route treasury funds to a community-controlled DAO.</P>
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
            <P>Paid Pods are live on QFLink today. A Pod creator sets a one-time entry fee in QF tokens when creating the Pod. Entry fees are set by creators with <Strong>no maximum cap</Strong> — creators are free to price access to their communities according to their own valuation.</P>
            <P>When a user joins a Paid Pod, the contract call is payable. The contract enforces the exact fee amount, then immediately and atomically splits the payment on-chain:</P>
            <StatGrid items={[
              { value: '95%', label: "To Pod Creator's Payout Wallet" },
              { value: '5%', label: 'To Platform Treasury' },
            ]} />
            <P>The creator specifies a <Em>payout wallet</Em> at Pod creation time — it defaults to the creator's connected wallet but can be any valid QF address. The platform treasury address is set in the contract constructor and updateable only by the protocol admin.</P>
            <HighlightBox title="Payment Rules">
              <P>All entry fees are in QF tokens only. Payment is one-time (lifetime access — no subscriptions in the current version). Payments are <Strong>non-refundable</Strong>, even if the member is later banned. Users pay before accessing Pod content — there is no preview. The revenue split is enforced at the smart-contract level and cannot be overridden by the Pod creator.</P>
            </HighlightBox>
            <H3>Message Gas Costs</H3>
            <P>Sending a message is a contract call on QF Network and incurs standard gas fees. The cost depends on the length of the message content (longer messages consume more storage and therefore more gas). The QFLink UI calculates and displays the estimated cost before submission. Current average cost per message is approximately <Strong>~0.001 QF</Strong> at current network gas prices.</P>
            <H3>Storage Deposits</H3>
            <P>QF Network requires storage deposits for contract state. Every message written to contract storage locks a small amount of QF as a storage deposit. This deposit is permanently locked — it is not returned if the message could theoretically be deleted (which it cannot, by design). Users should be aware that sending many messages will lock small amounts of QF permanently.</P>
            <Blockquote><p>The economic cost of storing data forever on-chain is by design a feature, not a bug. It aligns user incentives: you pay a small permanent cost to store a permanent record. Free ephemeral messages belong on centralised servers. Permanent on-chain messages have a cost that reflects their permanence.</p></Blockquote>
          </section>

          <Divider />
          <section id="section-10" className="scroll-mt-24">
            <SectionNum>10 — Roadmap</SectionNum>
            <H2>Roadmap</H2>
            <P>QFLink is developed iteratively. Each phase ships a working product increment before work on the next phase begins. The following roadmap reflects the current state of the project.</P>
            <div className="relative border-l-2 border-gray-200 dark:border-[#1e293b] pl-6 my-6">
              <TimelineItem phase="Phase 1 — Completed" title="Core Protocol" completed
                description="Core protocol deployment, pod creation, messaging, DMs, wallet connection." />
              <TimelineItem phase="Phase 2 — Completed" title="Token Gating & Monetization" completed
                description="Token gating, paid pods with fee splitting, Solidity migration, EVM compatibility." />
              <TimelineItem phase="Phase 3 — Completed" title="Moderation & Discovery" completed
                description="Moderation (ban/unban, moderator management), pod categories and descriptions, pod discovery (Explore page), unread indicators, browser notifications, light/dark theme." />
              <TimelineItem phase="Phase 4 — In Progress" title="Identity & Infrastructure"
                description="QNS (Quantum Name Service) integration for human-readable identities, DM encryption, proxy pattern for upgradeable contracts, mainnet deployment." />
              <TimelineItem phase="Phase 5 — Planned" title="Creator Tools & SDK"
                description="Tipping and reactions, pod analytics dashboard, TypeScript SDK, third-party integrations, continuous token-gate re-checking." />
              <TimelineItem phase="Phase 6 — Planned" title="Governance & Scale"
                description="On-chain governance, community treasury DAO, IPFS fallback for message archival, forward-secrecy DM encryption." />
            </div>
          </section>

          <Divider />
          <section id="section-11" className="scroll-mt-24">
            <SectionNum>11 — Security</SectionNum>
            <H2>Security &amp; Audits</H2>
            <P>QFLink's security model is built on the security of QF Network itself and the correctness of the smart contract system. The following security properties are in scope:</P>
            <H3>Contract Security</H3>
            <UL>
              <li><Strong>Access control.</Strong> All privileged operations (creating a Pod, banning a member, updating Pod config) enforce on-chain ownership checks. There is no admin backdoor that bypasses contract logic.</li>
              <li><Strong>Reentrancy.</Strong> The contracts do not make external calls during state-modifying operations. Token gate checks are read-only calls and are performed before state changes, following the checks-effects-interactions pattern.</li>
              <li><Strong>Integer overflow.</Strong> Solidity 0.8.x provides built-in overflow protection. Arithmetic operations revert on overflow/underflow rather than wrapping silently.</li>
              <li><Strong>Storage exhaustion.</Strong> Storage deposits enforced by QF Network prevent unbounded storage growth from malicious actors.</li>
            </UL>
            <H3>Encryption Security</H3>
            <UL>
              <li>End-to-end encryption for DMs is planned but not yet implemented.</li>
              <li>The planned implementation uses X25519 ECDH, a well-studied, widely deployed key exchange scheme.</li>
              <li>AES-256-GCM will provide authenticated encryption — ciphertext tampering will be detectable by the recipient.</li>
              <li>Forward secrecy is planned for a future release via a ratchet protocol.</li>
            </UL>
            <H3>Audit Status</H3>
            <P>The v1.0 Solidity contracts have passed a four-phase internal audit covering access control (9/10), fee math verification (all correct), edge case testing (11/12), and static analysis (no critical vulnerabilities). An independent third-party audit is planned before significant TVL accumulates. Audit reports will be published publicly in the QFLink repository.</P>
            <HighlightBox title="Responsible Disclosure">
              <P>Security vulnerabilities should be reported privately to the QFLink team before public disclosure. A responsible disclosure policy and contact details are available in the project repository. There is currently no bug bounty programme, but one is planned for a future release.</P>
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
