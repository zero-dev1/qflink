import { createWalletClient, createPublicClient, http, encodeDeployData, getContractAddress, parseAbi, encodeAbiParameters, keccak256, toHex, hexToBytes, concat, pad, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CONTRACTS_DIR = path.join(ROOT, 'contracts');
const BUILD_DIR = path.join(ROOT, 'build');

// ── Config ──
const RPC_URL = process.env.VITE_WALLET_RPC_URL || 'http://localhost:8545';
const CHAIN_ID = 42;

// Deployer key from environment (must be set in .env.development or .env.production)
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;
if (!DEPLOYER_KEY) {
  console.error('❌ DEPLOYER_PRIVATE_KEY environment variable is required');
  process.exit(1);
}

// ── Load QNS Addresses ──
// Auto-load QNS addresses from QNS deployment (deployments.json)
const qnsDeploymentPath = path.resolve(__dirname, '..', '..', 'qns', 'deployments.json');
let qnsAddresses = {};

if (existsSync(qnsDeploymentPath)) {
  try {
    const qnsDeployment = JSON.parse(readFileSync(qnsDeploymentPath, 'utf8'));
    qnsAddresses = qnsDeployment.contracts;
    console.log('✅ QNS addresses loaded from', qnsDeploymentPath);
    console.log('   Registry:', qnsAddresses.QNSRegistry);
    console.log('   Registrar:', qnsAddresses.QNSRegistrar);
    console.log('   Resolver:', qnsAddresses.QNSResolver);
  } catch (e) {
    console.log('⚠️  Failed to parse QNS deployments.json:', e.message);
    console.log('   QNS addresses will use values from .env or fallback to empty');
  }
} else {
  console.log('⚠️  QNS deployments.json not found at', qnsDeploymentPath);
  console.log('   QNS addresses will use values from .env.development');
  // Fall back to env values
  qnsAddresses = {
    QNSRegistry: process.env.VITE_QNS_REGISTRY_ADDRESS || '',
    QNSRegistrar: process.env.VITE_QNS_REGISTRAR_ADDRESS || '',
    QNSResolver: process.env.VITE_QNS_RESOLVER_ADDRESS || ''
  };
}

const chain = {
  id: CHAIN_ID,
  name: 'QF Network Dev',
  nativeCurrency: { name: 'QF', symbol: 'QF', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
};

const account = privateKeyToAccount(DEPLOYER_KEY);

const walletClient = createWalletClient({
  account,
  chain,
  transport: http(RPC_URL),
});

const publicClient = createPublicClient({
  chain,
  transport: http(RPC_URL),
});

// ── Helpers ──

function compile(contractName, solFile) {
  if (!existsSync(BUILD_DIR)) mkdirSync(BUILD_DIR, { recursive: true });

  const solPath = path.join(CONTRACTS_DIR, solFile);
  console.log(`  Compiling ${contractName} from ${solFile}...`);

  try {
    // Use native resolc with solc path (0.8.33 is the max supported version)
    const solcPath = process.env.SOLC_PATH || `${process.env.HOME}/.solc-select/artifacts/solc-0.8.28/solc-0.8.28`;
    const resolcPath = process.env.RESOLC_PATH || `${process.env.HOME}/.local/bin/resolc`;
    
    // Compile bytecode with resolc
    execSync(
      `${resolcPath} --solc ${solcPath} -O 3 --bin -o ${BUILD_DIR} --overwrite ${solPath}`,
      { stdio: 'pipe' }
    );
    
    // Compile ABI with solc
    execSync(
      `${solcPath} --abi -o ${BUILD_DIR} --overwrite ${solPath}`,
      { stdio: 'pipe' }
    );
  } catch (err) {
    console.error(`  Failed to compile ${contractName}:`);
    console.error(err.stderr?.toString() || err.message);
    process.exit(1);
  }

  // resolc outputs files as ContractName.bin and ContractName.abi
  // But sometimes it uses the full path. Let's find the files.
  const possibleNames = [
    contractName,
    solFile.replace('.sol', ''),
  ];

  let binHex, abiJson;
  
  // Native resolc outputs files as ContractName.sol:ContractName.pvm
  // And solc outputs ContractName.abi
  for (const name of possibleNames) {
    // Try different patterns for the PVM file
    const pvmPatterns = [
      path.join(BUILD_DIR, `${name}.pvm`),
      path.join(BUILD_DIR, `${solFile}:${name}.pvm`),
      path.join(BUILD_DIR, `${solFile.replace('.sol', '')}.sol:${name}.pvm`),
    ];
    const abiPath = path.join(BUILD_DIR, `${name}.abi`);
    
    for (const pvmPath of pvmPatterns) {
      if (existsSync(pvmPath)) {
        // .pvm is binary data, read as hex
        const pvmData = readFileSync(pvmPath);
        binHex = pvmData.toString('hex');
        if (existsSync(abiPath)) {
          abiJson = JSON.parse(readFileSync(abiPath, 'utf-8'));
        }
        break;
      }
    }
    if (binHex) break;
  }
  
  // If not found, search for any matching file
  if (!binHex) {
    const allFiles = execSync(`ls ${BUILD_DIR}/ 2>/dev/null || true`).toString().trim().split('\n');
    for (const file of allFiles) {
      if (file.includes(contractName) && file.endsWith('.pvm')) {
        const pvmData = readFileSync(path.join(BUILD_DIR, file));
        binHex = pvmData.toString('hex');
        // Try to find matching ABI file
        const abiFile = file.replace('.pvm', '.abi').split(':')[0].replace('.sol', '') + '.abi';
        const abiPath = path.join(BUILD_DIR, abiFile);
        if (existsSync(abiPath)) {
          abiJson = JSON.parse(readFileSync(abiPath, 'utf-8'));
        }
        break;
      }
    }
  }

  if (!binHex) {
    console.error(`  Could not find compiled output for ${contractName}.`);
    const files = execSync(`ls -la ${BUILD_DIR}/ 2>/dev/null || true`).toString();
    console.error(`  Files in build dir:\n${files}`);
    process.exit(1);
  }

  return { bytecode: `0x${binHex}`, abi: abiJson };
}

async function deploy(contractName, solFile, constructorArgs = []) {
  console.log(`\n📦 Deploying ${contractName}...`);
  const { bytecode, abi } = compile(contractName, solFile);

  // Encode constructor args if any
  let data = bytecode;
  if (constructorArgs.length > 0) {
    const constructor = abi.find(x => x.type === 'constructor');
    if (constructor) {
      const encoded = encodeAbiParameters(
        constructor.inputs,
        constructorArgs
      );
      data = bytecode + encoded.slice(2); // remove 0x prefix from args
    }
  }

  const hash = await walletClient.sendTransaction({
    data,
    chain,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (!receipt.contractAddress) {
    console.error(`  ❌ Deployment failed for ${contractName}. No contract address in receipt.`);
    console.error(`  Receipt status: ${receipt.status}`);
    process.exit(1);
  }

  console.log(`  ✅ ${contractName}: ${receipt.contractAddress}`);
  return receipt.contractAddress;
}

async function writeContract(address, abi, functionName, args = []) {
  console.log(`  → ${functionName}(${args.map(a => typeof a === 'string' ? a.slice(0, 10) + '...' : a).join(', ')})`);
  const hash = await walletClient.writeContract({
    address,
    abi,
    functionName,
    args,
    chain,
  });
  await publicClient.waitForTransactionReceipt({ hash });
}

// ── Main Deployment ──

async function main() {
  console.log('🚀 QFLink Full Deployment\n');
  console.log(`Deployer: ${account.address}`);
  console.log(`RPC: ${RPC_URL}`);
  console.log(`Chain ID: ${CHAIN_ID}\n`);

  // Check connection
  try {
    const blockNumber = await publicClient.getBlockNumber();
    console.log(`Connected. Block: ${blockNumber}\n`);
  } catch (err) {
    console.error('❌ Cannot connect to RPC. Make sure qf-node and eth-rpc are running.');
    process.exit(1);
  }

  // ════════════════════════════════════════════
  // TIER 0: No dependencies
  // ════════════════════════════════════════════
  console.log('═══ TIER 0: Base contracts ═══');

  const registry = await deploy('QFLinkRegistry', 'QFLinkRegistry.sol', []);

  // PodsStorage needs an auth address in constructor. Use deployer as placeholder.
  // We'll authorize the real contracts after they're deployed.
  const podsStorage = await deploy('QFLinkPodsStorage', 'QFLinkPodsStorage.sol', [account.address]);

  // ════════════════════════════════════════════
  // TIER 1: Depends on Tier 0
  // ════════════════════════════════════════════
  console.log('\n═══ TIER 1: Second-layer contracts ═══');

  // Payments: constructor(address pods, address treasury)
  // _pods gets set later via setPods, use deployer as placeholder
  const payments = await deploy('QFLinkPayments', 'QFLinkPayments.sol', [account.address, podsStorage]);

  // ContentStore: constructor(address _auth) — auth set later
  const contentStore = await deploy('QFLinkContentStore', 'QFLinkContentStore.sol', [account.address]);

  // MessageIndex: constructor(address _auth) — auth set later
  const messageIndex = await deploy('QFLinkMessageIndex', 'QFLinkMessageIndex.sol', [account.address]);

  // ════════════════════════════════════════════
  // TIER 2: Depends on PodsStorage (and Payments)
  // ════════════════════════════════════════════
  console.log('\n═══ TIER 2: Pod micro-contracts ═══');

  const podsCreate = await deploy('QFLinkPodsCreate', 'QFLinkPodsCreate.sol', [podsStorage, account.address]);
  const podsCreatePaid = await deploy('QFLinkPodsCreatePaid', 'QFLinkPodsCreatePaid.sol', [podsStorage, payments, account.address, parseEther('500')]);
  const podsJoin = await deploy('QFLinkPodsJoin', 'QFLinkPodsJoin.sol', [podsStorage, payments]);
  const podsLeave = await deploy('QFLinkPodsLeave', 'QFLinkPodsLeave.sol', [podsStorage]);
  const podsBan = await deploy('QFLinkPodsBanSimple', 'QFLinkPodsBanSimple.sol', [podsStorage]);
  const podsAddMod = await deploy('QFLinkPodsAddMod', 'QFLinkPodsAddMod.sol', [podsStorage]);
  const podsRemoveMod = await deploy('QFLinkPodsRemoveMod', 'QFLinkPodsRemoveMod.sol', [podsStorage]);
  const podsAdmin = await deploy('QFLinkPodsAdmin', 'QFLinkPodsAdmin.sol', [podsStorage, payments]);
  const podsReader = await deploy('QFLinkPodsReader', 'QFLinkPodsReader.sol', [podsStorage]);
  const podsGetPod = await deploy('QFLinkPodsGetPod', 'QFLinkPodsGetPod.sol', [podsStorage]);

  // ════════════════════════════════════════════
  // TIER 3: Messages (depends on ContentStore, MessageIndex, PodsReader)
  // ════════════════════════════════════════════
  console.log('\n═══ TIER 3: Message contracts ═══');

  const messageWriter = await deploy('QFLinkMessageWriter', 'QFLinkMessageWriter.sol', [contentStore, messageIndex, podsReader]);
  const messageReader = await deploy('QFLinkMessageReader', 'QFLinkMessageReader.sol', [contentStore, messageIndex]);

  // ════════════════════════════════════════════
  // TIER 4: Session Keys + MessageWriterV2
  // ════════════════════════════════════════════
  console.log('\n═══ TIER 4: Session keys ═══');

  const sessionKeys = await deploy('QFLinkSessionKeys', 'QFLinkSessionKeys.sol', []);
  const messageWriterV2 = await deploy('QFLinkMessageWriterV2', 'QFLinkMessageWriterV2.sol', [contentStore, messageIndex, podsReader, sessionKeys]);

  // ════════════════════════════════════════════
  // WIRING: Authorization calls
  // ════════════════════════════════════════════
  console.log('\n═══ WIRING: Authorization ═══');

  const podsStorageAbi = parseAbi([
    'function setAuthorized(address auth, bool status) external',
  ]);

  const podsStorageAuthTargets = [podsCreate, podsCreatePaid, podsJoin, podsLeave, podsBan, podsAddMod, podsRemoveMod, podsAdmin];
  for (const target of podsStorageAuthTargets) {
    await writeContract(podsStorage, podsStorageAbi, 'setAuthorized', [target, true]);
  }

  // Payments authorization (replaces old setPods pattern)
  const paymentsAuthAbi = parseAbi(['function setAuthorized(address auth, bool status) external']);
  await writeContract(payments, paymentsAuthAbi, 'setAuthorized', [podsCreatePaid, true]);
  await writeContract(payments, paymentsAuthAbi, 'setAuthorized', [podsJoin, true]);
  await writeContract(payments, paymentsAuthAbi, 'setAuthorized', [podsAdmin, true]);

  // ContentStore.setAuthorized → MessageWriterV2 (replaces V1 as authorized writer)
  const contentStoreAbi = parseAbi(['function setAuthorized(address _auth) external']);
  await writeContract(contentStore, contentStoreAbi, 'setAuthorized', [messageWriterV2]);

  // MessageIndex.setAuthorized → MessageWriterV2 (replaces V1 as authorized writer)
  const messageIndexAbi = parseAbi(['function setAuthorized(address _auth) external']);
  await writeContract(messageIndex, messageIndexAbi, 'setAuthorized', [messageWriterV2]);

  // ════════════════════════════════════════════
  // OUTPUT: Write .env.development
  // ════════════════════════════════════════════
  console.log('\n═══ Writing .env.development ═══');

  // Before writing new .env, preserve these keys from existing file
  const preserveKeys = ['DEPLOYER_PRIVATE_KEY', 'TEST_USER_PRIVATE_KEY', 'TREASURY_ADDRESS', 'VITE_OWNER_ADDRESS'];
  const preservedValues = {};
  
  const existingEnvPath = path.join(ROOT, '.env.development');
  if (existsSync(existingEnvPath)) {
    try {
      const existingContent = readFileSync(existingEnvPath, 'utf8');
      for (const key of preserveKeys) {
        const regex = new RegExp(`^${key}=(.+)$`, 'm');
        const match = existingContent.match(regex);
        if (match && match[1].trim()) {
          preservedValues[key] = match[1].trim();
        }
      }
      console.log('  📋 Preserved existing values for:', Object.keys(preservedValues).join(', ') || 'none found');
    } catch (e) {
      console.log('  ⚠️  Could not read existing .env.development:', e.message);
    }
  }

  // Build env content with preserved values
  const envContent = `VITE_DEFAULT_NETWORK=local
VITE_ETH_RPC_URL=/eth-rpc
VITE_WALLET_RPC_URL=http://localhost:8545
VITE_OWNER_ADDRESS=${preservedValues.VITE_OWNER_ADDRESS || account.address}
VITE_REGISTRY_ADDRESS=${registry}
VITE_PODS_STORAGE_ADDRESS=${podsStorage}
VITE_PODS_CREATE_ADDRESS=${podsCreate}
VITE_PODS_JOIN_ADDRESS=${podsJoin}
VITE_PODS_LEAVE_ADDRESS=${podsLeave}
VITE_PODS_BAN_ADDRESS=${podsBan}
VITE_PODS_ADDMOD_ADDRESS=${podsAddMod}
VITE_PODS_REMOVEMOD_ADDRESS=${podsRemoveMod}
VITE_PODS_ADMIN_ADDRESS=${podsAdmin}
VITE_PODS_READER_ADDRESS=${podsReader}
VITE_PODS_GETPOD_ADDRESS=${podsGetPod}
VITE_PAYMENTS_ADDRESS=${payments}
VITE_CONTENT_STORE_ADDRESS=${contentStore}
VITE_MESSAGE_INDEX_ADDRESS=${messageIndex}
VITE_MESSAGE_WRITER_ADDRESS=${messageWriterV2}
VITE_MESSAGE_READER_ADDRESS=${messageReader}
VITE_PODS_CREATE_PAID_ADDRESS=${podsCreatePaid}
VITE_SESSION_KEYS_ADDRESS=${sessionKeys}
VITE_MESSAGE_WRITER_V2_ADDRESS=${messageWriterV2}

# Private Keys (preserved from existing config)
DEPLOYER_PRIVATE_KEY=${preservedValues.DEPLOYER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY || ''}
TEST_USER_PRIVATE_KEY=${preservedValues.TEST_USER_PRIVATE_KEY || process.env.TEST_USER_PRIVATE_KEY || ''}

# Treasury Address (preserved from existing config)
TREASURY_ADDRESS=${preservedValues.TREASURY_ADDRESS || ''}

# QNS Contract Addresses (from qns/deployments.json)
VITE_QNS_REGISTRY_ADDRESS=${qnsAddresses.QNSRegistry || ''}
VITE_QNS_REGISTRAR_ADDRESS=${qnsAddresses.QNSRegistrar || ''}
VITE_QNS_RESOLVER_ADDRESS=${qnsAddresses.QNSResolver || ''}
`;

  const envPath = path.join(ROOT, '.env.development');
  writeFileSync(envPath, envContent);
  console.log(`  ✅ Written to ${envPath}`);

  // Log QNS address status
  if (qnsAddresses.QNSRegistry) {
    console.log('\n═══ QNS Addresses Included ═══');
    console.log('   Registry:', qnsAddresses.QNSRegistry);
    console.log('   Registrar:', qnsAddresses.QNSRegistrar);
    console.log('   Resolver:', qnsAddresses.QNSResolver);
  } else {
    console.log('\n⚠️  QNS addresses not available - populate manually in .env.development');
  }

  // ════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════');
  console.log('🎉 DEPLOYMENT COMPLETE');
  console.log('═══════════════════════════════════════');
  console.log(`Registry:        ${registry}`);
  console.log(`PodsStorage:     ${podsStorage}`);
  console.log(`PodsCreate:      ${podsCreate}`);
  console.log(`PodsJoin:        ${podsJoin}`);
  console.log(`PodsLeave:       ${podsLeave}`);
  console.log(`PodsBan:         ${podsBan}`);
  console.log(`PodsAddMod:      ${podsAddMod}`);
  console.log(`PodsRemoveMod:   ${podsRemoveMod}`);
  console.log(`PodsAdmin:       ${podsAdmin}`);
  console.log(`PodsReader:      ${podsReader}`);
  console.log(`PodsGetPod:      ${podsGetPod}`);
  console.log(`Payments:        ${payments}`);
  console.log(`ContentStore:    ${contentStore}`);
  console.log(`MessageIndex:    ${messageIndex}`);
  console.log(`MessageWriter:   ${messageWriter}`);
  console.log(`MessageWriterV2: ${messageWriterV2}`);
  console.log(`MessageReader:   ${messageReader}`);
  console.log(`SessionKeys:     ${sessionKeys}`);
  console.log(`PodsCreatePaid:  ${podsCreatePaid}`);
  console.log('═══════════════════════════════════════\n');

  // ════════════════════════════════════════════
  // Generate Vercel-ready env file
  // ════════════════════════════════════════════
  const vercelEnv = `# QFLink Vercel Environment Variables
# Generated: ${new Date().toISOString()}
# Copy each line into Vercel → Settings → Environment Variables

VITE_DEFAULT_NETWORK=mainnet
VITE_ETH_RPC_URL=<REPLACE_WITH_MAINNET_RPC>
VITE_WALLET_RPC_URL=<REPLACE_WITH_MAINNET_RPC>
VITE_OWNER_ADDRESS=${account.address}

VITE_REGISTRY_ADDRESS=${registry}
VITE_PODS_STORAGE_ADDRESS=${podsStorage}
VITE_PODS_CREATE_ADDRESS=${podsCreate}
VITE_PODS_JOIN_ADDRESS=${podsJoin}
VITE_PODS_LEAVE_ADDRESS=${podsLeave}
VITE_PODS_BAN_ADDRESS=${podsBan}
VITE_PODS_ADDMOD_ADDRESS=${podsAddMod}
VITE_PODS_REMOVEMOD_ADDRESS=${podsRemoveMod}
VITE_PODS_ADMIN_ADDRESS=${podsAdmin}
VITE_PODS_READER_ADDRESS=${podsReader}
VITE_PODS_GETPOD_ADDRESS=${podsGetPod}
VITE_PAYMENTS_ADDRESS=${payments}
VITE_CONTENT_STORE_ADDRESS=${contentStore}
VITE_MESSAGE_INDEX_ADDRESS=${messageIndex}
VITE_MESSAGE_WRITER_ADDRESS=${messageWriterV2}
VITE_MESSAGE_READER_ADDRESS=${messageReader}
VITE_PODS_CREATE_PAID_ADDRESS=${podsCreatePaid}
VITE_SESSION_KEYS_ADDRESS=${sessionKeys}
VITE_MESSAGE_WRITER_V2_ADDRESS=${messageWriterV2}

# QNS Addresses
VITE_QNS_REGISTRY_ADDRESS=${qnsAddresses.QNSRegistry || ''}
VITE_QNS_REGISTRAR_ADDRESS=${qnsAddresses.QNSRegistrar || ''}
VITE_QNS_RESOLVER_ADDRESS=${qnsAddresses.QNSResolver || ''}
`;

  const vercelEnvPath = path.join(ROOT, 'vercel-env.txt');
  writeFileSync(vercelEnvPath, vercelEnv);
  console.log('📋 Vercel env file written to vercel-env.txt');
  console.log('   Copy values into Vercel dashboard → Settings → Environment Variables');
}

main().catch(err => {
  console.error('❌ Deployment failed:', err);
  process.exit(1);
});
