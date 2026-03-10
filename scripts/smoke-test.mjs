#!/usr/bin/env node
/**
 * QFLink Post-Deployment Smoke Test
 * 
 * Run: node scripts/smoke-test.mjs
 * 
 * Verifies all contract functions work after deployment.
 */

import { createWalletClient, createPublicClient, http, parseAbi, parseEther, formatEther, stringToHex, hexToString } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { namehash } from 'viem/ens';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═════════════════════════════════════════════════════════════════════════════

const RPC_URL = process.env.VITE_WALLET_RPC_URL || 'http://localhost:8545';
const CHAIN_ID = 42;

// Deployer key from environment (must be set in .env.development or .env.production)
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;
if (!DEPLOYER_KEY) {
  console.error('❌ DEPLOYER_PRIVATE_KEY environment variable is required');
  process.exit(1);
}

// Test user key from environment (for smoke tests)
const TEST_USER_KEY = process.env.TEST_USER_PRIVATE_KEY;
if (!TEST_USER_KEY) {
  console.error('❌ TEST_USER_PRIVATE_KEY environment variable is required');
  process.exit(1);
}

// Dummy address for ban/unban testing
const DUMMY_ADDRESS = '0x1234567890123456789012345678901234567890';

const chain = {
  id: CHAIN_ID,
  name: 'QF Network Dev',
  nativeCurrency: { name: 'QF', symbol: 'QF', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
};

// ═════════════════════════════════════════════════════════════════════════════
// ABIs
// ═════════════════════════════════════════════════════════════════════════════

const podsCreateAbi = parseAbi([
  'function createPod(bytes32 name, bool isPublic, uint256 threshold, bytes32 category, bytes description) payable returns (uint64)',
  'function treasury() view returns (address)',
  'function owner() view returns (address)',
  'function transferOwnership(address newOwner)',
  'function setTreasury(address _treasury)',
]);

const podsCreatePaidAbi = parseAbi([
  'function createPaidPod(bytes32 name, bool isPublic, uint256 threshold, uint256 entryFee, bytes32 category, bytes description) payable returns (uint64)',
  'function creationFee() view returns (uint256)',
  'function treasury() view returns (address)',
  'function owner() view returns (address)',
  'function setCreationFee(uint256 _fee)',
  'function setTreasury(address _treasury)',
  'function transferOwnership(address newOwner)',
]);

const podsStorageAbi = parseAbi([
  'function owner() view returns (address)',
  'function transferOwnership(address newOwner)',
  'function setAuthorized(address _auth, bool _status)',
]);

const podsJoinAbi = parseAbi([
  'function joinPod(uint64 podId) payable',
  'function storage_() view returns (address)',
  'function payments() view returns (address)',
]);

const podsLeaveAbi = parseAbi([
  'function leavePod(uint64 podId)',
  'function storage_() view returns (address)',
]);

const podsReaderAbi = parseAbi([
  'function getPod(uint64 podId) view returns (bytes32 name, address creator, bool isPublic, uint8 tier, uint64 memberCount, uint64 modCount, uint256 threshold, bytes32 category, bytes description)',
  'function getCreator(uint64 podId) view returns (address)',
  'function isMember(uint64 podId, address user) view returns (bool)',
  'function isBanned(uint64 podId, address user) view returns (bool)',
  'function isMod(uint64 podId, address user) view returns (bool)',
  'function getPodCount() view returns (uint64)',
  'function getPodName(uint64 podId) view returns (bytes32)',
  'function getMemberCount(uint64 podId) view returns (uint64)',
]);

const podsBanAbi = parseAbi([
  'function banMember(uint64 podId, address user)',
  'function unbanMember(uint64 podId, address user)',
  'function storage_() view returns (address)',
]);

const podsAddModAbi = parseAbi([
  'function addMod(uint64 podId, address user)',
  'function storage_() view returns (address)',
]);

const podsRemoveModAbi = parseAbi([
  'function removeMod(uint64 podId, address user)',
  'function storage_() view returns (address)',
]);

const podsAdminAbi = parseAbi([
  'function setEntryFee(uint64 podId, uint256 fee)',
  'function upgradePod(uint64 podId) payable',
  'function storage_() view returns (address)',
  'function payments() view returns (address)',
]);

const messageWriterV2Abi = parseAbi([
  'function sendPodMessage(uint64 podId, string content)',
  'function sendMessage(address recipient, string content)',
  'function contentStore() view returns (address)',
  'function index() view returns (address)',
  'function podsReader() view returns (address)',
  'function sessionKeys() view returns (address)',
]);

const messageReaderAbi = parseAbi([
  'function getMessage(uint64 id) view returns (address sender, uint64 timestamp, string content, uint64 podId, address recipient)',
  'function getPodMessageIds(uint64 podId, uint64 offset, uint64 limit) view returns (uint64[])',
  'function getPodMessageCount(uint64 podId) view returns (uint64)',
]);

const sessionKeysAbi = parseAbi([
  'function registerSessionKey(address sessionKey, uint256 durationSeconds) payable',
  'function revokeSession()',
  'function validateSession(address sessionKey) view returns (bool valid, address owner)',
  'function getOwner(address sessionKey) view returns (address)',
  'function getActiveSession(address owner) view returns (address sessionKey, uint64 expiry, bool revoked, bool isActive)',
  'function sessions(address sessionKey) view returns (address owner, uint64 expiry, bool revoked)',
  'function activeSessionKey(address owner) view returns (address)',
]);

const paymentsAbi = parseAbi([
  'function getEntryFee(uint64 podId) view returns (uint256)',
  'function hasPaid(uint64 podId, address user) view returns (bool)',
  'function treasury() view returns (address)',
  'function owner() view returns (address)',
  'function setTreasury(address _treasury)',
  'function transferOwnership(address newOwner)',
  'function setAuthorized(address _auth, bool _status)',
]);

// QNS ABIs
const qnsRegistrarAbi = parseAbi([
  'function register(string name, uint256 durationInYears, bool permanent) payable',
  'function available(string name) view returns (bool)',
  'function price3Char() view returns (uint256)',
  'function price4Char() view returns (uint256)',
  'function price5PlusChar() view returns (uint256)',
]);

const qnsResolverAbi = parseAbi([
  'function addr(bytes32 node) view returns (address)',
  'function name(bytes32 node) view returns (string)',
]);

// ═════════════════════════════════════════════════════════════════════════════
// LOAD ENVIRONMENT
// ═════════════════════════════════════════════════════════════════════════════

function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env.development');
  try {
    const content = readFileSync(envPath, 'utf8');
    const env = {};
    for (const line of content.split('\n')) {
      const match = line.match(/^VITE_(\w+)=(.+)$/);
      if (match) {
        env[match[1]] = match[2].trim();
      }
    }
    return env;
  } catch (e) {
    console.error('❌ Failed to load .env.development:', e.message);
    process.exit(1);
  }
}

const env = loadEnv();

const ADDRESSES = {
  podsStorage: env.PODS_STORAGE_ADDRESS,
  podsCreate: env.PODS_CREATE_ADDRESS,
  podsCreatePaid: env.PODS_CREATE_PAID_ADDRESS,
  podsJoin: env.PODS_JOIN_ADDRESS,
  podsLeave: env.PODS_LEAVE_ADDRESS,
  podsBan: env.PODS_BAN_ADDRESS,
  podsAddMod: env.PODS_ADDMOD_ADDRESS,
  podsRemoveMod: env.PODS_REMOVEMOD_ADDRESS,
  podsAdmin: env.PODS_ADMIN_ADDRESS,
  podsReader: env.PODS_READER_ADDRESS,
  podsGetPod: env.PODS_GETPOD_ADDRESS,
  payments: env.PAYMENTS_ADDRESS,
  contentStore: env.CONTENT_STORE_ADDRESS,
  messageIndex: env.MESSAGE_INDEX_ADDRESS,
  messageWriterV2: env.MESSAGE_WRITER_V2_ADDRESS,
  messageReader: env.MESSAGE_READER_ADDRESS,
  sessionKeys: env.SESSION_KEYS_ADDRESS,
  qnsRegistrar: env.QNS_REGISTRAR_ADDRESS,
  qnsResolver: env.QNS_RESOLVER_ADDRESS,
};

// ═════════════════════════════════════════════════════════════════════════════
// SETUP CLIENTS
// ═════════════════════════════════════════════════════════════════════════════

const deployerAccount = privateKeyToAccount(DEPLOYER_KEY);
const testUserAccount = privateKeyToAccount(TEST_USER_KEY);

const publicClient = createPublicClient({
  chain,
  transport: http(RPC_URL),
});

const deployerWallet = createWalletClient({
  account: deployerAccount,
  chain,
  transport: http(RPC_URL),
});

const testUserWallet = createWalletClient({
  account: testUserAccount,
  chain,
  transport: http(RPC_URL),
});

// ═════════════════════════════════════════════════════════════════════════════
// TEST STATE
// ═════════════════════════════════════════════════════════════════════════════

const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  errors: [],
};

let freePodId = null;
let paidPodId = null;

// ═════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════════════════════

async function writeContract(wallet, address, abi, functionName, args = [], value = 0n) {
  const hash = await wallet.writeContract({
    address,
    abi,
    functionName,
    args,
    value,
  });
  return await publicClient.waitForTransactionReceipt({ hash });
}

async function readContract(address, abi, functionName, args = []) {
  return await publicClient.readContract({
    address,
    abi,
    functionName,
    args,
  });
}

function formatBytes32(bytes32) {
  // Remove trailing null bytes and convert to string
  const hex = bytes32.startsWith('0x') ? bytes32.slice(2) : bytes32;
  const bytes = Buffer.from(hex, 'hex');
  return bytes.toString('utf8').replace(/\0/g, '');
}

async function runTest(name, testFn) {
  try {
    await testFn();
    results.passed++;
    console.log(`✅ ${name}`);
  } catch (error) {
    results.failed++;
    results.errors.push({ test: name, error: error.message });
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
  }
}

async function skipTest(name, reason) {
  results.skipped++;
  console.log(`⏭️  SKIPPED: ${name} (${reason})`);
}

// ═════════════════════════════════════════════════════════════════════════════
// TESTS
// ═════════════════════════════════════════════════════════════════════════════

async function test1_PodCreationFree() {
  // Deployer creates a free pod
  const name = stringToHex('Smoke Test Free', { size: 32 });
  const category = stringToHex('test', { size: 32 });
  const description = stringToHex('Test pod for smoke testing');
  
  const receipt = await writeContract(
    deployerWallet,
    ADDRESSES.podsCreate,
    podsCreateAbi,
    'createPod',
    [name, true, 0n, category, description],
    parseEther('500') // Creation fee
  );
  
  // Get pod count to find the new pod ID
  const podCount = await readContract(ADDRESSES.podsReader, podsReaderAbi, 'getPodCount');
  freePodId = podCount;
  
  // Verify pod was created
  const pod = await readContract(ADDRESSES.podsReader, podsReaderAbi, 'getPod', [freePodId]);
  const podName = formatBytes32(pod[0]);
  
  if (podName !== 'Smoke Test Free') {
    throw new Error(`Pod name mismatch: expected "Smoke Test Free", got "${podName}"`);
  }
}

async function test2_PodCreationPaid() {
  // Deployer creates a paid pod with 500 QF entry fee
  const name = stringToHex('Smoke Test Paid', { size: 32 });
  const category = stringToHex('test', { size: 32 });
  const description = stringToHex('Test paid pod for smoke testing');
  const entryFee = parseEther('500');
  
  const receipt = await writeContract(
    deployerWallet,
    ADDRESSES.podsCreatePaid,
    podsCreatePaidAbi,
    'createPaidPod',
    [name, true, 0n, entryFee, category, description],
    parseEther('500') // Creation fee
  );
  
  // Get pod count to find the new pod ID
  const podCount = await readContract(ADDRESSES.podsReader, podsReaderAbi, 'getPodCount');
  paidPodId = podCount;
  
  // Verify pod was created
  const pod = await readContract(ADDRESSES.podsReader, podsReaderAbi, 'getPod', [paidPodId]);
  const podName = formatBytes32(pod[0]);
  
  if (podName !== 'Smoke Test Paid') {
    throw new Error(`Pod name mismatch: expected "Smoke Test Paid", got "${podName}"`);
  }
  
  // Verify entry fee
  const fee = await readContract(ADDRESSES.payments, paymentsAbi, 'getEntryFee', [paidPodId]);
  if (fee !== entryFee) {
    throw new Error(`Entry fee mismatch: expected ${entryFee}, got ${fee}`);
  }
}

async function test3_JoinFreePod() {
  if (!freePodId) throw new Error('Free pod not created');
  
  // Test user joins free pod
  await writeContract(
    testUserWallet,
    ADDRESSES.podsJoin,
    podsJoinAbi,
    'joinPod',
    [freePodId]
  );
  
  // Verify membership
  const isMember = await readContract(ADDRESSES.podsReader, podsReaderAbi, 'isMember', [freePodId, testUserAccount.address]);
  if (!isMember) {
    throw new Error('Test user is not a member of free pod');
  }
}

async function test4_JoinPaidPod() {
  if (!paidPodId) throw new Error('Paid pod not created');
  
  // Get creator and treasury addresses
  const creator = await readContract(ADDRESSES.podsReader, podsReaderAbi, 'getCreator', [paidPodId]);
  const treasury = await readContract(ADDRESSES.payments, paymentsAbi, 'treasury');
  
  // Check if creator and treasury are the same address
  const creatorIsTreasury = creator.toLowerCase() === treasury.toLowerCase();
  
  const entryFee = parseEther('500');
  const expectedCreatorShare = (entryFee * 95n) / 100n; // 95%
  const expectedTreasuryShare = entryFee - expectedCreatorShare; // 5%
  
  // Get balances before
  const creatorBalanceBefore = await publicClient.getBalance({ address: creator });
  const treasuryBalanceBefore = await publicClient.getBalance({ address: treasury });
  
  // Test user joins paid pod with entry fee
  await writeContract(
    testUserWallet,
    ADDRESSES.podsJoin,
    podsJoinAbi,
    'joinPod',
    [paidPodId],
    entryFee
  );
  
  // Get balances after
  const creatorBalanceAfter = await publicClient.getBalance({ address: creator });
  const treasuryBalanceAfter = await publicClient.getBalance({ address: treasury });
  
  if (creatorIsTreasury) {
    // Creator and treasury are the same address - should receive 100% total
    const totalGain = creatorBalanceAfter - creatorBalanceBefore;
    const expectedTotal = entryFee; // 95% + 5% = 100%
    if (totalGain < expectedTotal - parseEther('0.01') || totalGain > expectedTotal + parseEther('0.01')) {
      throw new Error(`Total share mismatch: expected ~${formatEther(expectedTotal)} QF, got ${formatEther(totalGain)} QF`);
    }
    console.log('   Note: Creator = Treasury (same wallet), receiving 95% + 5% = 100%');
  } else {
    // Normal case: creator and treasury are different addresses
    // Verify creator received 95%
    const creatorGain = creatorBalanceAfter - creatorBalanceBefore;
    if (creatorGain < expectedCreatorShare - parseEther('0.01') || creatorGain > expectedCreatorShare + parseEther('0.01')) {
      throw new Error(`Creator share mismatch: expected ~${formatEther(expectedCreatorShare)} QF, got ${formatEther(creatorGain)} QF`);
    }
    
    // Verify treasury received 5%
    const treasuryGain = treasuryBalanceAfter - treasuryBalanceBefore;
    if (treasuryGain < expectedTreasuryShare - parseEther('0.01') || treasuryGain > expectedTreasuryShare + parseEther('0.01')) {
      throw new Error(`Treasury share mismatch: expected ~${formatEther(expectedTreasuryShare)} QF, got ${formatEther(treasuryGain)} QF`);
    }
  }
  
  // Verify membership
  const isMember = await readContract(ADDRESSES.podsReader, podsReaderAbi, 'isMember', [paidPodId, testUserAccount.address]);
  if (!isMember) {
    throw new Error('Test user is not a member of paid pod');
  }
}

async function test5_SendMessage() {
  if (!freePodId) throw new Error('Free pod not created');
  
  const messageContent = 'Smoke test message';
  
  // Get message count before
  const countBefore = await readContract(ADDRESSES.messageReader, messageReaderAbi, 'getPodMessageCount', [freePodId]);
  
  // Deployer sends message to free pod
  await writeContract(
    deployerWallet,
    ADDRESSES.messageWriterV2,
    messageWriterV2Abi,
    'sendPodMessage',
    [freePodId, messageContent]
  );
  
  // Get message count after
  const countAfter = await readContract(ADDRESSES.messageReader, messageReaderAbi, 'getPodMessageCount', [freePodId]);
  
  if (countAfter <= countBefore) {
    throw new Error('Message count did not increase');
  }
  
  // Get the message IDs and verify content
  const messageIds = await readContract(ADDRESSES.messageReader, messageReaderAbi, 'getPodMessageIds', [freePodId, 0n, 10n]);
  const lastMessageId = messageIds[messageIds.length - 1];
  
  const message = await readContract(ADDRESSES.messageReader, messageReaderAbi, 'getMessage', [lastMessageId]);
  if (message[2] !== messageContent) {
    throw new Error(`Message content mismatch: expected "${messageContent}", got "${message[2]}"`);
  }
}

async function test6_AddMod() {
  if (!freePodId) throw new Error('Free pod not created');
  
  // Deployer adds testUser as mod
  await writeContract(
    deployerWallet,
    ADDRESSES.podsAddMod,
    podsAddModAbi,
    'addMod',
    [freePodId, testUserAccount.address]
  );
  
  // Verify mod status
  const isMod = await readContract(ADDRESSES.podsReader, podsReaderAbi, 'isMod', [freePodId, testUserAccount.address]);
  if (!isMod) {
    throw new Error('Test user is not a mod');
  }
}

async function test7_Ban() {
  if (!freePodId) throw new Error('Free pod not created');
  
  // Deployer bans dummy address
  await writeContract(
    deployerWallet,
    ADDRESSES.podsBan,
    podsBanAbi,
    'banMember',
    [freePodId, DUMMY_ADDRESS]
  );
  
  // Verify ban status
  const isBanned = await readContract(ADDRESSES.podsReader, podsReaderAbi, 'isBanned', [freePodId, DUMMY_ADDRESS]);
  if (!isBanned) {
    throw new Error('Dummy address is not banned');
  }
}

async function test8_Unban() {
  if (!freePodId) throw new Error('Free pod not created');
  
  // Deployer unbans dummy address
  await writeContract(
    deployerWallet,
    ADDRESSES.podsBan,
    podsBanAbi,
    'unbanMember',
    [freePodId, DUMMY_ADDRESS]
  );
  
  // Verify ban status
  const isBanned = await readContract(ADDRESSES.podsReader, podsReaderAbi, 'isBanned', [freePodId, DUMMY_ADDRESS]);
  if (isBanned) {
    throw new Error('Dummy address is still banned');
  }
}

async function test9_SetEntryFee() {
  if (!paidPodId) throw new Error('Paid pod not created');
  
  const newFee = parseEther('1000');
  
  // Deployer changes entry fee
  await writeContract(
    deployerWallet,
    ADDRESSES.podsAdmin,
    podsAdminAbi,
    'setEntryFee',
    [paidPodId, newFee]
  );
  
  // Verify new fee
  const fee = await readContract(ADDRESSES.payments, paymentsAbi, 'getEntryFee', [paidPodId]);
  if (fee !== newFee) {
    throw new Error(`Entry fee mismatch: expected ${formatEther(newFee)} QF, got ${formatEther(fee)} QF`);
  }
}

async function test10_LeavePod() {
  if (!freePodId) throw new Error('Free pod not created');
  
  // Get member count before
  const memberCountBefore = await readContract(ADDRESSES.podsReader, podsReaderAbi, 'getMemberCount', [freePodId]);
  
  // Test user leaves free pod
  await writeContract(
    testUserWallet,
    ADDRESSES.podsLeave,
    podsLeaveAbi,
    'leavePod',
    [freePodId]
  );
  
  // Verify membership removed
  const isMember = await readContract(ADDRESSES.podsReader, podsReaderAbi, 'isMember', [freePodId, testUserAccount.address]);
  if (isMember) {
    throw new Error('Test user is still a member after leaving');
  }
  
  // Verify member count decreased
  const memberCountAfter = await readContract(ADDRESSES.podsReader, podsReaderAbi, 'getMemberCount', [freePodId]);
  if (memberCountAfter >= memberCountBefore) {
    throw new Error('Member count did not decrease');
  }
}

async function test11_SessionKeys() {
  // Create a session key (use a dummy address derived from a known private key)
  const sessionKeyAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const duration = 3600n; // 1 hour
  
  // Deployer creates a session key
  await writeContract(
    deployerWallet,
    ADDRESSES.sessionKeys,
    sessionKeysAbi,
    'registerSessionKey',
    [sessionKeyAddress, duration],
    parseEther('0.01') // Fund the session key with some gas money
  );
  
  // Verify session key is registered
  const session = await readContract(ADDRESSES.sessionKeys, sessionKeysAbi, 'sessions', [sessionKeyAddress]);
  if (session[0].toLowerCase() !== deployerAccount.address.toLowerCase()) {
    throw new Error('Session key owner mismatch');
  }
  if (session[2] !== false) {
    throw new Error('Session key is revoked');
  }
  
  // Verify active session
  const activeSession = await readContract(ADDRESSES.sessionKeys, sessionKeysAbi, 'getActiveSession', [deployerAccount.address]);
  if (activeSession[0].toLowerCase() !== sessionKeyAddress.toLowerCase()) {
    throw new Error('Active session key mismatch');
  }
  if (!activeSession[3]) {
    throw new Error('Session is not active');
  }
}

async function test12_QNS() {
  // Check if QNS addresses are available
  if (!ADDRESSES.qnsRegistrar || ADDRESSES.qnsRegistrar === '0x0000000000000000000000000000000000000000') {
    throw new Error('SKIPPED');
  }
  
  // Check if registrar is deployed
  try {
    const code = await publicClient.getBytecode({ address: ADDRESSES.qnsRegistrar });
    if (!code || code === '0x') {
      throw new Error('SKIPPED');
    }
  } catch {
    throw new Error('SKIPPED');
  }
  
  // Register a .qf name for deployer
  const name = 'smoketest' + Date.now(); // Unique name
  const durationYears = 1n;
  
  // Get price
  const price = await readContract(ADDRESSES.qnsRegistrar, qnsRegistrarAbi, 'price5PlusChar');
  
  // Register name
  await writeContract(
    deployerWallet,
    ADDRESSES.qnsRegistrar,
    qnsRegistrarAbi,
    'register',
    [name, durationYears, false],
    price
  );
  
  // Resolve name to address using resolver
  const node = namehash(`${name}.qf`);
  const resolvedAddress = await readContract(ADDRESSES.qnsResolver, qnsResolverAbi, 'addr', [node]);
  
  if (resolvedAddress.toLowerCase() !== deployerAccount.address.toLowerCase()) {
    throw new Error(`Name resolution mismatch: expected ${deployerAccount.address}, got ${resolvedAddress}`);
  }
}

async function test13_TreasuryChange() {
  // Get original treasury
  const originalTreasury = await readContract(ADDRESSES.payments, paymentsAbi, 'treasury');
  
  // Deployer changes treasury to testUser
  await writeContract(
    deployerWallet,
    ADDRESSES.payments,
    paymentsAbi,
    'setTreasury',
    [testUserAccount.address]
  );
  
  // Verify treasury changed
  let newTreasury = await readContract(ADDRESSES.payments, paymentsAbi, 'treasury');
  if (newTreasury.toLowerCase() !== testUserAccount.address.toLowerCase()) {
    throw new Error(`Treasury mismatch: expected ${testUserAccount.address}, got ${newTreasury}`);
  }
  
  // Restore original treasury
  await writeContract(
    deployerWallet,
    ADDRESSES.payments,
    paymentsAbi,
    'setTreasury',
    [originalTreasury]
  );
  
  // Verify restored
  newTreasury = await readContract(ADDRESSES.payments, paymentsAbi, 'treasury');
  if (newTreasury.toLowerCase() !== originalTreasury.toLowerCase()) {
    throw new Error(`Treasury restore failed: expected ${originalTreasury}, got ${newTreasury}`);
  }
}

async function test14_TransferOwnership() {
  // Get original owner
  const originalOwner = await readContract(ADDRESSES.podsStorage, podsStorageAbi, 'owner');
  
  // Deployer transfers ownership to testUser
  await writeContract(
    deployerWallet,
    ADDRESSES.podsStorage,
    podsStorageAbi,
    'transferOwnership',
    [testUserAccount.address]
  );
  
  // Verify owner changed
  let newOwner = await readContract(ADDRESSES.podsStorage, podsStorageAbi, 'owner');
  if (newOwner.toLowerCase() !== testUserAccount.address.toLowerCase()) {
    throw new Error(`Owner mismatch: expected ${testUserAccount.address}, got ${newOwner}`);
  }
  
  // TestUser transfers ownership back to deployer
  await writeContract(
    testUserWallet,
    ADDRESSES.podsStorage,
    podsStorageAbi,
    'transferOwnership',
    [deployerAccount.address]
  );
  
  // Verify restored
  newOwner = await readContract(ADDRESSES.podsStorage, podsStorageAbi, 'owner');
  if (newOwner.toLowerCase() !== originalOwner.toLowerCase()) {
    throw new Error(`Owner restore failed: expected ${originalOwner}, got ${newOwner}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('           Starting QFLink Smoke Test...');
  console.log(`           ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log(`Deployer:  ${deployerAccount.address}`);
  console.log(`Test User: ${testUserAccount.address}`);
  console.log(`RPC:       ${RPC_URL}\n`);
  
  // Check connection
  try {
    const blockNumber = await publicClient.getBlockNumber();
    console.log(`Connected. Block: ${blockNumber}\n`);
  } catch (err) {
    console.error('❌ Cannot connect to RPC. Make sure qf-node and eth-rpc are running.');
    process.exit(1);
  }
  
  // Run tests
  console.log('Running tests...\n');
  
  await runTest('TEST 1  — Pod Creation (Free)', test1_PodCreationFree);
  await runTest('TEST 2  — Pod Creation (Paid)', test2_PodCreationPaid);
  await runTest('TEST 3  — Join Free Pod', test3_JoinFreePod);
  await runTest('TEST 4  — Join Paid Pod', test4_JoinPaidPod);
  await runTest('TEST 5  — Send Message', test5_SendMessage);
  await runTest('TEST 6  — Moderation (Add Mod)', test6_AddMod);
  await runTest('TEST 7  — Moderation (Ban)', test7_Ban);
  await runTest('TEST 8  — Moderation (Unban)', test8_Unban);
  await runTest('TEST 9  — Set Entry Fee', test9_SetEntryFee);
  await runTest('TEST 10 — Leave Pod', test10_LeavePod);
  await runTest('TEST 11 — Session Keys', test11_SessionKeys);
  
  // QNS test - handle separately for skip
  try {
    await test12_QNS();
    results.passed++;
    console.log('✅ TEST 12 — QNS');
  } catch (error) {
    if (error.message === 'SKIPPED') {
      results.skipped++;
      console.log('⏭️  TEST 12 — QNS (QNS addresses not available or contract not deployed)');
    } else {
      results.failed++;
      results.errors.push({ test: 'TEST 12 — QNS', error: error.message });
      console.log('❌ TEST 12 — QNS');
      console.log(`   Error: ${error.message}`);
    }
  }
  
  await runTest('TEST 13 — Treasury Change', test13_TreasuryChange);
  await runTest('TEST 14 — Transfer Ownership', test14_TransferOwnership);
  
  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                        SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  ✅ Passed:  ${results.passed}`);
  console.log(`  ❌ Failed:   ${results.failed}`);
  console.log(`  ⏭️  Skipped: ${results.skipped}`);
  console.log('═══════════════════════════════════════════════════════════════');
  
  if (results.failed > 0) {
    console.log('\nFailed tests:');
    for (const err of results.errors) {
      console.log(`  - ${err.test}: ${err.error}`);
    }
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('❌ Smoke test failed:', err);
  process.exit(1);
});
