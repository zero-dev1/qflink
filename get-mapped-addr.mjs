import { ApiPromise, WsProvider } from '@polkadot/api';

async function getMappedAddresses() {
  const provider = new WsProvider('ws://127.0.0.1:9944');
  const api = await ApiPromise.create({ provider });
  
  console.log('Querying mapped accounts...\n');
  
  // Query all mapped accounts
  const entries = await api.query.revive.originalAccount.entries();
  
  console.log('Mapped accounts (H160 -> SS58):');
  for (const [key, value] of entries) {
    const h160 = key.args[0].toString();
    const ss58 = value.toString();
    console.log(`  ${h160} -> ${ss58}`);
  }
  
  // Check if specific addresses are mapped
  const aliceSs58 = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
  const bobSs58 = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';
  
  console.log('\nLooking for Alice and Bob mappings...');
  
  await api.disconnect();
}

getMappedAddresses().catch(console.error);
