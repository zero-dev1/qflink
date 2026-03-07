// scripts/rewire.mjs
// Re-runs authorization wiring calls with explicit gas limits
// Usage: node scripts/rewire.mjs

import { createWalletClient, createPublicClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Config ──
const RPC_URL = 'http://localhost:8545';
const CHAIN_ID = 42;
// NOTE: PolkaVM doesn't handle explicit gas limits well, let the node estimate

// Alith dev account
const DEPLOYER_KEY = '0x5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133';

const chain = {
  id: CHAIN_ID,
  name: 'QF Network Dev',
  nativeCurrency: { name: 'QF', symbol: 'QF', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
};

const account = privateKeyToAccount(DEPLOYER_KEY);

const walletClient = createWalletClient({
  account,
  chain,
  transport: http(RPC_URL),
});

const publicClient = createPublicClient({
  chain,
  transport: http(RPC_URL),
});

// ── ABIs ──
const podsStorageAbi = parseAbi([
  'function setAuthorized(address auth, bool status) external',
]);

const paymentsAbi = parseAbi([
  'function setPods(address _pods) external',
  'function pods() external view returns (address)',
]);

const contentStoreAbi = parseAbi([
  'function setAuthorized(address _auth) external',
  'function authorized() external view returns (address)',
]);

const messageIndexAbi = parseAbi([
  'function setAuthorized(address _auth) external',
  'function authorized() external view returns (address)',
]);

// ── Helpers ──

function loadEnvAddresses() {
  const envPath = path.join(ROOT, '.env.development');
  const envContent = readFileSync(envPath, 'utf8');
  
  const getVar = (name) => {
    const match = envContent.match(new RegExp(`^${name}=(.+)$`, 'm'));
    return match ? match[1].trim() : null;
  };

  return {
    podsStorage: getVar('VITE_PODS_STORAGE_ADDRESS'),
    podsCreate: getVar('VITE_PODS_CREATE_ADDRESS'),
    podsJoin: getVar('VITE_PODS_JOIN_ADDRESS'),
    podsLeave: getVar('VITE_PODS_LEAVE_ADDRESS'),
    podsBan: getVar('VITE_PODS_BAN_ADDRESS'),
    podsAddMod: getVar('VITE_PODS_ADDMOD_ADDRESS'),
    podsRemoveMod: getVar('VITE_PODS_REMOVEMOD_ADDRESS'),
    podsAdmin: getVar('VITE_PODS_ADMIN_ADDRESS'),
    payments: getVar('VITE_PAYMENTS_ADDRESS'),
    contentStore: getVar('VITE_CONTENT_STORE_ADDRESS'),
    messageIndex: getVar('VITE_MESSAGE_INDEX_ADDRESS'),
    messageWriter: getVar('VITE_MESSAGE_WRITER_ADDRESS'),
  };
}

async function writeContractWithGas(address, abi, functionName, args = []) {
  console.log(`  → ${functionName}(${args.map(a => typeof a === 'string' ? a.slice(0, 10) + '...' : a).join(', ')})`);
  
  const hash = await walletClient.writeContract({
    address,
    abi,
    functionName,
    args,
    chain,
    // NOTE: No explicit gas limit - PolkaVM node estimates automatically
  });
  
  console.log(`    Transaction hash: ${hash}`);
  
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  console.log(`    Receipt status: ${receipt.status}, Gas used: ${receipt.gasUsed}`);
  
  if (receipt.status !== 'success') {
    throw new Error(`Transaction failed: ${hash}`);
  }
  
  return receipt;
}

async function verifyPaymentsPods(payments, expectedPods) {
  const pods = await publicClient.readContract({
    address: payments,
    abi: paymentsAbi,
    functionName: 'pods',
    args: [],
  });
  
  if (pods.toLowerCase() === expectedPods.toLowerCase()) {
    console.log(`  ✅ Verified: pods() = ${pods}`);
  } else {
    throw new Error(`Verification failed: expected ${expectedPods}, got ${pods}`);
  }
}

async function verifyContentStoreAuth(contentStore, expectedAuth) {
  const auth = await publicClient.readContract({
    address: contentStore,
    abi: contentStoreAbi,
    functionName: 'authorized',
    args: [],
  });
  
  if (auth.toLowerCase() === expectedAuth.toLowerCase()) {
    console.log(`  ✅ Verified: authorized() = ${auth}`);
  } else {
    throw new Error(`Verification failed: expected ${expectedAuth}, got ${auth}`);
  }
}

async function verifyMessageIndexAuth(messageIndex, expectedAuth) {
  const auth = await publicClient.readContract({
    address: messageIndex,
    abi: messageIndexAbi,
    functionName: 'authorized',
    args: [],
  });
  
  if (auth.toLowerCase() === expectedAuth.toLowerCase()) {
    console.log(`  ✅ Verified: authorized() = ${auth}`);
  } else {
    throw new Error(`Verification failed: expected ${expectedAuth}, got ${auth}`);
  }
}

// ── Main ──

async function main() {
  console.log('🔧 QFLink Re-wiring Authorization\n');
  console.log(`Deployer: ${account.address}`);
  console.log(`RPC: ${RPC_URL}`);
  console.log(`Chain ID: ${CHAIN_ID}`);
  console.log(`Gas: auto-estimated by node\n`);

  // Check connection
  try {
    const blockNumber = await publicClient.getBlockNumber();
    console.log(`Connected. Block: ${blockNumber}\n`);
  } catch (err) {
    console.error('❌ Cannot connect to RPC. Make sure qf-node and eth-rpc are running.');
    process.exit(1);
  }

  // Load addresses
  const addr = loadEnvAddresses();
  
  console.log('Loaded addresses:');
  console.log(`  PodsStorage:     ${addr.podsStorage}`);
  console.log(`  PodsCreate:      ${addr.podsCreate}`);
  console.log(`  PodsJoin:        ${addr.podsJoin}`);
  console.log(`  PodsLeave:       ${addr.podsLeave}`);
  console.log(`  PodsBan:         ${addr.podsBan}`);
  console.log(`  PodsAddMod:      ${addr.podsAddMod}`);
  console.log(`  PodsRemoveMod:   ${addr.podsRemoveMod}`);
  console.log(`  PodsAdmin:       ${addr.podsAdmin}`);
  console.log(`  Payments:        ${addr.payments}`);
  console.log(`  ContentStore:    ${addr.contentStore}`);
  console.log(`  MessageIndex:    ${addr.messageIndex}`);
  console.log(`  MessageWriter:   ${addr.messageWriter}\n`);

  // ════════════════════════════════════════════
  // WIRING: PodsStorage.setAuthorized calls
  // ════════════════════════════════════════════
  console.log('═══ WIRING: PodsStorage.setAuthorized ═══');

  const podsStorageAuthTargets = [
    { name: 'PodsCreate', address: addr.podsCreate },
    { name: 'PodsJoin', address: addr.podsJoin },
    { name: 'PodsLeave', address: addr.podsLeave },
    { name: 'PodsBan', address: addr.podsBan },
    { name: 'PodsAddMod', address: addr.podsAddMod },
    { name: 'PodsRemoveMod', address: addr.podsRemoveMod },
    { name: 'PodsAdmin', address: addr.podsAdmin },
  ];

  for (const target of podsStorageAuthTargets) {
    console.log(`\n  Authorizing ${target.name}...`);
    await writeContractWithGas(addr.podsStorage, podsStorageAbi, 'setAuthorized', [target.address, true]);
  }

  // ════════════════════════════════════════════
  // WIRING: Payments.setPods
  // ════════════════════════════════════════════
  console.log('\n═══ WIRING: Payments.setPods ═══');
  console.log(`\n  Setting PodsCreate as pods address...`);
  await writeContractWithGas(addr.payments, paymentsAbi, 'setPods', [addr.podsCreate]);
  await verifyPaymentsPods(addr.payments, addr.podsCreate);

  // ════════════════════════════════════════════
  // WIRING: ContentStore.setAuthorized
  // ════════════════════════════════════════════
  console.log('\n═══ WIRING: ContentStore.setAuthorized ═══');
  console.log(`\n  Authorizing MessageWriter...`);
  await writeContractWithGas(addr.contentStore, contentStoreAbi, 'setAuthorized', [addr.messageWriter]);
  await verifyContentStoreAuth(addr.contentStore, addr.messageWriter);

  // ════════════════════════════════════════════
  // WIRING: MessageIndex.setAuthorized
  // ════════════════════════════════════════════
  console.log('\n═══ WIRING: MessageIndex.setAuthorized ═══');
  console.log(`\n  Authorizing MessageWriter...`);
  await writeContractWithGas(addr.messageIndex, messageIndexAbi, 'setAuthorized', [addr.messageWriter]);
  await verifyMessageIndexAuth(addr.messageIndex, addr.messageWriter);

  // ════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════');
  console.log('🎉 RE-WIRING COMPLETE');
  console.log('═══════════════════════════════════════');
  console.log('All authorization calls executed with auto-estimated gas');
  console.log('Verifications completed where possible.');
  console.log('═══════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\n❌ Re-wiring failed:', err.message);
  process.exit(1);
});
