/**
 * contractCalls.ts — PAPI-based contract interaction layer
 *
 * Reads: callContract() → typedApi.apis.ReviveApi.call()
 * Writes: writeContract() → typedApi.tx.Revive.call().signSubmitAndWatch()
 * ABI encoding/decoding: viem (encodeFunctionData / decodeFunctionResult)
 */

import {
  stringToHex,
  hexToString,
  toHex,
  fromHex,
} from "viem";

import { callContract, writeContract } from "./contractHelpers";
import type { TxResult } from './contractHelpers';
import { getCurrentConnection } from "./wallet";
import { CONTRACT_ADDRESSES } from "./contracts";
import { registryAbi, podsReaderAbi, paymentsAbi, messagesReaderAbi, messagesWriterAbi } from "./abi";

// Helper to convert readonly ABI arrays to mutable
const toMutable = <T>(arr: readonly T[]): T[] => [...arr];

import { podsCreateAbi } from "@/abi/podsCreate";
import { podsJoinAbi } from "@/abi/podsJoin";
import { podsLeaveAbi } from "@/abi/podsLeave";
import { podsBanAbi } from "@/abi/podsBan";
import { podsAddModAbi } from "@/abi/podsAddMod";
import { podsRemoveModAbi } from "@/abi/podsRemoveMod";
import { podsAdminAbi } from "@/abi/podsAdmin";
import { podsGetPodAbi } from "@/abi/podsGetPod";
import { podsCreatePaidAbi } from "@/abi/podsCreatePaid";

// ── Helpers ──

function toBytes32(s: string): `0x${string}` {
  return stringToHex(s, { size: 32 });
}

function fromBytes32(b: `0x${string}`): string {
  return hexToString(b, { size: 32 }).replace(/\0/g, "");
}

// ============================================================
//  REGISTRY — reads
// ============================================================

export interface UserProfile {
  displayName: string;
  encryptionPubkey: `0x${string}`;
  registeredAt: bigint;
}

export async function getProfile(address: `0x${string}`): Promise<UserProfile | null> {
  try {
    const result = await callContract(
      CONTRACT_ADDRESSES.registry,
      toMutable(registryAbi),
      "getProfile",
      [address]
    );
    const [displayNameB32, encryptionPubkey, registeredAt] = result as any;
    if (registeredAt === 0n) return null;
    return {
      displayName: fromBytes32(displayNameB32 as `0x${string}`),
      encryptionPubkey: encryptionPubkey as `0x${string}`,
      registeredAt,
    };
  } catch (err) {
    const errStr = String(err);
    if (errStr.includes("UserNotFound") || errStr.includes("reverted")) return null;
    console.error("[contractCalls.getProfile] Error:", err);
    return null;
  }
}

export async function getUserCount(): Promise<bigint> {
  try {
    return await callContract(CONTRACT_ADDRESSES.registry, toMutable(registryAbi), "getUserCount");
  } catch {
    return 0n;
  }
}

// v1 stubs
export async function getLinkedWallets(_: `0x${string}`): Promise<string[]> { return []; }
export async function isGloballyBanned(_: `0x${string}`): Promise<boolean> { return false; }

// ============================================================
//  REGISTRY — writes
// ============================================================

export async function registerProfile(displayName: string, encryptionPubkey: `0x${string}`): Promise<TxResult> {
  return writeContract(
    CONTRACT_ADDRESSES.registry,
    toMutable(registryAbi),
    "register",
    [toBytes32(displayName), encryptionPubkey]
  );
}

export async function updateProfile(displayName: string, encryptionPubkey: `0x${string}`): Promise<TxResult> {
  return writeContract(
    CONTRACT_ADDRESSES.registry,
    toMutable(registryAbi),
    "updateProfile",
    [toBytes32(displayName), encryptionPubkey]
  );
}

// v1 stubs
export async function linkWallet(_: `0x${string}`) { throw new Error("Not available in v1"); }
export async function confirmLink(_: `0x${string}`) { throw new Error("Not available in v1"); }
export async function unlinkWallet(_: `0x${string}`) { throw new Error("Not available in v1"); }
export async function globalBan(_: `0x${string}`) { throw new Error("Not available in v1"); }
export async function globalUnban(_: `0x${string}`) { throw new Error("Not available in v1"); }

// ============================================================
//  PODS — reads
// ============================================================

export interface PodData {
  id: bigint;
  name: string;
  description: string;
  minBalance: bigint;
  creator: string;
  createdAt: bigint;
  isDefault: boolean;
  podType: number;
  tier: number;
  entryFee?: bigint;
  payoutWallet?: string;
  memberCount: number;
  isPublic: boolean;
  threshold: bigint;
  modCount: number;
  category: string;
}

export async function getPodCount(): Promise<number> {
  try {
    const result = await callContract(CONTRACT_ADDRESSES.podsReader, toMutable(podsReaderAbi), "getPodCount");
    return Number(result);
  } catch {
    return 0;
  }
}

export async function getPod(podId: number): Promise<PodData | null> {
  try {
    const result = await callContract(
      CONTRACT_ADDRESSES.podsGetPod,
      toMutable(podsGetPodAbi),
      "getPod",
      [BigInt(podId)]
    );
    const [nameB32, creator, isPublic, tier, memberCount, modCount, threshold, categoryB32, descriptionBytes] = result as any;

    const name = fromBytes32(nameB32 as `0x${string}`);
    const category = fromHex(categoryB32 as `0x${string}`, "string").replace(/\0/g, "");
    const description = fromHex(descriptionBytes as `0x${string}`, "string");
    const creatorAddr = (creator as string).toLowerCase();

    if (creatorAddr === "0x0000000000000000000000000000000000000000") return null;

    return {
      id: BigInt(podId),
      name: name || `Pod ${podId}`,
      description: description || "",
      minBalance: threshold as bigint,
      creator: creatorAddr,
      createdAt: 0n,
      isDefault: false,
      podType: 0,
      tier: Number(tier),
      memberCount: Number(memberCount),
      modCount: Number(modCount),
      isPublic: isPublic as boolean,
      threshold: threshold as bigint,
      category: category || "trading",
    };
  } catch (err) {
    console.error(`[contractCalls.getPod] Error for pod ${podId}:`, err);
    return null;
  }
}

export async function getAllPods(): Promise<PodData[]> {
  const count = await getPodCount();
  const pods: PodData[] = [];
  for (let i = 1; i <= count; i++) {
    const pod = await getPod(i);
    if (pod) pods.push(pod);
  }
  return pods;
}

export async function getUserPods(address: `0x${string}`): Promise<number[]> {
  try {
    const count = await getPodCount();
    if (count === 0) return [];
    const checks = await Promise.all(
      Array.from({ length: count }, (_, i) => {
        const podId = i + 1;
        return isMember(podId, address).then((m) => ({ podId, isMember: m }));
      })
    );
    return checks.filter(({ isMember }) => isMember).map(({ podId }) => podId);
  } catch {
    return [];
  }
}

export async function getPodMemberCount(podId: number): Promise<number> {
  try {
    const result = await callContract(CONTRACT_ADDRESSES.podsReader, toMutable(podsReaderAbi), "getMemberCount", [BigInt(podId)]);
    return Number(result);
  } catch { return 0; }
}

export async function getModCount(podId: number): Promise<number> {
  try {
    const result = await callContract(CONTRACT_ADDRESSES.podsReader, toMutable(podsReaderAbi), "getModCount", [BigInt(podId)]);
    return Number(result);
  } catch { return 0; }
}

export async function checkPodAccess(podId: number, address: `0x${string}`): Promise<{ granted: boolean; code: number }> {
  try {
    const result = await callContract(CONTRACT_ADDRESSES.podsReader, toMutable(podsReaderAbi), "checkPodAccess", [BigInt(podId), address]);
    return { granted: result as boolean, code: result ? 0 : 1 };
  } catch {
    return { granted: false, code: 255 };
  }
}

export async function isBanned(podId: number, address: `0x${string}`): Promise<boolean> {
  try { return await callContract(CONTRACT_ADDRESSES.podsReader, toMutable(podsReaderAbi), "isBanned", [BigInt(podId), address]); } catch { return false; }
}

export async function isMod(podId: number, address: `0x${string}`): Promise<boolean> {
  try { return await callContract(CONTRACT_ADDRESSES.podsReader, toMutable(podsReaderAbi), "isMod", [BigInt(podId), address]); } catch { return false; }
}

export async function isMember(podId: number, address: `0x${string}`): Promise<boolean> {
  try { return await callContract(CONTRACT_ADDRESSES.podsReader, toMutable(podsReaderAbi), "isMember", [BigInt(podId), address]); } catch { return false; }
}

export async function getCreator(podId: number): Promise<string | null> {
  try {
    const result = await callContract(CONTRACT_ADDRESSES.podsReader, toMutable(podsReaderAbi), "getCreator", [BigInt(podId)]);
    return (result as string).toLowerCase();
  } catch { return null; }
}

export async function getPodTier(podId: number): Promise<number> {
  try { return Number(await callContract(CONTRACT_ADDRESSES.podsReader, toMutable(podsReaderAbi), "getPodTier", [BigInt(podId)])); } catch { return 0; }
}

export async function getEntryFee(podId: number): Promise<bigint> {
  try { return await callContract(CONTRACT_ADDRESSES.payments, toMutable(paymentsAbi), "getEntryFee", [BigInt(podId)]); } catch { return 0n; }
}

export async function hasPaid(podId: number, address: `0x${string}`): Promise<boolean> {
  try { return await callContract(CONTRACT_ADDRESSES.payments, toMutable(paymentsAbi), "hasPaid", [BigInt(podId), address]); } catch { return false; }
}

export async function getPodMembersFromCandidates(podId: number, candidates: string[]): Promise<string[]> {
  try {
    const results = await Promise.all(
      candidates.map(async (addr) => ({ addr, m: await isMember(podId, addr as `0x${string}`) }))
    );
    return results.filter(({ m }) => m).map(({ addr }) => addr.toLowerCase());
  } catch { return []; }
}

export async function getPodMembers(_: number): Promise<string[]> { return []; }

export async function getModsFromCandidates(podId: number, candidates: string[]): Promise<string[]> {
  try {
    const results = await Promise.all(
      candidates.map(async (addr) => ({ addr, m: await isMod(podId, addr as `0x${string}`) }))
    );
    return results.filter(({ m }) => m).map(({ addr }) => addr.toLowerCase());
  } catch { return []; }
}

export async function getMods(_: number): Promise<string[]> { return []; }

// Stubs
export async function getProFee(): Promise<bigint> { return 0n; }
export async function getTreasury(): Promise<string | null> { return null; }

// ============================================================
//  MESSAGES — reads
// ============================================================

export interface RawPodMessage {
  sender: string;
  content: string;
  timestamp: number;
  id: number;
}

async function _fetchMessage(id: bigint) {
  const result = await callContract(CONTRACT_ADDRESSES.messageReader, toMutable(messagesReaderAbi), "getMessage", [id]);
  const [sender, timestamp, content, podId, recipient] = result as any;
  return {
    sender: (sender as string).toLowerCase(),
    timestamp: Number(timestamp as bigint) * 1000,
    content: content as string,
    podId: Number(podId),
    recipient: (recipient as string).toLowerCase(),
  };
}

export async function getPodMessages(podId: number, start = 0, limit = 100): Promise<RawPodMessage[]> {
  try {
    const ids = await callContract(
      CONTRACT_ADDRESSES.messageReader, toMutable(messagesReaderAbi),
      "getPodMessageIds", [BigInt(podId), BigInt(start), BigInt(limit)]
    ) as bigint[];
    return await Promise.all(ids.map(async (id) => {
      const m = await _fetchMessage(id);
      return { id: Number(id), sender: m.sender, content: m.content, timestamp: m.timestamp };
    }));
  } catch { return []; }
}

export async function getPodMessageCount(podId: number): Promise<number> {
  try { return Number(await callContract(CONTRACT_ADDRESSES.messageReader, toMutable(messagesReaderAbi), "getPodMessageCount", [BigInt(podId)])); } catch { return 0; }
}

export interface DirectMessageData {
  sender: string;
  recipient: string;
  content: string;
  timestamp: number;
}

export async function getMessages(addr1: `0x${string}`, addr2: `0x${string}`, start = 0, limit = 50): Promise<DirectMessageData[]> {
  try {
    const ids = await callContract(
      CONTRACT_ADDRESSES.messageReader, toMutable(messagesReaderAbi),
      "getDirectMessageIds", [addr1, addr2, BigInt(start), BigInt(limit)]
    ) as bigint[];
    return await Promise.all(ids.map(async (id) => {
      const m = await _fetchMessage(id);
      return {
        sender: m.sender,
        recipient: m.sender === addr1.toLowerCase() ? addr2.toLowerCase() : addr1.toLowerCase(),
        content: m.content,
        timestamp: m.timestamp,
      };
    }));
  } catch { return []; }
}

export async function getDirectMessageIds(addr1: `0x${string}`, addr2: `0x${string}`, start = 0, limit = 50): Promise<bigint[]> {
  try {
    return await callContract(
      CONTRACT_ADDRESSES.messageReader, toMutable(messagesReaderAbi),
      "getDirectMessageIds", [addr1, addr2, BigInt(start), BigInt(limit)]
    ) as bigint[];
  } catch { return []; }
}

export async function getConversations(address: `0x${string}`): Promise<string[]> {
  try {
    const result = await callContract(CONTRACT_ADDRESSES.messageReader, toMutable(messagesReaderAbi), "getConversations", [address]);
    return (result as string[]).map((a: string) => a.toLowerCase());
  } catch { return []; }
}

export async function getMessageCount(): Promise<number> {
  try { return Number(await callContract(CONTRACT_ADDRESSES.messageReader, toMutable(messagesReaderAbi), "getMessageCount")); } catch { return 0; }
}

// ============================================================
//  PODS — writes
// ============================================================

export async function createPod(
  name: string,
  description: string,
  threshold: bigint = 0n,
  _entryFee: bigint = 0n,
  _payoutWallet?: `0x${string}`,
  category: string = "trading"
): Promise<TxResult> {
  const descriptionHex = toHex(new TextEncoder().encode(description.slice(0, 256)));
  const CREATION_FEE = await getCreationFee('create');
  return writeContract(
    CONTRACT_ADDRESSES.podsCreate,
    toMutable(podsCreateAbi),
    "createPod",
    [toBytes32(name.trim()), true, threshold, toBytes32(category), descriptionHex],
    CREATION_FEE
  );
}

export async function createPaidPod(
  name: string,
  isPublic: boolean,
  threshold: bigint,
  entryFee: bigint,
  creationFee: bigint,
  category: string = "trading",
  description: string = ""
): Promise<TxResult> {
  const descriptionHex = toHex(new TextEncoder().encode(description.slice(0, 256)));
  const actualCreationFee = await getCreationFee('createPaid');
  return writeContract(
    CONTRACT_ADDRESSES.podsCreatePaid,
    toMutable(podsCreatePaidAbi),
    "createPaidPod",
    [toBytes32(name), isPublic, threshold, entryFee, toBytes32(category), descriptionHex],
    actualCreationFee
  );
}

export async function joinPod(podId: number, _fee: bigint = 0n): Promise<TxResult> {
  // Check if already paid (for rejoin after unban)
  const connection = getCurrentConnection();
  if (!connection) throw new Error("Wallet not connected");
  const { deriveEVMAddress } = await import("./wallet");
  const evmAddr = deriveEVMAddress(connection.address) as `0x${string}`;
  const alreadyPaid = await hasPaid(podId, evmAddr);
  const freshFee = await getEntryFee(podId);

  return writeContract(
    CONTRACT_ADDRESSES.podsJoin,
    toMutable(podsJoinAbi),
    "joinPod",
    [BigInt(podId)],
    alreadyPaid ? 0n : freshFee
  );
}

export async function leavePod(podId: number): Promise<TxResult> {
  return writeContract(CONTRACT_ADDRESSES.podsLeave, toMutable(podsLeaveAbi), "leavePod", [BigInt(podId)]);
}

export async function sendPodMessage(podId: number, content: string): Promise<TxResult> {
  return writeContract(
    CONTRACT_ADDRESSES.messageWriter,
    toMutable(messagesWriterAbi),
    "sendPodMessage",
    [BigInt(podId), content]
  );
}

export async function sendMessage(recipient: `0x${string}`, content: string): Promise<TxResult> {
  return writeContract(
    CONTRACT_ADDRESSES.messageWriter,
    toMutable(messagesWriterAbi),
    "sendMessage",
    [recipient, content]
  );
}

export async function banMember(podId: number, target: `0x${string}`): Promise<TxResult> {
  return writeContract(CONTRACT_ADDRESSES.podsBan, toMutable(podsBanAbi), "banMember", [BigInt(podId), target]);
}

export async function unbanMember(podId: number, target: `0x${string}`): Promise<TxResult> {
  return writeContract(CONTRACT_ADDRESSES.podsBan, toMutable(podsBanAbi), "unbanMember", [BigInt(podId), target]);
}

export async function addMod(podId: number, moderator: `0x${string}`): Promise<TxResult> {
  return writeContract(CONTRACT_ADDRESSES.podsAddMod, toMutable(podsAddModAbi), "addMod", [BigInt(podId), moderator]);
}

export async function removeMod(podId: number, moderator: `0x${string}`): Promise<TxResult> {
  return writeContract(CONTRACT_ADDRESSES.podsRemoveMod, toMutable(podsRemoveModAbi), "removeMod", [BigInt(podId), moderator]);
}

export async function upgradePod(podId: number, fee: bigint): Promise<TxResult> {
  return writeContract(CONTRACT_ADDRESSES.podsAdmin, toMutable(podsAdminAbi), "upgradePod", [BigInt(podId)], fee);
}

export async function setEntryFee(podId: number, fee: bigint): Promise<TxResult> {
  return writeContract(CONTRACT_ADDRESSES.podsAdmin, toMutable(podsAdminAbi), "setEntryFee", [BigInt(podId), fee]);
}

export async function payEntryFee(podId: number, fee: bigint): Promise<TxResult> {
  return writeContract(CONTRACT_ADDRESSES.payments, toMutable(paymentsAbi), "payEntryFee", [BigInt(podId)], fee);
}

// Payments admin
export async function getPaymentsOwner(): Promise<string | null> {
  try { return ((await callContract(CONTRACT_ADDRESSES.payments, toMutable(paymentsAbi), "owner")) as string).toLowerCase(); } catch { return null; }
}
export async function getPaymentsTreasury(): Promise<string | null> {
  try { return ((await callContract(CONTRACT_ADDRESSES.payments, toMutable(paymentsAbi), "treasury")) as string).toLowerCase(); } catch { return null; }
}
export async function getPaymentsBalance(): Promise<bigint> {
  try { return await callContract(CONTRACT_ADDRESSES.payments, toMutable(paymentsAbi), "getContractBalance"); } catch { return 0n; }
}
export async function getPaymentsCreatorShare(): Promise<bigint> {
  return callContract(CONTRACT_ADDRESSES.payments, toMutable(paymentsAbi), "getCreatorShare");
}
export async function getPaymentsTreasuryShare(): Promise<bigint> {
  return callContract(CONTRACT_ADDRESSES.payments, toMutable(paymentsAbi), "getTreasuryShare");
}
export async function setPaymentsTreasury(treasury: `0x${string}`): Promise<TxResult> {
  return writeContract(CONTRACT_ADDRESSES.payments, toMutable(paymentsAbi), "setTreasury", [treasury]);
}
export async function setPaymentsAuthorized(auth: `0x${string}`, status: boolean): Promise<TxResult> {
  return writeContract(CONTRACT_ADDRESSES.payments, toMutable(paymentsAbi), "setAuthorized", [auth, status]);
}
export async function setPaymentsSplit(creatorShare: bigint, treasuryShare: bigint): Promise<TxResult> {
  return writeContract(CONTRACT_ADDRESSES.payments, toMutable(paymentsAbi), "setSplit", [creatorShare, treasuryShare]);
}
export async function withdrawPayments(amount: bigint): Promise<TxResult> {
  return writeContract(CONTRACT_ADDRESSES.payments, toMutable(paymentsAbi), "withdraw", [amount]);
}
export async function withdrawPaymentsToTreasury(amount: bigint): Promise<TxResult> {
  return writeContract(CONTRACT_ADDRESSES.payments, toMutable(paymentsAbi), "withdrawToTreasury", [amount]);
}
export async function transferPaymentsOwnership(newOwner: `0x${string}`): Promise<TxResult> {
  return writeContract(CONTRACT_ADDRESSES.payments, toMutable(paymentsAbi), "transferOwnership", [newOwner]);
}

// v1 stubs
export async function setProFee(_: bigint) { throw new Error("Not available in v1"); }
export async function setTreasury(_: `0x${string}`) { throw new Error("Not available in v1"); }

// ── PodsCreate reads ──
export async function getPodsCreateCreationFee(): Promise<bigint> {
  return callContract(CONTRACT_ADDRESSES.podsCreate, toMutable(podsCreateAbi), "creationFee");
}
export async function getPodsCreateTreasuryShare(): Promise<bigint> {
  return callContract(CONTRACT_ADDRESSES.podsCreate, toMutable(podsCreateAbi), "treasuryShare");
}
export async function getPodsCreateBurnShare(): Promise<bigint> {
  return callContract(CONTRACT_ADDRESSES.podsCreate, toMutable(podsCreateAbi), "burnShare");
}
export async function getPodsCreateBurnAddress(): Promise<string> {
  return callContract(CONTRACT_ADDRESSES.podsCreate, toMutable(podsCreateAbi), "burnAddress");
}
export async function getPodsCreateOwner(): Promise<string> {
  return callContract(CONTRACT_ADDRESSES.podsCreate, toMutable(podsCreateAbi), "owner");
}

// ── PodsCreate writes ──
export async function setPodsCreateCreationFee(fee: bigint): Promise<TxResult> {
  return writeContract(CONTRACT_ADDRESSES.podsCreate, toMutable(podsCreateAbi), "setCreationFee", [fee]);
}
export async function setPodsCreateSplit(treasuryShare: bigint, burnShare: bigint): Promise<TxResult> {
  return writeContract(CONTRACT_ADDRESSES.podsCreate, toMutable(podsCreateAbi), "setSplit", [treasuryShare, burnShare]);
}
export async function setPodsCreateBurnAddress(addr: `0x${string}`): Promise<TxResult> {
  return writeContract(CONTRACT_ADDRESSES.podsCreate, toMutable(podsCreateAbi), "setBurnAddress", [addr]);
}

// ── PodsCreatePaid reads ──
export async function getPodsCreatePaidCreationFee(): Promise<bigint> {
  return callContract(CONTRACT_ADDRESSES.podsCreatePaid, toMutable(podsCreatePaidAbi), "creationFee");
}
export async function getPodsCreatePaidTreasuryShare(): Promise<bigint> {
  return callContract(CONTRACT_ADDRESSES.podsCreatePaid, toMutable(podsCreatePaidAbi), "treasuryShare");
}
export async function getPodsCreatePaidBurnShare(): Promise<bigint> {
  return callContract(CONTRACT_ADDRESSES.podsCreatePaid, toMutable(podsCreatePaidAbi), "burnShare");
}
export async function getPodsCreatePaidBurnAddress(): Promise<string> {
  return callContract(CONTRACT_ADDRESSES.podsCreatePaid, toMutable(podsCreatePaidAbi), "burnAddress");
}

// ── PodsCreatePaid writes ──
export async function setPodsCreatePaidCreationFee(fee: bigint): Promise<TxResult> {
  return writeContract(CONTRACT_ADDRESSES.podsCreatePaid, toMutable(podsCreatePaidAbi), "setCreationFee", [fee]);
}
export async function setPodsCreatePaidSplit(treasuryShare: bigint, burnShare: bigint): Promise<TxResult> {
  return writeContract(CONTRACT_ADDRESSES.podsCreatePaid, toMutable(podsCreatePaidAbi), "setSplit", [treasuryShare, burnShare]);
}
export async function setPodsCreatePaidBurnAddress(addr: `0x${string}`): Promise<TxResult> {
  return writeContract(CONTRACT_ADDRESSES.podsCreatePaid, toMutable(podsCreatePaidAbi), "setBurnAddress", [addr]);
}

// ── Unified creation fee reader ──
export async function getCreationFee(contract: 'create' | 'createPaid' = 'create'): Promise<bigint> {
  const address = contract === 'create'
    ? CONTRACT_ADDRESSES.podsCreate
    : CONTRACT_ADDRESSES.podsCreatePaid;
  const abi = contract === 'create' ? toMutable(podsCreateAbi) : toMutable(podsCreatePaidAbi);

  const result = await callContract(address, abi, 'creationFee', []);
  return BigInt(result);
}

// Chunked send — in PAPI there's no chunking needed, just a passthrough
export async function sendPodMessageChunked(podId: number, content: string): Promise<{ id: string; podId: number; sender: string; content: string; timestamp: number }> {
  const connection = getCurrentConnection();
  if (!connection) throw new Error("Wallet not connected");
  const { deriveEVMAddress } = await import("./wallet");
  const evmAddr = deriveEVMAddress(connection.address);

  const txResult = await sendPodMessage(podId, content);
  // Wait for confirmation
  await txResult.confirmation;

  return {
    id: `${podId}-${Date.now()}`,
    podId,
    sender: evmAddr.toLowerCase(),
    content,
    timestamp: Date.now(),
  };
}
