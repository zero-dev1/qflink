import { ApiPromise, WsProvider } from '@polkadot/api';

async function getAliceH160() {
  const provider = new WsProvider('ws://127.0.0.1:9944');
  const api = await ApiPromise.create({ provider });
  
  const aliceSs58 = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
  
  // Query the mapping
  const entries = await api.query.revive.originalAccount.entries();
  
  for (const [key, value] of entries) {
    if (value.toString() === aliceSs58) {
      console.log('Alice H160:', key.args[0].toString());
    }
  }
  
  await api.disconnect();
}

getAliceH160().catch(console.error);
