// scripts/deploy.mjs
// Usage: node scripts/deploy.mjs
//
// Automates the full QFLink setup:
// 1. Map Alice & Bob
// 2. Deploy Registry, Pods, Messages contracts (skips if already deployed)
// 3. Initialize Pods
// 4. Write addresses to .env

import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const WS_URL = 'ws://127.0.0.1:9944';
const GAS = { refTime: 10_000_000_000n, proofSize: 10_000_000_000n };
const STORAGE_DEPOSIT = 100_000_000_000_000_000_000n;
const INIT_PODS_SELECTOR = '0xe414e067';
const GET_POD_COUNT_SELECTOR = '0x6e2de47f';

const CONTRACT_PATHS = {
  registry: path.join(ROOT, 'contracts/qflink-registry/qflink-registry.polkavm'),
  pods:     path.join(ROOT, 'contracts/qflink-pods/qflink-pods.polkavm'),
  messages: path.join(ROOT, 'contracts/qflink-messages/qflink-messages.polkavm'),
};

const ENV_PATH = path.join(ROOT, '.env');

// Selector for get_user_count() - used to check if contract is responsive
const CHECK_SELECTOR = '0xfd33482d';

// ─── Helpers ───────────────────────────────────────────────

function loadContract(name) {
  const filePath = CONTRACT_PATHS[name];
  if (!fs.existsSync(filePath)) {
    throw new Error(`Contract not found: ${filePath}\nRun ./build.sh first.`);
  }
  return '0x' + fs.readFileSync(filePath).toString('hex');
}

function sendTx(tx, signer) {
  return new Promise((resolve, reject) => {
    tx.signAndSend(signer, ({ status, events, dispatchError }) => {
      if (dispatchError) {
        if (dispatchError.isModule) {
          const decoded = signer.registry
            ? signer.registry.findMetaError(dispatchError.asModule)
            : { section: '?', name: '?', docs: [] };
          reject(new Error(`${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`));
        } else {
          reject(new Error(dispatchError.toString()));
        }
      }
      if (status.isInBlock || status.isFinalized) {
        resolve(events);
      }
    });
  });
}

function extractContractAddress(events) {
  for (const { event } of events) {
    if (event.section === 'revive' && event.method === 'Instantiated') {
      // event.data[1] is the contract address
      return event.data[1].toString();
    }
  }
  throw new Error('No revive.Instantiated event found — deployment may have failed');
}

function updateEnvFile(addresses) {
  // Write a clean .env with only the three contract addresses
  const env = [
    `VITE_REGISTRY_ADDRESS=${addresses.registry}`,
    `VITE_PODS_ADDRESS=${addresses.pods}`,
    `VITE_MESSAGES_ADDRESS=${addresses.messages}`,
  ].join('\n');
  fs.writeFileSync(ENV_PATH, env + '\n');
}

function loadExistingAddresses() {
  if (!fs.existsSync(ENV_PATH)) {
    return null;
  }
  const env = fs.readFileSync(ENV_PATH, 'utf8');
  const addresses = {};
  
  const registryMatch = env.match(/^VITE_REGISTRY_ADDRESS=(.+)$/m);
  const podsMatch = env.match(/^VITE_PODS_ADDRESS=(.+)$/m);
  const messagesMatch = env.match(/^VITE_MESSAGES_ADDRESS=(.+)$/m);
  
  if (registryMatch) addresses.registry = registryMatch[1].trim();
  if (podsMatch) addresses.pods = podsMatch[1].trim();
  if (messagesMatch) addresses.messages = messagesMatch[1].trim();
  
  return Object.keys(addresses).length === 3 ? addresses : null;
}

async function getAliceH160(api) {
  try {
    const entries = await api.query.revive.originalAccount.entries();
    const alice32 = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    const mapped = entries.find(([_key, value]) => value.toString() === alice32);
    if (mapped) {
      return mapped[0].args[0].toString();
    }
    return null;
  } catch {
    return null;
  }
}

async function queryPodCount(api, podsAddress) {
  try {
    const result = await api.call.reviveApi.call(
      '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      podsAddress,
      '0',
      null,
      null,
      GET_POD_COUNT_SELECTOR
    );
    const execResult = result?.result;
    if (execResult && execResult.isOk) {
      const data = execResult.asOk.data;
      if (data && data.length >= 8) {
        // Decode SCALE-encoded u64 (little-endian)
        let count = 0n;
        for (let i = 0; i < 8; i++) {
          count |= BigInt(data[i]) << BigInt(i * 8);
        }
        return Number(count);
      }
    }
    return 0;
  } catch {
    return 0;
  }
}

async function checkContractDeployed(api, address) {
  try {
    // Try a simple query to check if contract responds
    // Use the get_user_count() selector which exists on all our contracts
    const result = await api.call.reviveApi.call(
      '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', // Alice
      address,
      '0',
      null,
      null,
      CHECK_SELECTOR
    );
    // If we get a result (even an error), the contract exists
    return result && result.result;
  } catch (e) {
    return false;
  }
}

// ─── Main ──────────────────────────────────────────────────

async function main() {
  console.log('🔌 Connecting to node at', WS_URL, '...');
  const api = await ApiPromise.create({ provider: new WsProvider(WS_URL) });
  await api.isReady;
  console.log('✅ Connected\n');

  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');
  const bob = keyring.addFromUri('//Bob');

  // Step 1 — Map accounts
  console.log('📍 Mapping Alice...');
  try {
    await sendTx(api.tx.revive.mapAccount(), alice);
    console.log('   ✅ Alice mapped');
  } catch (e) {
    console.log('   ⚠️  Alice already mapped or error:', e.message);
  }

  // Print Alice's H160 for DEPLOYER verification
  const aliceH160 = await getAliceH160(api);
  if (aliceH160) {
    console.log(`   📋 Alice H160: ${aliceH160}`);
    console.log('   ℹ️  This must match DEPLOYER constant in qflink-pods/src/main.rs');
  } else {
    console.warn('   ⚠️  Could not query Alice H160 — verify DEPLOYER manually');
  }

  console.log('📍 Mapping Bob...');
  try {
    await sendTx(api.tx.revive.mapAccount(), bob);
    console.log('   ✅ Bob mapped');
  } catch (e) {
    console.log('   ⚠️  Bob already mapped or error:', e.message);
  }

  // Check if contracts are already deployed
  const existingAddresses = loadExistingAddresses();
  if (existingAddresses) {
    console.log('\n🔍 Checking for existing contracts...');
    const registryOk = await checkContractDeployed(api, existingAddresses.registry);
    const podsOk = await checkContractDeployed(api, existingAddresses.pods);
    const messagesOk = await checkContractDeployed(api, existingAddresses.messages);
    
    if (registryOk && podsOk && messagesOk) {
      console.log('\n' + '═'.repeat(50));
      console.log('📦 Contracts already deployed');
      console.log('═'.repeat(50));
      console.log(`   Registry: ${existingAddresses.registry}`);
      console.log(`   Pods:     ${existingAddresses.pods}`);
      console.log(`   Messages: ${existingAddresses.messages}`);
      console.log('\n✅ Using existing contracts (node state persisted)');
      console.log('═'.repeat(50));
      await api.disconnect();
      process.exit(0);
    } else {
      console.log('   ⚠️  Some contracts not responding, redeploying...');
    }
  }

  // Step 2 — Deploy contracts
  const addresses = {};

  for (const [name, _path] of Object.entries(CONTRACT_PATHS)) {
    console.log(`\n📦 Deploying ${name}...`);
    const code = loadContract(name);
    const tx = api.tx.revive.instantiateWithCode(
      0,             // value
      GAS,           // gasLimit
      STORAGE_DEPOSIT, // storageDepositLimit
      code,          // code
      '0x',          // data (no constructor args)
      null           // salt (let chain pick)
    );

    const events = await sendTx(tx, alice);
    const addr = extractContractAddress(events);
    addresses[name] = addr;
    console.log(`   ✅ ${name} deployed at: ${addr}`);
  }

  // Step 3 — Initialize pods
  console.log('\n🚀 Initializing pods...');
  const initTx = api.tx.revive.call(
    addresses.pods,   // dest
    0,                // value
    GAS,              // gasLimit
    STORAGE_DEPOSIT,  // storageDepositLimit
    INIT_PODS_SELECTOR // data
  );
  await sendTx(initTx, alice);

  // Verify initialization actually worked (contract reverts are silent at dispatch level)
  const podCount = await queryPodCount(api, addresses.pods);
  if (podCount >= 3) {
    console.log(`   ✅ Pods initialized — ${podCount} pods created`);
  } else {
    console.error(`   ❌ Pods initialization FAILED — pod count is ${podCount} (expected >= 3)`);
    console.error('      The DEPLOYER constant in qflink-pods/src/main.rs may not match Alice\'s H160.');
    if (aliceH160) {
      console.error(`      Alice H160: ${aliceH160}`);
      console.error('      Update DEPLOYER in the contract to match, rebuild, and redeploy.');
    }
    await api.disconnect();
    process.exit(1);
  }

  // Step 4 — Update .env
  console.log('\n📝 Updating .env...');
  updateEnvFile(addresses);
  console.log('   ✅ .env updated');

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log('🎉 Deployment complete!');
  console.log('═'.repeat(50));
  console.log(`   Registry: ${addresses.registry}`);
  console.log(`   Pods:     ${addresses.pods}`);
  console.log(`   Messages: ${addresses.messages}`);
  console.log('\nNext steps:');
  console.log('   1. Run: npm run dev');
  console.log('   2. Connect wallet & register on Profile page');
  console.log('═'.repeat(50));

  await api.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Deployment failed:', err.message);
  process.exit(1);
});

