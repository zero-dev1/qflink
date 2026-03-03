import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { keccakAsU8a } from '@polkadot/util-crypto';

const api = await ApiPromise.create({ provider: new WsProvider('ws://127.0.0.1:9944') });
const kr = new Keyring({ type: 'sr25519' });
const alice = kr.addFromUri('//Alice');
const sel = keccakAsU8a('join_pod(uint64)').slice(0, 4);
const podIdBytes = Buffer.alloc(8);
podIdBytes.writeBigUInt64LE(4n);
const callData = '0x' + Buffer.from(sel).toString('hex') + podIdBytes.toString('hex');
const result = await api.call.reviveApi.call(alice.address, '0x2c6fc00458f198f46ef072e1516b83cd56db7cf5', 0, undefined, undefined, callData);
const ok = result.result.asOk;
const flags = typeof ok.flags.toNumber === 'function' ? ok.flags.toNumber() : Number(ok.flags);
const data = new Uint8Array(ok.data);
console.log('flags:', flags);
console.log('reverted:', Boolean(flags & 1));
if (flags & 1) {
  console.log('reason:', Buffer.from(data).toString('utf8'));
} else {
  console.log('success');
}
process.exit(0);
