#!/usr/bin/env node
/**
 * PHASE 3 EDGE CASES AUDIT - QFLink Pods
 * Uses Polkadot API to interact with PolkaVM contracts
 */

import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { keccak256AsU8a } from '@polkadot/util-crypto';
import { u8aToHex, hexToU8a } from '@polkadot/util';

// Contract addresses from .env.development
const ADDRESSES = {
  CREATE: '0x14cc7da676d0ab469cfe4094d9e9afde1affc3fa',
  JOIN: '0x4e8667bf8ddd17e4807fb94f418bef3bb9b7df44',
  LEAVE: '0xbffb6fac04ea51646090ce5b7668861f1e403004',
  STORAGE: '0xf509a47d95fb21f347d4862330c8b8dbe00a828e',
  READER: '0x2cbbdac73acb623d57e195fc23998ba3fe218ee8',
};

// Test results
const results = [];
let edgePodId = 1; // Will be set after creation

// Helper: Get function selector
function getSelector(sig) {
  const hash = keccak256AsU8a(new TextEncoder().encode(sig));
  return u8aToHex(hash.slice(0, 4));
}

// Helper: Send transaction via Polkadot API
async function sendTx(api, signer, contract, data, value = 0) {
  const gasLimit = api.registry.createType('WeightV2', {
    refTime: api.registry.createType('Compact<u64>', '100000000000'),
    proofSize: api.registry.createType('Compact<u64>', '100000000000'),
  });
  
  return new Promise((resolve, reject) => {
    api.tx.revive
      .call(contract, value.toString(), gasLimit, null, null, data)
      .signAndSend(signer, { nonce: -1 }, (result) => {
        if (result.status.isInBlock || result.status.isFinalized) {
          const success = !result.dispatchError;
          let error = null;
          if (result.dispatchError) {
            if (result.dispatchError.isModule) {
              const decoded = api.registry.findMetaError(result.dispatchError.asModule);
              error = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
            } else {
              error = result.dispatchError.toString();
            }
          }
          resolve({ success, error, events: result.events });
        }
        if (result.isError) {
          reject(new Error('Transaction failed'));
        }
      })
      .catch(reject);
  });
}

// Helper: Call view function
async function callView(api, caller, contract, data) {
  const result = await api.call.reviveApi.call(
    caller,
    contract,
    '0',
    null,
    null,
    data
  );
  return result;
}

// Helper: Log test result
function logResult(testNum, testName, expected, actual, passed) {
  results.push({ testNum, testName, expected, actual, passed });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`\n${status} - TEST ${testNum}: ${testName}`);
  console.log(`  Expected: ${expected}`);
  console.log(`  Actual:   ${actual}`);
}

// Setup function
async function setup(api, alice) {
  console.log('========================================');
  console.log('PHASE 3: EDGE CASES AUDIT');
  console.log('========================================\n');
  
  // Map Alice if not already mapped
  try {
    await new Promise((resolve, reject) => {
      api.tx.revive.mapAccount()
        .signAndSend(alice, { nonce: -1 }, (result) => {
          if (result.status.isInBlock || result.status.isFinalized) resolve();
          if (result.isError) reject();
        })
        .catch(reject);
    });
    console.log('✓ Alice mapped');
  } catch (e) {
    console.log('✓ Alice already mapped');
  }
  
  // Get Alice's H160
  const entries = await api.query.revive.originalAccount.entries();
  let aliceH160 = null;
  for (const [key, value] of entries) {
    if (value.toString() === alice.address) {
      aliceH160 = key.args[0].toString();
      break;
    }
  }
  console.log(`✓ Alice H160: ${aliceH160}`);
  
  // Get current pod count
  const selector = getSelector('getPodCount()');
  const result = await callView(api, aliceH160, ADDRESSES.READER, selector);
  let currentCount = 0;
  if (result.result.isOk) {
    const data = result.result.asOk.data;
    if (data.length >= 8) {
      const view = new DataView(new Uint8Array(data.slice(0, 8)).buffer);
      currentCount = Number(view.getBigUint64(0, false));
    }
  }
  console.log(`✓ Current pod count: ${currentCount}\n`);
  
  return { aliceH160, currentCount };
}

// Run all tests
async function runTests(api, alice, bob, aliceH160, bobH160) {
  
  // ============================================
  // SETUP: Create a test pod
  // ============================================
  console.log('--- SETUP: Creating test pod ---');
  
  // Encode: createPod(bytes32,bool,uint256,bytes32,bytes)
  const createSelector = getSelector('createPod(bytes32,bool,uint256,bytes32,bytes)');
  
  // Parameters:
  // name = "EdgeTest" (bytes32)
  const name = '0x4564676554657374000000000000000000000000000000000000000000000000';
  // isPublic = true
  const isPublic = '0x0000000000000000000000000000000000000000000000000000000000000001';
  // threshold = 0
  const threshold = '0x0000000000000000000000000000000000000000000000000000000000000000';
  // category = "trading" (bytes32)
  const category = '0x74726164696e6700000000000000000000000000000000000000000000000000';
  // description = "Edge case testing" (bytes)
  // ABI encoding: offset (32) + length (32) + data (padded)
  const descOffset = '0x00000000000000000000000000000000000000000000000000000000000000a0';
  const descLength = '0x0000000000000000000000000000000000000000000000000000000000000011'; // 17 bytes
  const descData = '0x4564676520636173652074657374696e67000000000000000000000000000000';
  
  const createData = createSelector + name.slice(2) + isPublic.slice(2) + threshold.slice(2) + 
                     category.slice(2) + descOffset.slice(2) + descLength.slice(2) + descData.slice(2);
  
  // Value: 500 QF = 500 * 10^18
  const creationFee = 500n * 10n ** 18n;
  
  const createResult = await sendTx(api, alice, ADDRESSES.CREATE, createData, creationFee);
  if (createResult.success) {
    console.log('✓ Test pod created');
    edgePodId = 3; // Assuming it's pod 3 (after the initial pods)
  } else {
    console.log('✗ Failed to create test pod:', createResult.error);
    edgePodId = 1; // Use existing pod
  }
  
  // Get the pod ID
  const selector = getSelector('getPodCount()');
  const countResult = await callView(api, aliceH160, ADDRESSES.READER, selector);
  if (countResult.result.isOk) {
    const data = countResult.result.asOk.data;
    if (data.length >= 8) {
      const view = new DataView(new Uint8Array(data.slice(0, 8)).buffer);
      edgePodId = Number(view.getBigUint64(0, false));
    }
  }
  console.log(`✓ Using pod ID: ${edgePodId}\n`);
  
  // ============================================
  // SETUP: ADDR2 (Bob) joins
  // ============================================
  console.log('--- SETUP: Bob joining pod ---');
  
  // Map Bob if needed
  try {
    await new Promise((resolve, reject) => {
      api.tx.revive.mapAccount()
        .signAndSend(bob, { nonce: -1 }, (result) => {
          if (result.status.isInBlock || result.status.isFinalized) resolve();
          if (result.isError) reject();
        })
        .catch(reject);
    });
  } catch (e) {}
  
  // Get Bob's H160
  const entries = await api.query.revive.originalAccount.entries();
  let bobH160Found = null;
  for (const [key, value] of entries) {
    if (value.toString() === bob.address) {
      bobH160Found = key.args[0].toString();
      break;
    }
  }
  console.log(`✓ Bob H160: ${bobH160Found}`);
  
  const joinSelector = getSelector('joinPod(uint64)');
  const joinData = joinSelector + BigInt(edgePodId).toString(16).padStart(64, '0');
  
  const joinResult = await sendTx(api, bob, ADDRESSES.JOIN, joinData, 0);
  console.log(`✓ Bob join result: ${joinResult.success ? 'SUCCESS' : 'FAILED - ' + joinResult.error}\n`);
  
  // ============================================
  // TEST 1: Join a pod you're already in
  // Expected: REVERT
  // ============================================
  console.log('--- TEST 1: Double join (should REVERT) ---');
  const doubleJoinResult = await sendTx(api, bob, ADDRESSES.JOIN, joinData, 0);
  logResult(
    1,
    'Double join (join pod already member of)',
    'REVERT',
    doubleJoinResult.success ? 'SUCCESS' : `REVERTED${doubleJoinResult.error ? ' (' + doubleJoinResult.error + ')' : ''}`,
    !doubleJoinResult.success
  );
  
  // ============================================
  // TEST 2: Leave a pod you're not in
  // Expected: REVERT
  // ============================================
  console.log('--- TEST 2: Leave pod not a member of (should REVERT) ---');
  // Use Charlie (not a member)
  const charlie = new Keyring({ type: 'sr25519' }).addFromUri('//Charlie');
  try {
    await new Promise((resolve, reject) => {
      api.tx.revive.mapAccount().signAndSend(charlie, { nonce: -1 }, (result) => {
        if (result.status.isInBlock || result.status.isFinalized) resolve();
        if (result.isError) reject();
      }).catch(reject);
    });
  } catch (e) {}
  
  const charlieEntries = await api.query.revive.originalAccount.entries();
  let charlieH160 = null;
  for (const [key, value] of charlieEntries) {
    if (value.toString() === charlie.address) {
      charlieH160 = key.args[0].toString();
      break;
    }
  }
  
  const leaveSelector = getSelector('leavePod(uint64)');
  const leaveData = leaveSelector + BigInt(edgePodId).toString(16).padStart(64, '0');
  const leaveResult = await sendTx(api, charlie, ADDRESSES.LEAVE, leaveData, 0);
  logResult(
    2,
    'Leave pod not a member of',
    'REVERT',
    leaveResult.success ? 'SUCCESS' : `REVERTED${leaveResult.error ? ' (' + leaveResult.error + ')' : ''}`,
    !leaveResult.success
  );
  
  // ============================================
  // TEST 3: Ban a non-member
  // Expected: REVERT
  // ============================================
  console.log('--- TEST 3: Ban non-member (should REVERT) ---');
  const banSelector = getSelector('banMember(uint64,address)');
  const nonMemberAddr = '0x0000000000000000000000000000000000000001';
  const banData = banSelector + 
    BigInt(edgePodId).toString(16).padStart(64, '0') +
    nonMemberAddr.slice(2).padStart(64, '0');
  const banResult = await sendTx(api, alice, ADDRESSES.STORAGE, banData, 0);
  logResult(
    3,
    'Ban non-member',
    'REVERT',
    banResult.success ? 'SUCCESS' : `REVERTED${banResult.error ? ' (' + banResult.error + ')' : ''}`,
    !banResult.success
  );
  
  // ============================================
  // TEST 4: Create pod with empty name
  // Expected: REVERT
  // ============================================
  console.log('--- TEST 4: Empty name pod (should REVERT) ---');
  const emptyName = '0x' + '0'.repeat(64); // bytes32(0)
  const emptyNameData = createSelector + emptyName.slice(2) + isPublic.slice(2) + 
                        threshold.slice(2) + category.slice(2) + descOffset.slice(2) + 
                        descLength.slice(2) + descData.slice(2);
  const emptyNameResult = await sendTx(api, alice, ADDRESSES.CREATE, emptyNameData, creationFee);
  logResult(
    4,
    'Create pod with empty name',
    'REVERT',
    emptyNameResult.success ? 'SUCCESS' : `REVERTED${emptyNameResult.error ? ' (' + emptyNameResult.error + ')' : ''}`,
    !emptyNameResult.success
  );
  
  // ============================================
  // TEST 5: Create pod with max description (256 bytes)
  // Expected: SUCCESS
  // ============================================
  console.log('--- TEST 5: Max length description (should SUCCEED) ---');
  const name5 = '0x4c6f6e6744657363000000000000000000000000000000000000000000000000'; // "LongDesc"
  const longDesc = 'A'.repeat(256);
  const desc5Length = '0x' + BigInt(longDesc.length).toString(16).padStart(64, '0');
  const desc5Data = '0x' + Buffer.from(longDesc).toString('hex').padEnd(512, '0');
  const desc5Offset = '0x00000000000000000000000000000000000000000000000000000000000000a0';
  
  const maxDescData = createSelector + name5.slice(2) + isPublic.slice(2) + threshold.slice(2) + 
                      category.slice(2) + desc5Offset.slice(2) + desc5Length.slice(2) + desc5Data.slice(2);
  const maxDescResult = await sendTx(api, alice, ADDRESSES.CREATE, maxDescData, creationFee);
  logResult(
    5,
    'Create pod with 256 byte description',
    'SUCCESS',
    maxDescResult.success ? 'SUCCESS' : `REVERTED${maxDescResult.error ? ' (' + maxDescResult.error + ')' : ''}`,
    maxDescResult.success
  );
  
  // ============================================
  // TEST 6: Create pod with oversized description (1000 bytes)
  // Expected: REVERT or SUCCESS (depends on gas limit)
  // ============================================
  console.log('--- TEST 6: Oversized description (should REVERT or succeed with high gas) ---');
  const name6 = '0x4875676544657363000000000000000000000000000000000000000000000000'; // "HugeDesc"
  const hugeDesc = 'B'.repeat(1000);
  const desc6Length = '0x' + BigInt(hugeDesc.length).toString(16).padStart(64, '0');
  const desc6Data = '0x' + Buffer.from(hugeDesc).toString('hex');
  // Data is too long for standard encoding, this might fail
  const hugeDescData = createSelector + name6.slice(2) + isPublic.slice(2) + threshold.slice(2) + 
                       category.slice(2) + desc5Offset.slice(2) + desc6Length.slice(2) + desc6Data.slice(2);
  
  const hugeDescResult = await sendTx(api, alice, ADDRESSES.CREATE, hugeDescData, creationFee);
  logResult(
    6,
    'Create pod with 1000 byte description',
    'REVERT or SUCCESS',
    hugeDescResult.success ? 'SUCCESS' : `REVERTED${hugeDescResult.error ? ' (' + hugeDescResult.error + ')' : ''}`,
    true // Either outcome is acceptable - we just note the behavior
  );
  
  // ============================================
  // TEST 7: Join non-existent pod
  // Expected: REVERT
  // ============================================
  console.log('--- TEST 7: Join non-existent pod 9999 (should REVERT) ---');
  const join9999Data = joinSelector + BigInt(9999).toString(16).padStart(64, '0');
  const join9999Result = await sendTx(api, charlie, ADDRESSES.JOIN, join9999Data, 0);
  logResult(
    7,
    'Join non-existent pod 9999',
    'REVERT',
    join9999Result.success ? 'SUCCESS' : `REVERTED${join9999Result.error ? ' (' + join9999Result.error + ')' : ''}`,
    !join9999Result.success
  );
  
  // ============================================
  // TEST 8: Creator tries to leave their own pod
  // Expected: REVERT (creator can't abandon)
  // ============================================
  console.log('--- TEST 8: Creator leaves own pod (should REVERT) ---');
  const creatorLeaveResult = await sendTx(api, alice, ADDRESSES.LEAVE, leaveData, 0);
  logResult(
    8,
    'Creator leaves own pod',
    'REVERT',
    creatorLeaveResult.success ? 'SUCCESS' : `REVERTED${creatorLeaveResult.error ? ' (' + creatorLeaveResult.error + ')' : ''}`,
    !creatorLeaveResult.success
  );
  
  // ============================================
  // TEST 9: Create pod without paying fee (0 value)
  // Expected: REVERT
  // ============================================
  console.log('--- TEST 9: Create pod with 0 value (should REVERT) ---');
  const name9 = '0x4e6f506179000000000000000000000000000000000000000000000000000000'; // "NoPay"
  const noPayData = createSelector + name9.slice(2) + isPublic.slice(2) + threshold.slice(2) + 
                    category.slice(2) + descOffset.slice(2) + descLength.slice(2) + descData.slice(2);
  const noPayResult = await sendTx(api, alice, ADDRESSES.CREATE, noPayData, 0);
  logResult(
    9,
    'Create pod with 0 value (no fee)',
    'REVERT',
    noPayResult.success ? 'SUCCESS' : `REVERTED${noPayResult.error ? ' (' + noPayResult.error + ')' : ''}`,
    !noPayResult.success
  );
  
  // ============================================
  // TEST 10: Create pod with wrong fee (499 QF)
  // Expected: REVERT
  // ============================================
  console.log('--- TEST 10: Create pod with 499 QF (should REVERT) ---');
  const name10 = '0x53686f7274506179000000000000000000000000000000000000000000000000'; // "ShortPay"
  const underpayData = createSelector + name10.slice(2) + isPublic.slice(2) + threshold.slice(2) + 
                       category.slice(2) + descOffset.slice(2) + descLength.slice(2) + descData.slice(2);
  const underpayFee = 499n * 10n ** 18n;
  const underpayResult = await sendTx(api, alice, ADDRESSES.CREATE, underpayData, underpayFee);
  logResult(
    10,
    'Create pod with underpayment (499 QF)',
    'REVERT',
    underpayResult.success ? 'SUCCESS' : `REVERTED${underpayResult.error ? ' (' + underpayResult.error + ')' : ''}`,
    !underpayResult.success
  );
  
  // ============================================
  // TEST 11: Unban someone who isn't banned
  // Expected: REVERT or no-op
  // ============================================
  console.log('--- TEST 11: Unban non-banned user (should REVERT) ---');
  const unbanSelector = getSelector('unbanMember(uint64,address)');
  const unbanData = unbanSelector + 
    BigInt(edgePodId).toString(16).padStart(64, '0') +
    bobH160Found.slice(2).padStart(64, '0');
  const unbanResult = await sendTx(api, alice, ADDRESSES.STORAGE, unbanData, 0);
  logResult(
    11,
    'Unban non-banned user (Bob)',
    'REVERT',
    unbanResult.success ? 'SUCCESS' : `REVERTED${unbanResult.error ? ' (' + unbanResult.error + ')' : ''}`,
    !unbanResult.success
  );
  
  // ============================================
  // TEST 12: Add creator as mod (already has privileges)
  // Expected: REVERT or no-op
  // ============================================
  console.log('--- TEST 12: Add creator as mod (should REVERT) ---');
  const addModSelector = getSelector('addMod(uint64,address)');
  const addModData = addModSelector + 
    BigInt(edgePodId).toString(16).padStart(64, '0') +
    aliceH160.slice(2).padStart(64, '0');
  const addModResult = await sendTx(api, alice, ADDRESSES.STORAGE, addModData, 0);
  logResult(
    12,
    'Add creator as mod (already mod)',
    'REVERT',
    addModResult.success ? 'SUCCESS' : `REVERTED${addModResult.error ? ' (' + addModResult.error + ')' : ''}`,
    !addModResult.success
  );
}

// Print summary
function printSummary() {
  console.log('\n');
  console.log('========================================');
  console.log('AUDIT PHASE 3 COMPLETE - SUMMARY');
  console.log('========================================');
  
  let passed = 0;
  let failed = 0;
  
  for (const r of results) {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - TEST ${r.testNum}: ${r.testName}`);
    if (r.passed) passed++;
    else failed++;
  }
  
  console.log('\n----------------------------------------');
  console.log(`Total: ${results.length} tests`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${Math.round((passed / results.length) * 100)}%`);
  console.log('========================================');
  
  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED - Contract behavior is safe!');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed - Review contract behavior`);
  }
}

// Main
async function main() {
  const provider = new WsProvider('ws://127.0.0.1:9944');
  const api = await ApiPromise.create({ provider });
  
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');
  const bob = keyring.addFromUri('//Bob');
  
  try {
    const { aliceH160, currentCount } = await setup(api, alice);
    
    // Get Bob's H160
    const entries = await api.query.revive.originalAccount.entries();
    let bobH160 = null;
    for (const [key, value] of entries) {
      if (value.toString() === bob.address) {
        bobH160 = key.args[0].toString();
        break;
      }
    }
    
    await runTests(api, alice, bob, aliceH160, bobH160);
    printSummary();
  } catch (e) {
    console.error('\n❌ Error running tests:', e);
  }
  
  await api.disconnect();
}

main().catch(console.error);
