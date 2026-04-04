// deploy-upgrade.mjs — QFLink contract upgrade deployment
// Deploys upgraded: Payments, PodsCreate, PodsCreatePaid, PodsJoin, PodsAdmin
// Wires into existing PodsStorage, deauthorizes old versions
//
// Usage: DEPLOYER_SEED="0x..." node deploy-upgrade.mjs
// Optional: TREASURY_ADDRESS="0x..." (defaults to value in deployments-mainnet.json)

import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { keccakAsU8a, decodeAddress } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import { readFileSync, writeFileSync } from 'fs';
import { ethers } from 'ethers';

const MAINNET_RPC_URL = 'wss://mainnet.qfnode.net';
const BUILD_DIR = './build';
const DEPLOYER_SEED = process.env.DEPLOYER_SEED;

if (!DEPLOYER_SEED) {
  console.error('❌ DEPLOYER_SEED required. Usage: DEPLOYER_SEED="0x..." node deploy-upgrade.mjs');
  process.exit(1);
}

// Load existing deployment
const existing = JSON.parse(readFileSync('deployments-mainnet.json', 'utf-8'));
const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || existing.treasury;
const PODS_STORAGE = existing.contracts.podsStorage;

console.log('============================================');
console.log('QFLINK CONTRACT UPGRADE');
console.log('============================================');
console.log(`PodsStorage (preserved): ${PODS_STORAGE}`);
console.log(`Treasury:                ${TREASURY_ADDRESS}`);
console.log('');
console.log('Old addresses to deauthorize:');
console.log(`  PodsCreate:     ${existing.contracts.podsCreate}`);
console.log(`  PodsCreatePaid: ${existing.contracts.podsCreatePaid}`);
console.log(`  PodsJoin:       ${existing.contracts.podsJoin}`);
console.log(`  PodsAdmin:      ${existing.contracts.podsAdmin}`);
console.log(`  Payments:       ${existing.contracts.payments}`);
console.log('');

// ── Utility functions (same as deploy-mainnet.mjs) ──

function substrateToEvmAddress(ss58Address) {
  if (typeof ss58Address === 'string' && ss58Address.startsWith('0x') && ss58Address.length === 42) {
    return ss58Address.toLowerCase();
  }
  const publicKey = decodeAddress(ss58Address);
  const hash = keccakAsU8a(publicKey);
  return u8aToHex(hash.slice(12));
}

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

function encodeConstructorArgs(abi, args = []) {
  const constructorAbi = abi.find(item => item.type === 'constructor');
  if (!constructorAbi || args.length === 0) return '0x';
  const iface = new ethers.Interface(abi);
  return iface.encodeDeploy(args);
}

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
    options.value || BigInt(0), options.gasLimit, options.storageDepositLimit, bytecode, data, null
  );
  console.log(`  ⏳ Submitting tx...`);
  const result = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${name} deployment timed out (180s)`)), 180000);
    tx.signAndSend(deployer, { withSignedTransaction: false }, ({ status, events, dispatchError }) => {
      if (dispatchError) {
        clearTimeout(timeout);
        if (dispatchError.isModule) {
          const decoded = api.registry.findMetaError(dispatchError.asModule);
          reject(new Error(`${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`));
        } else { reject(new Error(dispatchError.toString())); }
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

async function callContractTx(api, deployer, contractAddress, abi, methodName, args = [], options = {}) {
  console.log(`  📞 ${methodName}(${args.map(a => typeof a === 'string' && a.length > 20 ? a.slice(0, 10) + '...' : a).join(', ')})`);
  const iface = new ethers.Interface(abi);
  const data = iface.encodeFunctionData(methodName, args);
  const tx = api.tx.revive.call(
    contractAddress, options.value || BigInt(0), options.gasLimit, options.storageDepositLimit, data
  );
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${methodName} timed out (120s)`)), 120000);
    tx.signAndSend(deployer, { withSignedTransaction: false }, ({ status, dispatchError, events }) => {
      if (dispatchError) {
        clearTimeout(timeout);
        if (dispatchError.isModule) {
          const decoded = api.registry.findMetaError(dispatchError.asModule);
          console.error(`     ❌ ${decoded.section}.${decoded.name}`);
          reject(new Error(`${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`));
        } else { reject(new Error(dispatchError.toString())); }
        return;
      }
      if (status.isFinalized) { clearTimeout(timeout); console.log(`     ✅ ${methodName} finalized`); resolve(); }
    }).catch(err => { clearTimeout(timeout); reject(err); });
  });
}

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  const provider = new WsProvider(MAINNET_RPC_URL);
  const api = await ApiPromise.create({ provider });
  const keyring = new Keyring({ type: 'sr25519' });
  const deployer = keyring.addFromUri(DEPLOYER_SEED);
  const deployerEvmAddress = substrateToEvmAddress(deployer.address);

  console.log(`🔑 Deployer: ${deployer.address} (EVM: ${deployerEvmAddress})`);
  const { data: balance } = await api.query.system.account(deployer.address);
  console.log(`   Balance: ${(Number(balance.free.toBigInt()) / 1e18).toFixed(4)} QF\n`);

  // Gas
  const blockWeights = api.consts.system.blockWeights;
  const maxExtrinsic = blockWeights.perClass.normal.maxExtrinsic.unwrap();
  const maxRefTime = maxExtrinsic.refTime.toBigInt();
  const maxProofSize = maxExtrinsic.proofSize.toBigInt();
  const DEPLOY_GAS = api.registry.createType('Weight', {
    refTime: maxRefTime * 75n / 100n, proofSize: maxProofSize * 75n / 100n,
  });
  const CALL_GAS = api.registry.createType('Weight', {
    refTime: maxRefTime * 50n / 100n, proofSize: maxProofSize * 50n / 100n,
  });
  const freeBalance = balance.free.toBigInt();
  const deployStorageDep = freeBalance / 10n;
  const callStorageDep = freeBalance / 100n;
  const opts = { gasLimit: DEPLOY_GAS, storageDepositLimit: deployStorageDep };
  const callOpts = { gasLimit: CALL_GAS, storageDepositLimit: callStorageDep };

  // Load artifacts
  console.log('📦 Loading artifacts...');
  const aPayments = loadArtifact('QFLinkPayments');
  const aPodsCreate = loadArtifact('QFLinkPodsCreate');
  const aPodsCreatePaid = loadArtifact('QFLinkPodsCreatePaid');
  const aPodsJoin = loadArtifact('QFLinkPodsJoin');
  const aPodsAdmin = loadArtifact('QFLinkPodsAdmin');

  // Also load PodsStorage ABI for setAuthorized calls
  const aPodsStorage = loadArtifact('QFLinkPodsStorage');

  // ============================================
  // STEP 1: Deploy upgraded contracts
  // ============================================
  console.log('\n============================================');
  console.log('STEP 1: Deploy Upgraded Contracts');
  console.log('============================================');

  // 1. Payments (first — no dependency on other new contracts)
  const newPayments = await deployContract(api, deployer, 'QFLinkPayments', aPayments,
    [TREASURY_ADDRESS, PODS_STORAGE], opts);
  await delay(1000);

  // 2. PodsCreate
  const newPodsCreate = await deployContract(api, deployer, 'QFLinkPodsCreate', aPodsCreate,
    [PODS_STORAGE, TREASURY_ADDRESS], opts);
  await delay(1000);

  // 3. PodsCreatePaid (needs new Payments address)
  const CREATION_FEE_WEI = 500000000000000000000n; // 500 QF
  const newPodsCreatePaid = await deployContract(api, deployer, 'QFLinkPodsCreatePaid', aPodsCreatePaid,
    [PODS_STORAGE, newPayments, TREASURY_ADDRESS, CREATION_FEE_WEI], opts);
  await delay(1000);

  // 4. PodsJoin (needs new Payments address)
  const newPodsJoin = await deployContract(api, deployer, 'QFLinkPodsJoin', aPodsJoin,
    [PODS_STORAGE, newPayments], opts);
  await delay(1000);

  // 5. PodsAdmin (same code, new Payments ref)
  const newPodsAdmin = await deployContract(api, deployer, 'QFLinkPodsAdmin', aPodsAdmin,
    [PODS_STORAGE, newPayments], opts);
  await delay(1000);

  // ============================================
  // STEP 2: Authorize new contracts on PodsStorage
  // ============================================
  console.log('\n============================================');
  console.log('STEP 2: Authorize New Contracts on PodsStorage');
  console.log('============================================');

  const newContracts = [newPodsCreate, newPodsCreatePaid, newPodsJoin, newPodsAdmin];
  for (const addr of newContracts) {
    await callContractTx(api, deployer, PODS_STORAGE, aPodsStorage.abi,
      'setAuthorized', [addr, true], callOpts);
    await delay(500);
  }

  // ============================================
  // STEP 3: Authorize contracts on new Payments
  // ============================================
  console.log('\n============================================');
  console.log('STEP 3: Authorize on New Payments');
  console.log('============================================');

  await callContractTx(api, deployer, newPayments, aPayments.abi,
    'setAuthorized', [newPodsCreatePaid, true], callOpts);
  await delay(500);
  await callContractTx(api, deployer, newPayments, aPayments.abi,
    'setAuthorized', [newPodsJoin, true], callOpts);
  await delay(500);
  await callContractTx(api, deployer, newPayments, aPayments.abi,
    'setAuthorized', [newPodsAdmin, true], callOpts);
  await delay(500);

  // ============================================
  // STEP 4: Deauthorize old contracts on PodsStorage
  // ============================================
  console.log('\n============================================');
  console.log('STEP 4: Deauthorize Old Contracts on PodsStorage');
  console.log('============================================');

  const oldContracts = [
    existing.contracts.podsCreate,
    existing.contracts.podsCreatePaid,
    existing.contracts.podsJoin,
    existing.contracts.podsAdmin,
  ];
  for (const addr of oldContracts) {
    await callContractTx(api, deployer, PODS_STORAGE, aPodsStorage.abi,
      'setAuthorized', [addr, false], callOpts);
    await delay(500);
  }

  // ============================================
  // STEP 5: Output results
  // ============================================
  console.log('\n============================================');
  console.log('UPGRADE COMPLETE');
  console.log('============================================\n');

  console.log('New contract addresses:');
  console.log(`  Payments:       ${newPayments}`);
  console.log(`  PodsCreate:     ${newPodsCreate}`);
  console.log(`  PodsCreatePaid: ${newPodsCreatePaid}`);
  console.log(`  PodsJoin:       ${newPodsJoin}`);
  console.log(`  PodsAdmin:      ${newPodsAdmin}`);

  console.log('\n── Vercel env vars to UPDATE (only these 5 change) ──');
  console.log(`VITE_PAYMENTS_ADDRESS=${newPayments}`);
  console.log(`VITE_PODS_CREATE_ADDRESS=${newPodsCreate}`);
  console.log(`VITE_PODS_CREATE_PAID_ADDRESS=${newPodsCreatePaid}`);
  console.log(`VITE_PODS_JOIN_ADDRESS=${newPodsJoin}`);
  console.log(`VITE_PODS_ADMIN_ADDRESS=${newPodsAdmin}`);

  // Update deployments JSON
  const updated = {
    ...existing,
    contracts: {
      ...existing.contracts,
      payments: newPayments,
      podsCreate: newPodsCreate,
      podsCreatePaid: newPodsCreatePaid,
      podsJoin: newPodsJoin,
      podsAdmin: newPodsAdmin,
    },
    upgrade: {
      timestamp: new Date().toISOString(),
      description: 'Configurable fees, splits, burn address; migration helpers on Payments',
      oldContracts: {
        payments: existing.contracts.payments,
        podsCreate: existing.contracts.podsCreate,
        podsCreatePaid: existing.contracts.podsCreatePaid,
        podsJoin: existing.contracts.podsJoin,
        podsAdmin: existing.contracts.podsAdmin,
      },
    },
  };
  writeFileSync('deployments-mainnet.json', JSON.stringify(updated, null, 2));
  console.log('\n✅ Updated deployments-mainnet.json');

  const { data: endBalance } = await api.query.system.account(deployer.address);
  console.log(`\n🔑 Balance remaining: ${(Number(endBalance.free.toBigInt()) / 1e18).toFixed(4)} QF`);

  await api.disconnect();
  console.log('✅ Done!');
}

main().catch(err => {
  console.error('\n❌ Upgrade failed:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
