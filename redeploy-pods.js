import { ApiPromise, WsProvider } from '@polkadot/api';
import { readFileSync } from 'fs';
import { Keyring } from '@polkadot/keyring';

async function deployPods() {
  const provider = new WsProvider('ws://127.0.0.1:9944');
  const api = await ApiPromise.create({ provider });
  
  console.log('Connected to:', await api.rpc.system.chain());
  
  // Load the compiled contract
  const wasmCode = readFileSync('./contracts/qflink-pods/qflink-pods.polkavm');
  console.log('Loaded contract WASM:', wasmCode.length, 'bytes');
  
  // Use Alice's dev account
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');
  console.log('Deploying from:', alice.address);
  
  // Deploy the contract
  const gasLimit = api.registry.createType('WeightV2', {
    refTime: api.registry.createType('Compact<u64>', '10000000000'),
    proofSize: api.registry.createType('Compact<u64>', '10000000000'),
  });
  
  return new Promise((resolve, reject) => {
    api.tx.revive
      .instantiateWithCode(
        0, // value
        gasLimit,
        null, // storageDepositLimit
        `0x${wasmCode.toString('hex')}`,
        '0x', // input data (empty - will trigger deploy())
        '0x'  // salt (empty)
      )
      .signAndSend(alice, { nonce: -1 }, (result) => {
        console.log('Transaction status:', result.status.type);
        
        if (result.status.isInBlock) {
          console.log('Included in block:', result.status.asInBlock.toHex());
        }
        
        if (result.status.isFinalized) {
          console.log('Finalized in block:', result.status.asFinalized.toHex());
          
          // Find the Instantiated event
          result.events.forEach(({ event }) => {
            if (event.section === 'revive' && event.method === 'Instantiated') {
              const [deployer, contractAddress] = event.data;
              console.log('\n✅ Contract deployed at:', contractAddress.toString());
              console.log('\nUpdate your .env file:');
              console.log(`VITE_PODS_ADDRESS=${contractAddress.toString()}`);
              resolve(contractAddress.toString());
            }
          });
          
          if (result.dispatchError) {
            console.error('Dispatch error:', result.dispatchError.toString());
            reject(new Error('Deployment failed'));
          }
        }
        
        if (result.isError) {
          console.error('❌ Transaction failed');
          reject(new Error('Transaction failed'));
        }
      })
      .catch(reject);
  });
}

deployPods()
  .then(() => {
    console.log('\n✨ Deployment complete!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Deployment failed:', err);
    process.exit(1);
  });
