import { ApiPromise, WsProvider } from '@polkadot/api';

async function main() {
  const provider = new WsProvider('ws://127.0.0.1:9944');
  const api = await ApiPromise.create({ provider });
  
  console.log('Revive pallet extrinsics:');
  const extrinsics = api.tx.revive;
  for (const [name, ext] of Object.entries(extrinsics)) {
    if (typeof ext === 'function') {
      console.log(`  ${name}`);
    }
  }
  
  console.log('\nRevive.call meta:');
  const callMeta = api.tx.revive.call.meta;
  console.log('  Args:', api.tx.revive.call.meta.args.map(a => `${a.name}: ${a.type}`).join(', '));
  
  await api.disconnect();
}

main().catch(console.error);
