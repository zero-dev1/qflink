// deploy-mainnet.mjs — QFLink mainnet deployment script for QF Network
// Usage: DEPLOYER_SEED="0x..." TREASURY_ADDRESS="0x..." node deploy-mainnet.mjs
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { keccakAsU8a, decodeAddress } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { ethers } from 'ethers';

// ============================================
// CONFIGURATION
// ============================================
const MAINNET_RPC_URL = 'wss://mainnet.qfnode.net';
const BUILD_DIR = './build';

// Environment variables
const DEPLOYER_SEED = process.env.DEPLOYER_SEED;
const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || '0x000000000000000000000000000000000000dEaD';

// ============================================
// VALIDATION
// ============================================
if (!DEPLOYER_SEED) {
  console.error('❌ DEPLOYER_SEED environment variable is required');
  console.error('   Usage: DEPLOYER_SEED="0x..." node deploy-mainnet.mjs');
  process.exit(1);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function substrateToEvmAddress(ss58Address) {
  if (typeof ss58Address === 'string' && ss58Address.startsWith('0x') && ss58Address.length === 42) {
    return ss58Address.toLowerCase();
  }
  const publicKey = decodeAddress(ss58Address);
  const hash = keccakAsU8a(publicKey);
  return u8aToHex(hash.slice(12));
}

/**
 * Load contract artifact from build/ directory.
 * QFLink's build has: combined.json with all contracts (from resolc)
 */
function loadArtifact(contractName) {
  const raw = JSON.parse(readFileSync('./build/combined.json', 'utf-8'));
  const key = Object.keys(raw.contracts).find(k => k.endsWith(':' + contractName));
  if (!key) throw new Error(`${contractName} not found in combined.json`);
  const c = raw.contracts[key];
  const abi = typeof c.abi === 'string' ? JSON.parse(c.abi) : c.abi;
  const bytecode = c.bin.startsWith('0x') ? c.bin : '0x' + c.bin;
  
  console.log(`  📦 ${contractName}: ABI=${abi.length} entries, code=${(bytecode.length - 2) / 2} bytes`);
  return { abi, bytecode };
}

/**
 * Encode constructor arguments using ethers Interface.
 */
function encodeConstructorArgs(abi, args = []) {
  const constructorAbi = abi.find(item => item.type === 'constructor');
  if (!constructorAbi || args.length === 0) return '0x';
  const iface = new ethers.Interface(abi);
  return iface.encodeDeploy(args);
}

/**
 * Deploy a contract using revive.instantiateWithCode.
 */
async function deployContract(api, deployer, name, artifact, args = [], options = {}) {
  console.log(`\n--- Deploying ${name} ---`);
  if (args.length) {
    const argsStr = args.map(a => 
      typeof a === 'bigint' ? a.toString() : 
      (typeof a === 'string' && a.length > 20) ? a.slice(0, 10) + '...' : a
    ).join(', ');
    console.log(`    Args: [${argsStr}]`);
  }

  const { abi, bytecode } = artifact;
  const constructorData = encodeConstructorArgs(abi, args);
  const data = constructorData === '0x' ? '' : constructorData;

  const tx = api.tx.revive.instantiateWithCode(
    options.value || BigInt(0),
    options.gasLimit,
    options.storageDepositLimit,
    bytecode,
    data,
    null
  );

  console.log(`  ⏳ Submitting tx...`);
  console.log(`  📊 Gas limit: ${options.gasLimit?.refTime?.toString() || 'N/A'} refTime, ${options.gasLimit?.proofSize?.toString() || 'N/A'} proofSize`);
  console.log(`  💰 Storage deposit: ${options.storageDepositLimit?.toString() || 'N/A'}`);

  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${name} deployment timed out (180s)`)), 180000);

    tx.signAndSend(deployer, { withSignedTransaction: false }, ({ status, events, dispatchError }) => {
      if (dispatchError) {
        clearTimeout(timeout);
        if (dispatchError.isModule) {
          const decoded = api.registry.findMetaError(dispatchError.asModule);
          reject(new Error(`${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`));
        } else {
          reject(new Error(dispatchError.toString()));
        }
        return;
      }
      if (status.isInBlock) console.log(`  📦 In block: ${status.asInBlock.toHex()}`);
      if (status.isFinalized) {
        clearTimeout(timeout);
        let contractAddress = null;
        for (const { event } of events) {
          if (event.section === 'revive' && event.method === 'Instantiated' && event.data.length >= 2) {
            contractAddress = event.data[1]?.toString();
            break;
          }
        }
        resolve({ contractAddress });
      }
    }).catch(err => { clearTimeout(timeout); reject(err); });
  });

  if (!result.contractAddress) throw new Error(`${name}: no contract address in events`);
  console.log(`  ✅ ${name} → ${result.contractAddress}`);
  return result.contractAddress;
}

/**
 * Call a contract function using revive.call.
 */
async function callContractTx(api, deployer, contractAddress, abi, methodName, args = [], options = {}) {
  console.log(`  📞 ${methodName}(${args.map(a => typeof a === 'string' && a.length > 20 ? a.slice(0, 10) + '...' : a).join(', ')})`);

  const iface = new ethers.Interface(abi);
  const data = iface.encodeFunctionData(methodName, args);

  const tx = api.tx.revive.call(
    contractAddress,
    options.value || BigInt(0),
    options.gasLimit,
    options.storageDepositLimit,
    data
  );

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${methodName} timed out (120s)`)), 120000);

    tx.signAndSend(deployer, { withSignedTransaction: false }, ({ status, dispatchError, events }) => {
      if (dispatchError) {
        clearTimeout(timeout);
        if (dispatchError.isModule) {
          const decoded = api.registry.findMetaError(dispatchError.asModule);
          console.error(`     ❌ ${decoded.section}.${decoded.name}`);
          events.forEach(({ event }) => console.error(`        ${event.section}.${event.method}:`, event.data.toHuman()));
          reject(new Error(`${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`));
        } else {
          reject(new Error(dispatchError.toString()));
        }
        return;
      }
      if (status.isFinalized) {
        clearTimeout(timeout);
        console.log(`     ✅ ${methodName} finalized`);
        resolve();
      }
    }).catch(err => { clearTimeout(timeout); reject(err); });
  });
}

// Small delay between txs to avoid nonce races
const delay = (ms) => new Promise(r => setTimeout(r, ms));

// ============================================
// MAIN DEPLOYMENT
// ============================================
async function main() {
  console.log('============================================');
  console.log('QFLINK MAINNET DEPLOYMENT');
  console.log('============================================');
  console.log(`RPC:      ${MAINNET_RPC_URL}`);
  console.log(`Treasury: ${TREASURY_ADDRESS}`);
  console.log('');

  // Connect
  console.log('📡 Connecting...');
  const provider = new WsProvider(MAINNET_RPC_URL);
  const api = await ApiPromise.create({ provider });

  const [chain, nodeName, nodeVersion] = await Promise.all([
    api.rpc.system.chain(),
    api.rpc.system.name(),
    api.rpc.system.version(),
  ]);
  console.log(`✅ ${chain} — ${nodeName} v${nodeVersion}`);

  if (!api.tx.revive) {
    console.error('❌ pallet-revive not found!');
    process.exit(1);
  }

  // Setup deployer
  const keyring = new Keyring({ type: 'sr25519' });
  const deployer = keyring.addFromUri(DEPLOYER_SEED);
  const deployerEvmAddress = substrateToEvmAddress(deployer.address);
  console.log(`\n🔑 Deployer SS58:  ${deployer.address}`);
  console.log(`   Deployer EVM:   ${deployerEvmAddress}`);

  const { data: balance } = await api.query.system.account(deployer.address);
  const freeBalance = balance.free.toBigInt();
  console.log(`   Balance:        ${(Number(freeBalance) / 1e18).toFixed(4)} QF`);
  if (freeBalance === 0n) { console.error('❌ Zero balance!'); process.exit(1); }

  // Map deployer account
  console.log('\n🗺️  Mapping deployer...');
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log('  ⏰ Mapping timeout - assuming already mapped');
        resolve();
      }, 30000); // 30 second timeout

      api.tx.revive.mapAccount().signAndSend(deployer, { withSignedTransaction: false }, ({ status, dispatchError }) => {
        if (dispatchError) {
          clearTimeout(timeout);
          const err = dispatchError.isModule
            ? api.registry.findMetaError(dispatchError.asModule)
            : dispatchError.toString();
          
          console.log('  📝 Mapping error details:', err);
          
          // Check for various "already mapped" error patterns
          const errorMsg = typeof err === 'string' ? err : `${err.section}.${err.name}`;
          if (errorMsg.includes('AlreadyMapped') || 
              errorMsg.includes('AccountAlreadyMapped') ||
              errorMsg.includes('AlreadyMapped') ||
              err.name === 'AlreadyMapped' ||
              err.section === 'revive' && err.name === 'AlreadyMapped') {
            console.log('  ✅ Account already mapped');
            resolve(); 
            return;
          }
          
          reject(new Error(`Mapping failed: ${errorMsg}`));
          return;
        }
        if (status.isFinalized) {
          clearTimeout(timeout);
          console.log('  ✅ Mapped'); 
          resolve(); 
        }
      }).catch(err => { 
        clearTimeout(timeout); 
        reject(err); 
      });
    });
  } catch (err) { 
    console.warn('  ⚠️', err.message); 
  }

  // Gas limits
  const blockWeights = api.consts.system.blockWeights;
  const maxExtrinsic = blockWeights.perClass.normal.maxExtrinsic.unwrap();
  const maxRefTime = maxExtrinsic.refTime.toBigInt();
  const maxProofSize = maxExtrinsic.proofSize.toBigInt();

  const DEPLOY_GAS = api.registry.createType('Weight', {
    refTime: maxRefTime * 75n / 100n,
    proofSize: maxProofSize * 75n / 100n,
  });
  const CALL_GAS = api.registry.createType('Weight', {
    refTime: maxRefTime * 50n / 100n,
    proofSize: maxProofSize * 50n / 100n,
  });
  const deployStorageDep = freeBalance / 10n;
  const callStorageDep = freeBalance / 100n;

  console.log(`\n⚖️  Gas — deploy refTime: ${(maxRefTime * 75n / 100n).toString()}, call refTime: ${(maxRefTime * 50n / 100n).toString()}`);

  // Load all artifacts
  console.log('\n📦 Loading artifacts...');
  const a = {};
  const contractNames = [
    'QFLinkRegistry',
    'QFLinkPodsStorage',
    'QFLinkPayments',
    'QFLinkContentStore',
    'QFLinkMessageIndex',
    'QFLinkPodsCreate',
    'QFLinkPodsCreatePaid',
    'QFLinkPodsJoin',
    'QFLinkPodsLeave',
    'QFLinkPodsBanSimple',
    'QFLinkPodsAddMod',
    'QFLinkPodsRemoveMod',
    'QFLinkPodsAdmin',
    'QFLinkPodsReader',
    'QFLinkPodsGetPod',
    'QFLinkMessageWriter',
    'QFLinkMessageReader',
  ];
  for (const name of contractNames) {
    a[name] = loadArtifact(name);
  }

  // ============================================
  // STEP 1: Deploy all contracts in dependency order
  // ============================================
  console.log('\n============================================');
  console.log('STEP 1: Deploy Contracts');
  console.log('============================================');

  const opts = { gasLimit: DEPLOY_GAS, storageDepositLimit: deployStorageDep };
  const callOpts = { gasLimit: CALL_GAS, storageDepositLimit: callStorageDep };
  const addresses = {};

  console.log(`\n⚙️  Deployment config:`);
  console.log(`   Deploy gas refTime: ${DEPLOY_GAS.refTime.toString()}`);
  console.log(`   Deploy gas proofSize: ${DEPLOY_GAS.proofSize.toString()}`);
  console.log(`   Storage deposit: ${deployStorageDep.toString()}`);

  // 1. Registry (no constructor args)
  console.log(`\n--- Deploying QFLinkRegistry ---`);
  addresses.registry = await deployContract(api, deployer, 'QFLinkRegistry', a.QFLinkRegistry, [], opts);
  await delay(1000);

  // 2. PodsStorage (constructor: address _auth — use deployer EVM as initial auth)
  addresses.podsStorage = await deployContract(api, deployer, 'QFLinkPodsStorage', a.QFLinkPodsStorage, [deployerEvmAddress], opts);
  await delay(1000);

  // 3. Payments (constructor: address _treasury, address _storage)
  addresses.payments = await deployContract(api, deployer, 'QFLinkPayments', a.QFLinkPayments, [TREASURY_ADDRESS, addresses.podsStorage], opts);
  await delay(1000);

  // 4. ContentStore (constructor: address _auth — will be set to MessageWriter later)
  addresses.contentStore = await deployContract(api, deployer, 'QFLinkContentStore', a.QFLinkContentStore, [deployerEvmAddress], opts);
  await delay(1000);

  // 5. MessageIndex (constructor: address _auth — will be set to MessageWriter later)
  addresses.messageIndex = await deployContract(api, deployer, 'QFLinkMessageIndex', a.QFLinkMessageIndex, [deployerEvmAddress], opts);
  await delay(1000);

  // 6. PodsCreate (constructor: address _storage, address _treasury)
  addresses.podsCreate = await deployContract(api, deployer, 'QFLinkPodsCreate', a.QFLinkPodsCreate, [addresses.podsStorage, TREASURY_ADDRESS], opts);
  await delay(1000);

  // 7. PodsCreatePaid (constructor: address _storage, address _payments, address _treasury, uint256 _creationFee)
  addresses.podsCreatePaid = await deployContract(api, deployer, 'QFLinkPodsCreatePaid', a.QFLinkPodsCreatePaid, [addresses.podsStorage, addresses.payments, TREASURY_ADDRESS, BigInt(1000000000000000000)], opts);
  await delay(1000);

  // 8. PodsJoin (constructor: address _storage, address _payments)
  addresses.podsJoin = await deployContract(api, deployer, 'QFLinkPodsJoin', a.QFLinkPodsJoin, [addresses.podsStorage, addresses.payments], opts);
  await delay(1000);

  // 9. PodsLeave (constructor: address _storage)
  addresses.podsLeave = await deployContract(api, deployer, 'QFLinkPodsLeave', a.QFLinkPodsLeave, [addresses.podsStorage], opts);
  await delay(1000);

  // 10. PodsBan (constructor: address _storage)
  addresses.podsBan = await deployContract(api, deployer, 'QFLinkPodsBanSimple', a.QFLinkPodsBanSimple, [addresses.podsStorage], opts);
  await delay(1000);

  // 11. PodsAddMod (constructor: address _storage)
  addresses.podsAddMod = await deployContract(api, deployer, 'QFLinkPodsAddMod', a.QFLinkPodsAddMod, [addresses.podsStorage], opts);
  await delay(1000);

  // 12. PodsRemoveMod (constructor: address _storage)
  addresses.podsRemoveMod = await deployContract(api, deployer, 'QFLinkPodsRemoveMod', a.QFLinkPodsRemoveMod, [addresses.podsStorage], opts);
  await delay(1000);

  // 13. PodsAdmin (constructor: address _storage, address _payments)
  addresses.podsAdmin = await deployContract(api, deployer, 'QFLinkPodsAdmin', a.QFLinkPodsAdmin, [addresses.podsStorage, addresses.payments], opts);
  await delay(1000);

  // 14. PodsReader (constructor: address _storage)
  addresses.podsReader = await deployContract(api, deployer, 'QFLinkPodsReader', a.QFLinkPodsReader, [addresses.podsStorage], opts);
  await delay(1000);

  // 15. PodsGetPod (constructor: address _storage)
  addresses.podsGetPod = await deployContract(api, deployer, 'QFLinkPodsGetPod', a.QFLinkPodsGetPod, [addresses.podsStorage], opts);
  await delay(1000);

  // 16. MessageWriter (constructor: address _contentStore, address _index, address _podsReader)
  addresses.messageWriter = await deployContract(api, deployer, 'QFLinkMessageWriter', a.QFLinkMessageWriter,
    [addresses.contentStore, addresses.messageIndex, addresses.podsReader], opts);
  await delay(1000);

  // 17. MessageReader (constructor: address _contentStore, address _index)
  addresses.messageReader = await deployContract(api, deployer, 'QFLinkMessageReader', a.QFLinkMessageReader,
    [addresses.contentStore, addresses.messageIndex], opts);
  await delay(1000);

  // ============================================
  // STEP 2: Wire authorization
  // ============================================
  console.log('\n============================================');
  console.log('STEP 2: Wire Authorization');
  console.log('============================================');

  // PodsStorage: authorize all pod logic contracts
  const podLogicContracts = [
    addresses.podsCreate,
    addresses.podsCreatePaid,
    addresses.podsJoin,
    addresses.podsLeave,
    addresses.podsBan,
    addresses.podsAddMod,
    addresses.podsRemoveMod,
    addresses.podsAdmin,
  ];

  console.log('\n  [2a] PodsStorage: authorize pod logic contracts...');
  for (const addr of podLogicContracts) {
    await callContractTx(api, deployer, addresses.podsStorage, a.QFLinkPodsStorage.abi,
      'setAuthorized', [addr, true], callOpts);
    await delay(500);
  }

  // ContentStore: authorize MessageWriter
  console.log('\n  [2b] ContentStore: authorize MessageWriter...');
  await callContractTx(api, deployer, addresses.contentStore, a.QFLinkContentStore.abi,
    'setAuthorized', [addresses.messageWriter], callOpts);
  await delay(500);

  // MessageIndex: authorize MessageWriter
  console.log('\n  [2c] MessageIndex: authorize MessageWriter...');
  await callContractTx(api, deployer, addresses.messageIndex, a.QFLinkMessageIndex.abi,
    'setAuthorized', [addresses.messageWriter], callOpts);
  await delay(500);

  // Payments: authorize PodsJoin and PodsCreatePaid
  console.log('\n  [2d] Payments: authorize PodsJoin + PodsCreatePaid...');
  await callContractTx(api, deployer, addresses.payments, a.QFLinkPayments.abi,
    'setAuthorized', [addresses.podsJoin, true], callOpts);
  await delay(500);
  await callContractTx(api, deployer, addresses.payments, a.QFLinkPayments.abi,
    'setAuthorized', [addresses.podsCreatePaid, true], callOpts);
  await delay(500);

  // Payments: authorize PodsAdmin (for setEntryFee)
  console.log('\n  [2e] Payments: authorize PodsAdmin...');
  await callContractTx(api, deployer, addresses.payments, a.QFLinkPayments.abi,
    'setAuthorized', [addresses.podsAdmin, true], callOpts);
  await delay(500);

  console.log('\n  ✅ All wiring complete!');

  // ============================================
  // STEP 3: Output results
  // ============================================
  console.log('\n============================================');
  console.log('DEPLOYMENT COMPLETE');
  console.log('============================================\n');

  const envLines = [
    `VITE_WS_URL=wss://mainnet.qfnode.net`,
    `VITE_DEFAULT_NETWORK=mainnet`,
    `VITE_OWNER_ADDRESS=${deployerEvmAddress}`,
    `VITE_REGISTRY_ADDRESS=${addresses.registry}`,
    `VITE_PODS_STORAGE_ADDRESS=${addresses.podsStorage}`,
    `VITE_PODS_CREATE_ADDRESS=${addresses.podsCreate}`,
    `VITE_PODS_CREATE_PAID_ADDRESS=${addresses.podsCreatePaid}`,
    `VITE_PODS_JOIN_ADDRESS=${addresses.podsJoin}`,
    `VITE_PODS_LEAVE_ADDRESS=${addresses.podsLeave}`,
    `VITE_PODS_BAN_ADDRESS=${addresses.podsBan}`,
    `VITE_PODS_ADDMOD_ADDRESS=${addresses.podsAddMod}`,
    `VITE_PODS_REMOVEMOD_ADDRESS=${addresses.podsRemoveMod}`,
    `VITE_PODS_ADMIN_ADDRESS=${addresses.podsAdmin}`,
    `VITE_PODS_READER_ADDRESS=${addresses.podsReader}`,
    `VITE_PODS_GETPOD_ADDRESS=${addresses.podsGetPod}`,
    `VITE_PAYMENTS_ADDRESS=${addresses.payments}`,
    `VITE_CONTENT_STORE_ADDRESS=${addresses.contentStore}`,
    `VITE_MESSAGE_INDEX_ADDRESS=${addresses.messageIndex}`,
    `VITE_MESSAGE_WRITER_ADDRESS=${addresses.messageWriter}`,
    `VITE_MESSAGE_READER_ADDRESS=${addresses.messageReader}`,
  ];

  console.log('ENV VARIABLES (copy to .env.production):');
  console.log('─────────────────────────────────────────');
  envLines.forEach(l => console.log(l));
  console.log('');

  // Write .env.production
  writeFileSync('.env.production', envLines.join('\n') + '\n');
  console.log('✅ Written to .env.production');

  // Write deployments.json for reference
  writeFileSync('deployments-mainnet.json', JSON.stringify({
    network: 'mainnet',
    rpcUrl: MAINNET_RPC_URL,
    deployer: { ss58: deployer.address, evm: deployerEvmAddress },
    treasury: TREASURY_ADDRESS,
    contracts: addresses,
    timestamp: new Date().toISOString(),
  }, null, 2));
  console.log('✅ Written to deployments-mainnet.json');

  console.log('\n🔑 Deployer Info:');
  console.log(`   SS58: ${deployer.address}`);
  console.log(`   EVM:  ${deployerEvmAddress}`);
  console.log(`   Balance remaining: ${(Number((await api.query.system.account(deployer.address)).data.free.toBigInt()) / 1e18).toFixed(4)} QF`);

  await api.disconnect();
  console.log('\n✅ Done!');
}

main().catch(err => {
  console.error('\n❌ Deployment failed:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
