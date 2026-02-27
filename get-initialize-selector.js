import { keccak256AsU8a } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';

const sig = 'initialize_pods()';
const hash = keccak256AsU8a(new TextEncoder().encode(sig));
const selector = u8aToHex(hash.slice(0, 4));

console.log('\n📋 Initialize Pods Function');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Function signature:', sig);
console.log('Selector (4 bytes):', selector);
console.log('\n📝 To call via Polkadot.js Apps portal:');
console.log('1. Go to Developer > Extrinsics');
console.log('2. Select: revive.call(dest, value, gasLimit, storageDepositLimit, data)');
console.log('3. Parameters:');
console.log('   - dest:', process.env.VITE_PODS_ADDRESS || '0xbce63cb42c990eabda1b0a1af646f6e9d35115d6');
console.log('   - value: 0');
console.log('   - gasLimit: { refTime: 10000000000, proofSize: 10000000000 }');
console.log('   - storageDepositLimit: None');
console.log('   - data:', selector);
console.log('\n✨ This will initialize the 3 default pods (Chefs, Whale, Kraken)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
