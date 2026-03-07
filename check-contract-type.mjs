import { ApiPromise, WsProvider } from '@polkadot/api';

async function main() {
  const provider = new WsProvider('ws://127.0.0.1:9944');
  const api = await ApiPromise.create({ provider });
  
  const addr = '0x14cc7da676d0ab469cfe4094d9e9afde1affc3fa';
  
  // Check if there's code at the address
  const code = await api.query.revive.pristineCode(addr);
  console.log('Pristine code exists:', code.isSome);
  
  if (code.isSome) {
    const codeBytes = code.value;
    console.log('Code size:', codeBytes.length);
    console.log('First 10 bytes:', codeBytes.slice(0, 10).toString('hex'));
  }
  
  // Check contract info
  const info = await api.query.revive.contractInfoOf(addr);
    console.log('Contract info exists:', info.isSome);
  if (info.isSome) {
    console.log('Contract info:', info.value.toJSON());
  }
  
  await api.disconnect();
}

main().catch(console.error);
