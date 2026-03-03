// scripts/diagnose.mjs
// Usage: node scripts/diagnose.mjs
//
// Connects to ws://127.0.0.1:9944 and tests all contracts directly.
// No browser. No frontend. Uses same selectors/encoding as src/lib/contracts.ts.

import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { keccak256AsU8a } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');

// ─── Load .env ────────────────────────────────────────────────────────────────

function loadEnv() {
  if (!fs.existsSync(ENV_PATH)) return {};
  const lines = fs.readFileSync(ENV_PATH, 'utf8').split('\n');
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return env;
}

const env = loadEnv();
const REGISTRY_ADDRESS = env.VITE_REGISTRY_ADDRESS || '';
const PODS_ADDRESS     = env.VITE_PODS_ADDRESS     || '';
const MESSAGES_ADDRESS = env.VITE_MESSAGES_ADDRESS || '';

// ─── SCALE / selector helpers (mirror of contracts.ts) ─────────────────────

function selector(signature) {
  const hash = keccak256AsU8a(new TextEncoder().encode(signature));
  return hash.slice(0, 4);
}

function encodeU64(value) {
  const bn = BigInt(value);
  const bytes = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    bytes[i] = Number((bn >> BigInt(i * 8)) & 0xffn);
  }
  return bytes;
}

function encodeAddress(addr) {
  const hex = addr.startsWith('0x') ? addr.slice(2) : addr;
  const padded = hex.padStart(40, '0').slice(0, 40);
  const bytes = new Uint8Array(20);
  for (let i = 0; i < 20; i++) {
    bytes[i] = parseInt(padded.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function concat(...arrays) {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
}

function decodeU64(data, offset = 0) {
  let result = 0n;
  for (let i = 0; i < 8; i++) {
    const byte = data[offset + i];
    if (byte === undefined) break;
    result |= BigInt(byte) << BigInt(i * 8);
  }
  return result;
}

// SCALE compact-length prefix then UTF-8 bytes
function decodeString(data, offset) {
  if (offset >= data.length) return { str: null, bytesRead: 0 };
  const first = data[offset];
  const mode = first & 0x03;
  let length, prefixBytes;
  if (mode === 0) {
    length = first >> 2;
    prefixBytes = 1;
  } else if (mode === 1) {
    if (offset + 1 >= data.length) return { str: null, bytesRead: 0 };
    length = ((first | (data[offset + 1] << 8)) >> 2);
    prefixBytes = 2;
  } else {
    return { str: null, bytesRead: 0 };
  }
  if (offset + prefixBytes + length > data.length) return { str: null, bytesRead: 0 };
  const str = new TextDecoder().decode(data.slice(offset + prefixBytes, offset + prefixBytes + length));
  return { str, bytesRead: prefixBytes + length };
}

function decodeCompactLength(data, offset = 0) {
  const first = data[offset];
  const mode = first & 0x03;
  if (mode === 0) return { length: first >> 2, bytesRead: 1 };
  if (mode === 1) return { length: ((first | (data[offset + 1] << 8)) >> 2), bytesRead: 2 };
  if (mode === 2) return {
    length: ((first | (data[offset+1]<<8) | (data[offset+2]<<16) | (data[offset+3]<<24)) >> 2),
    bytesRead: 4
  };
  return { length: 0, bytesRead: 1 };
}

function decodeAddress(data, offset) {
  return '0x' + Array.from(data.slice(offset, offset + 20))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── queryContract (same logic as contracts.ts) ────────────────────────────

async function queryContract(api, contractAddress, callData, origin) {
  try {
    const response = await api.call.reviveApi.call(
      origin,
      contractAddress,
      '0',
      null,
      null,
      u8aToHex(callData)
    );

    const result = response?.result;

    // Rust-style enum path
    if (result && typeof result.isOk === 'boolean') {
      if (!result.isOk) return new Uint8Array(0);
      const execResult = result.asOk;
      const flags = execResult.flags;
      if (flags) {
        const flagsNum = typeof flags.toNumber === 'function' ? flags.toNumber() : Number(flags);
        if (flagsNum & 1) return new Uint8Array(0); // REVERT
      }
      const data = execResult.data;
      if (data instanceof Uint8Array) return data;
      if (typeof data === 'string') {
        const hex = data.startsWith('0x') ? data.slice(2) : data;
        const out = new Uint8Array(hex.length / 2);
        for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i*2, i*2+2), 16);
        return out;
      }
      if (data && typeof data.toU8a === 'function') return data.toU8a(true);
      return new Uint8Array(0);
    }

    // JSON path
    const j = result?.toJSON ? result.toJSON() : result;
    if (j?.Ok?.flags && (Number(j.Ok.flags) & 1)) return new Uint8Array(0);
    const raw = j?.Ok?.data ?? j?.data;
    if (raw) {
      if (raw instanceof Uint8Array) return raw;
      if (typeof raw === 'string') {
        const hex = raw.startsWith('0x') ? raw.slice(2) : raw;
        const out = new Uint8Array(hex.length / 2);
        for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i*2, i*2+2), 16);
        return out;
      }
    }
    return new Uint8Array(0);
  } catch (err) {
    console.error('  [queryContract error]', err.message);
    return new Uint8Array(0);
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const PASS = '\x1b[32m✅\x1b[0m';
  const FAIL = '\x1b[31m❌\x1b[0m';
  const INFO = '\x1b[36mℹ️ \x1b[0m';
  let checks = { passed: 0, failed: 0 };

  function ok(msg)   { console.log(`  ${PASS} ${msg}`); checks.passed++; }
  function fail(msg) { console.log(`  ${FAIL} ${msg}`); checks.failed++; }
  function info(msg) { console.log(`  ${INFO} ${msg}`); }

  // ── 1. Connect ─────────────────────────────────────────────────────────
  console.log('\n🔌 Connecting to ws://127.0.0.1:9944...');
  const provider = new WsProvider('ws://127.0.0.1:9944');
  let api;
  try {
    api = await ApiPromise.create({ provider });
    ok(`Connected — chain: ${(await api.rpc.system.chain()).toString()}`);
  } catch (err) {
    fail(`Cannot connect: ${err.message}`);
    console.log('\n❌ CANNOT CONNECT — is the node running?\n');
    process.exit(1);
  }

  // ── 2. Alice keyring + H160 ────────────────────────────────────────────
  console.log('\n👤 Alice keyring...');
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');
  const aliceSS58 = alice.address;
  info(`Alice SS58: ${aliceSS58}`);

  // Get Alice's mapped H160
  let aliceH160 = null;
  try {
    const entries = await api.query.revive.originalAccount.entries();
    const mapped = entries.find(([_k, v]) => v.toString() === aliceSS58);
    if (mapped) {
      aliceH160 = mapped[0].args[0].toString();
      ok(`Alice H160: ${aliceH160}`);
    } else {
      fail('Alice H160 not found — run the deploy script first (it maps Alice)');
    }
  } catch (err) {
    fail(`Could not query revive.originalAccount: ${err.message}`);
  }

  // ── 3. Contract address check ──────────────────────────────────────────
  console.log('\n📋 Contract addresses from .env...');
  const contracts = { registry: REGISTRY_ADDRESS, pods: PODS_ADDRESS, messages: MESSAGES_ADDRESS };
  for (const [name, addr] of Object.entries(contracts)) {
    if (addr && addr.startsWith('0x') && addr.length === 42) {
      ok(`${name}: ${addr}`);
    } else {
      fail(`${name}: "${addr}" — missing or invalid (run deploy script)`);
    }
  }

  if (!PODS_ADDRESS || !REGISTRY_ADDRESS) {
    fail('Cannot continue without valid contract addresses');
    await api.disconnect();
    process.exit(1);
  }

  // ── 4. get_pod_count ──────────────────────────────────────────────────
  console.log('\n📦 Pods contract — get_pod_count()...');
  const countSel = selector('get_pod_count()');
  const countResult = await queryContract(api, PODS_ADDRESS, countSel, aliceSS58);
  let podCount = 0;
  if (countResult.length >= 8) {
    podCount = Number(decodeU64(countResult, 0));
    if (podCount >= 3) {
      ok(`pod_count = ${podCount}`);
    } else {
      fail(`pod_count = ${podCount} (expected >= 3 after initialize_pods)`);
    }
  } else {
    fail(`get_pod_count returned empty — contract may not be deployed at ${PODS_ADDRESS}`);
  }

  // ── 5. get_pod for IDs 0, 1, 2 ────────────────────────────────────────
  console.log('\n🎯 Pods contract — get_pod(0), get_pod(1), get_pod(2)...');
  let podsOk = 0;
  for (const podId of [0, 1, 2]) {
    const sel = selector('get_pod(uint64)');
    const callData = concat(sel, encodeU64(podId));
    const result = await queryContract(api, PODS_ADDRESS, callData, aliceSS58);

    if (result.length < 8) {
      fail(`get_pod(${podId}) returned empty`);
      continue;
    }

    let offset = 0;
    const id = decodeU64(result, offset); offset += 8;
    const { str: name, bytesRead: nb } = decodeString(result, offset);
    if (!name || nb === 0) {
      fail(`get_pod(${podId}) — failed to decode name (data: ${u8aToHex(result.slice(0, 32))})`);
      continue;
    }
    offset += nb;
    const { str: description, bytesRead: db } = decodeString(result, offset);
    offset += db;
    // isDefault byte is at offset + 32 (minBalance) + 20 (creator) + 8 (createdAt)
    let isDefault = false;
    if (offset + 60 <= result.length) {
      isDefault = result[offset + 60] === 1;
    }

    ok(`get_pod(${podId}) id=${id} name="${name}" description="${description?.slice(0,40)}..." isDefault=${isDefault}`);
    podsOk++;
  }

  // ── 6. get_user_pods for Alice ─────────────────────────────────────────
  console.log('\n👤 Pods contract — get_user_pods(alice_h160)...');
  if (aliceH160) {
    const sel = selector('get_user_pods(address)');
    const callData = concat(sel, encodeAddress(aliceH160));
    const result = await queryContract(api, PODS_ADDRESS, callData, aliceSS58);

    if (result.length === 0) {
      info('get_user_pods returned empty (Alice has no pod memberships recorded yet)');
    } else {
      const { length, bytesRead } = decodeCompactLength(result, 0);
      const podIds = [];
      let off = bytesRead;
      for (let i = 0; i < length; i++) {
        podIds.push(Number(decodeU64(result, off)));
        off += 8;
      }
      if (length === 0) {
        info(`get_user_pods: 0 pods (Alice hasn't joined any custom pods)`);
      } else {
        ok(`get_user_pods: ${length} pod(s) — IDs: [${podIds.join(', ')}]`);
      }
    }
  } else {
    info('Skipping get_user_pods — Alice H160 not available');
  }

  // ── 7. Registry — get_profile for Alice ───────────────────────────────
  console.log('\n📝 Registry contract — get_profile(alice_h160)...');
  if (aliceH160) {
    const sel = selector('get_profile(address)');
    const callData = concat(sel, encodeAddress(aliceH160));
    const result = await queryContract(api, REGISTRY_ADDRESS, callData, aliceSS58);

    if (result.length === 0) {
      info('get_profile returned empty — Alice has no profile (not registered yet)');
    } else {
      // UserProfile SCALE layout (from registry contract struct):
      //   display_name: Vec<u8>  — compact-length prefix + UTF-8 bytes
      //   encryption_pubkey: [u8; 32]
      //   registered_at: u64
      let offset = 0;
      const { str: displayName, bytesRead: nb } = decodeString(result, offset);
      if (nb === 0 || displayName === null) {
        fail(`get_profile — failed to decode display_name (raw: ${u8aToHex(result.slice(0, 20))})`);
      } else {
        offset += nb;
        offset += 32; // skip encryption_pubkey
        const registeredAt = decodeU64(result, offset);
        if (registeredAt > 0n && displayName.trim().length > 0) {
          ok(`Profile exists — displayName="${displayName}", registeredAt=${registeredAt}`);
        } else if (registeredAt === 0n) {
          info(`Profile data present but registeredAt=0 — user may not be fully registered (displayName="${displayName}")`);
        } else {
          info(`Profile data: displayName="${displayName}", registeredAt=${registeredAt}`);
        }
      }
    }
  } else {
    info('Skipping get_profile — Alice H160 not available');
  }

  // ── 8. Registry — get_user_count ──────────────────────────────────────
  console.log('\n📊 Registry contract — get_user_count()...');
  {
    const sel = selector('get_user_count()');
    const result = await queryContract(api, REGISTRY_ADDRESS, sel, aliceSS58);
    if (result.length >= 8) {
      const count = decodeU64(result, 0);
      info(`get_user_count = ${count}`);
    } else {
      fail(`get_user_count returned empty — registry contract may not be at ${REGISTRY_ADDRESS}`);
    }
  }

  // ── 9. Messages contract — smoke test ─────────────────────────────────
  // get_message_count(address,address) — takes two H160 addresses, returns u64
  console.log('\n💬 Messages contract — smoke test (get_message_count(alice, alice))...');
  if (aliceH160 && MESSAGES_ADDRESS) {
    const sel = selector('get_message_count(address,address)');
    // Use Alice<->Alice (will always be 0, but validates contract responds correctly)
    const callData = concat(sel, encodeAddress(aliceH160), encodeAddress(aliceH160));
    const result = await queryContract(api, MESSAGES_ADDRESS, callData, aliceSS58);
    if (result.length >= 8) {
      const count = decodeU64(result, 0);
      ok(`get_message_count(alice,alice) = ${count} (0 expected — no self-messages)`);
    } else {
      fail(`get_message_count returned empty — messages contract may be stale at ${MESSAGES_ADDRESS}`);
    }
  } else {
    info('Skipping messages smoke test — address or H160 not available');
  }

  // ── Summary ───────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(60));
  if (podCount >= 3 && podsOk === 3 && checks.failed === 0) {
    console.log('\x1b[32m\n✅ ALL CHECKS PASSED\x1b[0m');
    console.log(`   ${checks.passed} checks passed, 0 failed`);
    console.log();
    console.log('   ⚠️  Note: If the pods contract was rebuilt since last deploy,');
    console.log('       run  node scripts/deploy.mjs  to redeploy with the new binary.');
  } else {
    const allPassed = checks.failed === 0;
    if (allPassed) {
      console.log('\x1b[33m\n⚠️  CHECKS PASSED WITH WARNINGS\x1b[0m');
    } else {
      console.log('\x1b[31m\n❌ SOME CHECKS FAILED\x1b[0m');
    }
    console.log(`   ${checks.passed} passed, ${checks.failed} failed`);
    if (podCount < 3) {
      console.log('\n   Likely cause: contracts not yet deployed / initialized.');
      console.log('   Run: node scripts/deploy.mjs');
    }
  }
  console.log();

  await api.disconnect();
}

main().catch(err => {
  console.error('\n💥 Unhandled error:', err);
  process.exit(1);
});
