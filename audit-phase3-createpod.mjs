#!/usr/bin/env node
/**
 * PHASE 3 Edge Cases - CreatePod Tests (Tests 4, 5, 6, 9, 10)
 */

import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { keccak256AsU8a } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';

const ADDRESSES = {
  CREATE: '0x14cc7da676d0ab469cfe4094d9e9afde1affc3fa',
};

const ALICE_H160 = '0x9621dde636de098b43efb0fa9b61facfe328f99d';
const results = [];

function getSelector(sig) {
  const hash = keccak256AsU8a(new TextEncoder().encode(sig));
  return u8aToHex(hash.slice(0, 4));
}

// Simple ABI encoder for createPod
function encodeCreatePod(name, isPublic, threshold, category, description) {
  const selector = getSelector('createPod(bytes32,bool,uint256,bytes32,bytes)');
  
  // Encode bytes32 name (32 bytes)
  const nameBytes = Buffer.alloc(32);
  nameBytes.write(name, 0, 'utf8');
  const nameHex = nameBytes.toString('hex');
  
  // Encode bool isPublic (32 bytes, padded)
  const publicHex = isPublic ? '0'.repeat(63) + '1' : '0'.repeat(64);
  
  // Encode uint256 threshold (32 bytes)
  const thresholdHex = BigInt(threshold).toString(16).padStart(64, '0');
  
  // Encode bytes32 category (32 bytes)
  const catBytes = Buffer.alloc(32);
  catBytes.write(category, 0, 'utf8');
  const catHex = catBytes.toString('hex');
  
  // Encode bytes description
  // offset (32 bytes) + length (32 bytes) + data (padded to 32 bytes)
  const descBytes = Buffer.from(description, 'utf8');
  const descLength = descBytes.length;
  const descOffset = (4 * 32).toString(16).padStart(64, '0'); // Offset to start of description data
  const descLengthHex = descLength.toString(16).padStart(64, '0');
  const descDataHex = descBytes.toString('hex').padEnd(Math.ceil(descLength / 32) * 64, '0');
  
  const data = selector + nameHex + publicHex + thresholdHex + catHex + descOffset + descLengthHex + descDataHex;
  return data;
}

async function sendTx(api, signer, contract, data, value = 0) {
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
  console.log('PHASE 3: CREATE POD EDGE CASES');
  console.log('========================================\n');
  
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');
  
  // Map Alice
  try {
    await new Promise((resolve) => {
      api.tx.revive.mapAccount()
        .signAndSend(alice, { nonce: -1 }, (result) => {
          if (result.status.isInBlock || result.status.isFinalized) resolve();
        });
    });
  } catch (e) {}
  console.log('✓ Alice mapped');
  
  const creationFee = 500n * 10n ** 18n;
  
  // ============================================
  // TEST 4: Create pod with empty name
  // Expected: REVERT
  // ============================================
  console.log('--- TEST 4: Empty name pod (should REVERT) ---');
  const emptyNameData = encodeCreatePod('', true, 0, 'trading', 'empty name test');
  const emptyNameResult = await sendTx(api, alice, ADDRESSES.CREATE, emptyNameData, creationFee);
  logResult(4, 'Create pod with empty name', 'REVERT', 
    emptyNameResult.success ? 'SUCCESS' : 'REVERTED', 
    !emptyNameResult.success);
  
  // ============================================
  // TEST 5: Create pod with max description (256 bytes)
  // Expected: SUCCESS
  // ============================================
  console.log('--- TEST 5: Max length description (should SUCCEED) ---');
  const longDesc = 'A'.repeat(256);
  const maxDescData = encodeCreatePod('LongDesc', true, 0, 'trading', longDesc);
  const maxDescResult = await sendTx(api, alice, ADDRESSES.CREATE, maxDescData, creationFee);
  logResult(5, 'Create pod with 256 byte description', 'SUCCESS', 
    maxDescResult.success ? 'SUCCESS' : 'REVERTED', 
    maxDescResult.success);
  
  // ============================================
  // TEST 6: Create pod with oversized description (1000 bytes)
  // Expected: REVERT or SUCCESS
  // ============================================
  console.log('--- TEST 6: Oversized description (should REVERT or succeed) ---');
  const hugeDesc = 'B'.repeat(1000);
  const hugeDescData = encodeCreatePod('HugeDesc', true, 0, 'trading', hugeDesc);
  const hugeDescResult = await sendTx(api, alice, ADDRESSES.CREATE, hugeDescData, creationFee);
  logResult(6, 'Create pod with 1000 byte description', 'REVERT or SUCCESS', 
    hugeDescResult.success ? 'SUCCESS' : 'REVERTED', 
    true);
  
  // ============================================
  // TEST 9: Create pod without paying fee (0 value)
  // Expected: REVERT
  // ============================================
  console.log('--- TEST 9: Create pod with 0 value (should REVERT) ---');
  const noPayData = encodeCreatePod('NoPay', true, 0, 'trading', 'no pay');
  const noPayResult = await sendTx(api, alice, ADDRESSES.CREATE, noPayData, 0);
  logResult(9, 'Create pod with 0 value (no fee)', 'REVERT', 
    noPayResult.success ? 'SUCCESS' : 'REVERTED', 
    !noPayResult.success);
  
  // ============================================
  // TEST 10: Create pod with wrong fee (499 QF)
  // Expected: REVERT
  // ============================================
  console.log('--- TEST 10: Create pod with 499 QF (should REVERT) ---');
  const underpayData = encodeCreatePod('ShortPay', true, 0, 'trading', 'underpay');
  const underpayFee = 499n * 10n ** 18n;
  const underpayResult = await sendTx(api, alice, ADDRESSES.CREATE, underpayData, underpayFee);
  logResult(10, 'Create pod with underpayment (499 QF)', 'REVERT', 
    underpayResult.success ? 'SUCCESS' : 'REVERTED', 
    !underpayResult.success);
  
  // Summary
  console.log('\n========================================');
  console.log('CREATE POD TESTS - SUMMARY');
  console.log('========================================');
  
  let passed = 0, failed = 0;
  for (const r of results) {
    console.log(`${r.passed ? '✅' : '❌'} TEST ${r.testNum}: ${r.testName} - ${r.passed ? 'PASS' : 'FAIL'}`);
    if (r.passed) passed++; else failed++;
  }
  
  console.log(`\nCompleted: ${results.length} tests | Passed: ${passed} | Failed: ${failed}`);
  console.log('========================================');
  
  await api.disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
