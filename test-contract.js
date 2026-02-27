import { ApiPromise, WsProvider } from '@polkadot/api';
import { keccak256AsU8a } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';

async function testContract() {
  const provider = new WsProvider('ws://127.0.0.1:9944');
  const api = await ApiPromise.create({ provider });
  
  console.log('Connected to:', await api.rpc.system.chain());
  
  const podsAddress = '0xbce63cb42c990eabda1b0a1af646f6e9d35115d6';
  
  // Calculate get_pod_count() selector
  const sig = 'get_pod_count()';
  const hash = keccak256AsU8a(new TextEncoder().encode(sig));
  const selector = u8aToHex(hash.slice(0, 4));
  
  console.log('\nSelector for', sig, ':', selector);
  console.log('Contract address:', podsAddress);
  
  try {
    const result = await api.call.reviveApi.call(
      '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', // Alice
      podsAddress,
      '0',
      null,
      null,
      selector
    );
    
    console.log('\n✅ Call succeeded!');
    console.log('Result:', result.toJSON());
    
    if (result.result.isOk) {
      const data = result.result.asOk.data;
      console.log('Data:', data);
      
      // Decode u64 (8 bytes, little-endian)
      if (data.length >= 8) {
        let count = 0n;
        for (let i = 0; i < 8; i++) {
          count |= BigInt(data[i]) << BigInt(i * 8);
        }
        console.log('Pod count:', count.toString());
      }
    } else {
      console.error('❌ Call failed:', result.result.asErr);
      const err = result.result.asErr;
      if (err.isModule) {
        const mod = err.asModule;
        console.error('Module error - index:', mod.index.toString(), 'error:', mod.error.toHex());
        try {
          const decoded = api.registry.findMetaError(mod);
          console.error('Decoded:', decoded.section, decoded.name, decoded.docs.join(' '));
        } catch (e) {
          console.error('Could not decode error');
        }
      }
    }
  } catch (err) {
    console.error('\n❌ Exception:', err.message);
  }
  
  await api.disconnect();
}

testContract().catch(console.error);
