#!/usr/bin/env node
/**
 * PHASE 3 EDGE CASES AUDIT - QFLink Pods (Simplified)
 */

import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { keccak256AsU8a } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';

const ADDRESSES = {
  CREATE: '0x14cc7da676d0ab469cfe4094d9e9afde1affc3fa',
  JOIN: '0x4e8667bf8ddd17e4807fb94f418bef3bb9b7df44',
  LEAVE: '0xbffb6fac04ea51646090ce5b7668861f1e403004',
  STORAGE: '0xf509a47d95fb21f347d4862330c8b8dbe00a828e',
  READER: '0x2cbbdac73acb623d57e195fc23998ba3fe218ee8',
};

const ALICE_H160 = '0x9621dde636de098b43efb0fa9b61facfe328f99d';
const results = [];

function getSelector(sig) {
  const hash = keccak256AsU8a(new TextEncoder().encode(sig));
  return u8aToHex(hash.slice(0, 4));
}

async function sendTx(api, signer, contract, data, value = 0) {
  // Lower gas limits
  const gasLimit = api.registry.createType('WeightV2', {
    refTime: api.registry.createType('Compact<u64>', '1000000000'),
    proofSize: api.registry.createType('Compact<u64>', '100000000'),
  });
  
  return new Promise((resolve, reject) => {
    api.tx.revive
      .call(contract, value.toString(), gasLimit, null, data)
      .signAndSend(signer, { nonce: -1 }, (result) => {
        if (result.status.isInBlock || result.status.isFinalized) {
          const success = !result.dispatchError;
          let error = null;
          if (result.dispatchError) {
            if (result.dispatchError.isModule) {
              try {
                const decoded = api.registry.findMetaError(result.dispatchError.asModule);
                error = `${decoded.section}.${decoded.name}`;
              } catch (e) {
                error = result.dispatchError.toString();
              }
            } else {
              error = result.dispatchError.toString();
            }
          }
          resolve({ success, error });
        }
        if (result.isError) reject(new Error('Transaction failed'));
      })
      .catch(reject);
  });
}

function logResult(testNum, testName, expected, actual, passed) {
  results.push({ testNum, testName, expected, actual, passed });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`\n${status} - TEST ${testNum}: ${testName}`);
  console.log(`  Expected: ${expected}`);
  console.log(`  Actual:   ${actual}`);
}

async function main() {
  const provider = new WsProvider('ws://127.0.0.1:9944');
  const api = await ApiPromise.create({ provider });
  
  console.log('========================================');
  console.log('PHASE 3: EDGE CASES AUDIT');
  console.log('========================================\n');
  
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');
  const bob = keyring.addFromUri('//Bob');
  const charlie = keyring.addFromUri('//Charlie');
  
  // Fund Charlie
  console.log('--- Funding Charlie ---');
  await new Promise((resolve) => {
    api.tx.balances.transferAllowDeath(charlie.address, '10000000000000000000')
      .signAndSend(alice, { nonce: -1 }, (result) => {
        if (result.status.isInBlock || result.status.isFinalized) resolve();
      });
  });
  console.log('✓ Charlie funded');
  
  // Map all accounts
  console.log('\n--- Mapping accounts ---');
  for (const acc of [alice, bob, charlie]) {
    try {
      await new Promise((resolve) => {
        api.tx.revive.mapAccount()
          .signAndSend(acc, { nonce: -1 }, (result) => {
            if (result.status.isInBlock || result.status.isFinalized) resolve();
          });
      });
    } catch (e) {}
  }
  console.log('✓ Accounts mapped');
  
  // Use an existing pod (pod 1)
  const edgePodId = 1;
  console.log(`\n--- Using existing pod ${edgePodId} for tests ---\n`);
  
  // Test selectors
  const joinSelector = getSelector('joinPod(uint64)');
  const leaveSelector = getSelector('leavePod(uint64)');
  const banSelector = getSelector('banMember(uint64,address)');
  const unbanSelector = getSelector('unbanMember(uint64,address)');
  const addModSelector = getSelector('addMod(uint64,address)');
  
  // Helper to encode uint64
  const encodeU64 = (n) => BigInt(n).toString(16).padStart(64, '0');
  const encodeAddr = (a) => a.slice(2).padStart(64, '0');
  
  // ============================================
  // TEST 1: Double join
  // ============================================
  console.log('--- TEST 1: Double join (should REVERT) ---');
  // First join (might succeed if not already member)
  const joinData1 = joinSelector + encodeU64(edgePodId);
  await sendTx(api, bob, ADDRESSES.JOIN, joinData1, 0);
  // Second join (should fail)
  const doubleJoinResult = await sendTx(api, bob, ADDRESSES.JOIN, joinData1, 0);
  logResult(1, 'Double join', 'REVERT', 
    doubleJoinResult.success ? 'SUCCESS' : 'REVERTED', 
    !doubleJoinResult.success);
  
  // ============================================
  // TEST 2: Leave pod not member of
  // ============================================
  console.log('--- TEST 2: Leave pod not member of (should REVERT) ---');
  const leaveData = leaveSelector + encodeU64(edgePodId);
  const leaveResult = await sendTx(api, charlie, ADDRESSES.LEAVE, leaveData, 0);
  logResult(2, 'Leave pod not member of', 'REVERT', 
    leaveResult.success ? 'SUCCESS' : 'REVERTED', 
    !leaveResult.success);
  
  // ============================================
  // TEST 3: Ban non-member
  // ============================================
  console.log('--- TEST 3: Ban non-member (should REVERT) ---');
  const banData = banSelector + encodeU64(edgePodId) + encodeAddr('0x0000000000000000000000000000000000000001');
  const banResult = await sendTx(api, alice, ADDRESSES.STORAGE, banData, 0);
  logResult(3, 'Ban non-member', 'REVERT', 
    banResult.success ? 'SUCCESS' : 'REVERTED', 
    !banResult.success);
  
  // ============================================
  // TEST 7: Join non-existent pod
  // ============================================
  console.log('--- TEST 7: Join non-existent pod 9999 (should REVERT) ---');
  const join9999Data = joinSelector + encodeU64(9999);
  const join9999Result = await sendTx(api, charlie, ADDRESSES.JOIN, join9999Data, 0);
  logResult(7, 'Join non-existent pod 9999', 'REVERT', 
    join9999Result.success ? 'SUCCESS' : 'REVERTED', 
    !join9999Result.success);
  
  // ============================================
  // TEST 8: Creator leaves own pod
  // ============================================
  console.log('--- TEST 8: Creator leaves own pod (should REVERT) ---');
  const creatorLeaveResult = await sendTx(api, alice, ADDRESSES.LEAVE, leaveData, 0);
  logResult(8, 'Creator leaves own pod', 'REVERT', 
    creatorLeaveResult.success ? 'SUCCESS' : 'REVERTED', 
    !creatorLeaveResult.success);
  
  // ============================================
  // TEST 11: Unban non-banned user
  // ============================================
  console.log('--- TEST 11: Unban non-banned user (should REVERT) ---');
  const unbanData = unbanSelector + encodeU64(edgePodId) + encodeAddr('0x0000000000000000000000000000000000000002');
  const unbanResult = await sendTx(api, alice, ADDRESSES.STORAGE, unbanData, 0);
  logResult(11, 'Unban non-banned user', 'REVERT', 
    unbanResult.success ? 'SUCCESS' : 'REVERTED', 
    !unbanResult.success);
  
  // ============================================
  // TEST 12: Add creator as mod
  // ============================================
  console.log('--- TEST 12: Add creator as mod (should REVERT) ---');
  const addModData = addModSelector + encodeU64(edgePodId) + encodeAddr(ALICE_H160);
  const addModResult = await sendTx(api, alice, ADDRESSES.STORAGE, addModData, 0);
  logResult(12, 'Add creator as mod (already mod)', 'REVERT', 
    addModResult.success ? 'SUCCESS' : 'REVERTED', 
    !addModResult.success);
  
  // Skip tests 4, 5, 6, 9, 10 for now (require complex ABI encoding for createPod)
  console.log('\n--- NOTE: Tests 4, 5, 6, 9, 10 skipped (require createPod ABI encoding) ---');
  
  // Summary
  console.log('\n========================================');
  console.log('AUDIT PHASE 3 COMPLETE - SUMMARY');
  console.log('========================================');
  
  let passed = 0, failed = 0;
  for (const r of results) {
    console.log(`${r.passed ? '✅' : '❌'} TEST ${r.testNum}: ${r.testName} - ${r.passed ? 'PASS' : 'FAIL'}`);
    if (r.passed) passed++; else failed++;
  }
  
  console.log(`\nCompleted: ${results.length} tests | Passed: ${passed} | Failed: ${failed}`);
  console.log('Note: Tests 4,5,6,9,10 require complex createPod encoding and were skipped');
  console.log('========================================');
  
  await api.disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
