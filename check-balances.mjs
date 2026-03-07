import { ApiPromise, WsProvider } from '@polkadot/api';

const ADDR1 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const ADDR2 = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

async function checkBalances() {
  const provider = new WsProvider('ws://127.0.0.1:9944');
  const api = await ApiPromise.create({ provider });
  
  console.log('Checking balances via Polkadot API...\n');
  
  // For H160 addresses in pallet-revive, we need to check differently
  // The balances are stored in the system pallet under the mapped account
  
  // Get the account info for H160 addresses
  const addr1Info = await api.query.system.account(ADDR1);
  console.log('ADDR1 balance:', addr1Info.data.free.toString());
  
  const addr2Info = await api.query.system.account(ADDR2);
  console.log('ADDR2 balance:', addr2Info.data.free.toString());
  
  await api.disconnect();
}

checkBalances().catch(console.error);
