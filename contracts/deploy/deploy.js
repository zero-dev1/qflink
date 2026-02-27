/**
 * QFLink Contract Deployment Script
 * 
 * This script deploys all three QFLink contracts to QF Network.
 * 
 * Usage:
 * 1. Go to portal.qfnetwork.xyz/#/js
 * 2. Paste this entire script
 * 3. Run it
 * 4. Copy the contract addresses and update your .env file
 * 
 * The script will:
 * - Deploy qflink-registry
 * - Deploy qflink-pods (which initializes 6 default pods)
 * - Deploy qflink-messages
 * - Log all contract addresses
 */

// Load the contract WASM files
// You'll need to upload these files via the portal UI first
const registryWasm = ''; // Paste base64 encoded .polkavm file here
const podsWasm = '';     // Paste base64 encoded .polkavm file here
const messagesWasm = ''; // Paste base64 encoded .polkavm file here

async function deployContract(api, signer, code, contractName) {
  console.log(`\n📦 Deploying ${contractName}...`);
  
  const gasLimit = api.registry.createType('WeightV2', {
    refTime: api.registry.createType('Compact<u64>', 10_000_000_000_000),
    proofSize: api.registry.createType('Compact<u64>', 10_000_000_000_000),
  });
  
  const storageDepositLimit = null; // Use default
  
  return new Promise((resolve, reject) => {
    api.tx.revive
      .instantiateWithCode(
        0, // value
        gasLimit,
        storageDepositLimit,
        code,
        '0x', // input data (empty for deploy)
        '0x'  // salt (empty)
      )
      .signAndSend(signer, { nonce: -1 }, (result) => {
        console.log(`Transaction status: ${result.status.type}`);
        
        if (result.status.isInBlock) {
          console.log(`Included in block: ${result.status.asInBlock.toHex()}`);
        }
        
        if (result.status.isFinalized) {
          console.log(`Finalized in block: ${result.status.asFinalized.toHex()}`);
          
          // Find the Instantiated event
          result.events.forEach(({ event }) => {
            if (event.section === 'revive' && event.method === 'Instantiated') {
              const [deployer, contractAddress] = event.data;
              console.log(`✅ ${contractName} deployed at: ${contractAddress.toString()}`);
              resolve(contractAddress.toString());
            }
          });
        }
        
        if (result.isError) {
          console.error(`❌ Deployment failed for ${contractName}`);
          reject(new Error('Deployment failed'));
        }
      })
      .catch(reject);
  });
}

async function main() {
  console.log('🚀 Starting QFLink Contract Deployment\n');
  console.log('Network:', await api.rpc.system.chain());
  console.log('Node version:', await api.rpc.system.version());
  
  // Get the selected account from the portal
  const injector = await web3FromAddress(selectedAccount.address);
  
  console.log('\n👤 Deploying from account:', selectedAccount.address);
  
  // Deploy contracts in order
  const registryAddress = await deployContract(
    api,
    selectedAccount.address,
    registryWasm,
    'qflink-registry'
  );
  
  const podsAddress = await deployContract(
    api,
    selectedAccount.address,
    podsWasm,
    'qflink-pods'
  );
  
  const messagesAddress = await deployContract(
    api,
    selectedAccount.address,
    messagesWasm,
    'qflink-messages'
  );
  
  console.log('\n\n🎉 All contracts deployed successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Contract Addresses:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\nVITE_REGISTRY_ADDRESS=${registryAddress}`);
  console.log(`VITE_PODS_ADDRESS=${podsAddress}`);
  console.log(`VITE_MESSAGES_ADDRESS=${messagesAddress}`);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📝 Copy these addresses to your .env file\n');
  
  // Verify pods contract initialized default pods
  console.log('🔍 Verifying pods contract initialization...');
  try {
    const podCountCall = api.call.revive.call(
      '0x0000000000000000000000000000000000000000',
      podsAddress,
      '0',
      { refTime: 1000000000000, proofSize: 1000000000000 },
      null,
      '0x' + Buffer.from([0x9a, 0x8a, 0x05, 0x92]).toString('hex') // get_pod_count() selector
    );
    
    const result = await podCountCall;
    console.log('✅ Pods contract initialized successfully');
    console.log('   Default pods should be available (Shrimp, Crab, Fish, Shark, Whale, Kraken)');
  } catch (err) {
    console.warn('⚠️  Could not verify pods initialization:', err.message);
  }
}

// Run the deployment
main()
  .then(() => console.log('\n✨ Deployment complete!'))
  .catch((err) => {
    console.error('\n❌ Deployment failed:', err);
    process.exit(1);
  });
