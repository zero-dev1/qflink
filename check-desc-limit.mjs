import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { keccak256AsU8a } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';

const ADDRESSES = { CREATE: '0x14cc7da676d0ab469cfe4094d9e9afde1affc3fa' };

function getSelector(sig) {
  const hash = keccak256AsU8a(new TextEncoder().encode(sig));
  return u8aToHex(hash.slice(0, 4));
}

function encodeCreatePod(name, isPublic, threshold, category, description) {
  const selector = getSelector('createPod(bytes32,bool,uint256,bytes32,bytes)');
  const nameBytes = Buffer.alloc(32);
  nameBytes.write(name, 0, 'utf8');
  const nameHex = nameBytes.toString('hex');
  const publicHex = isPublic ? '0'.repeat(63) + '1' : '0'.repeat(64);
  const thresholdHex = BigInt(threshold).toString(16).padStart(64, '0');
  const catBytes = Buffer.alloc(32);
  catBytes.write(category, 0, 'utf8');
  const catHex = catBytes.toString('hex');
  const descBytes = Buffer.from(description, 'utf8');
  const descLength = descBytes.length;
  const descOffset = (4 * 32).toString(16).padStart(64, '0');
  const descLengthHex = descLength.toString(16).padStart(64, '0');
  const descDataHex = descBytes.toString('hex').padEnd(Math.ceil(descLength / 32) * 64, '0');
  return selector + nameHex + publicHex + thresholdHex + catHex + descOffset + descLengthHex + descDataHex;
}

async function sendTx(api, signer, contract, data, value = 0) {
  const gasLimit = api.registry.createType('WeightV2', {
    refTime: api.registry.createType('Compact<u64>', '1000000000'),
    proofSize: api.registry.createType('Compact<u64>', '100000000'),
  });
  return new Promise((resolve) => {
    api.tx.revive.call(contract, value.toString(), gasLimit, null, data)
      .signAndSend(signer, { nonce: -1 }, (result) => {
        if (result.status.isInBlock || result.status.isFinalized) {
          resolve({ success: !result.dispatchError });
        }
      });
  });
}

async function main() {
  const provider = new WsProvider('ws://127.0.0.1:9944');
  const api = await ApiPromise.create({ provider });
  const alice = new Keyring({ type: 'sr25519' }).addFromUri('//Alice');
  
  try { await api.tx.revive.mapAccount().signAndSend(alice); } catch (e) {}
  
  const creationFee = 500n * 10n ** 18n;
  
  // Test various description sizes
  for (const size of [50, 100, 128, 150, 200, 250]) {
    const desc = 'X'.repeat(size);
    const data = encodeCreatePod(`Test${size}`, true, 0, 'trading', desc);
    const result = await sendTx(api, alice, ADDRESSES.CREATE, data, creationFee);
    console.log(`Description size ${size}: ${result.success ? 'SUCCESS' : 'REVERTED'}`);
  }
  
  await api.disconnect();
}

main().catch(console.error);
