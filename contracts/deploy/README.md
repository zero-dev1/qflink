# QFLink Contract Deployment Guide

## Prerequisites

1. **Build all contracts:**
   ```bash
   cd contracts/qflink-registry && ./build.sh
   cd ../qflink-pods && ./build.sh
   cd ../qflink-messages && ./build.sh
   ```

2. **Verify .polkavm files exist:**
   - `qflink-registry/qflink-registry.polkavm`
   - `qflink-pods/qflink-pods.polkavm`
   - `qflink-messages/qflink-messages.polkavm`

## Deployment Steps

### Option 1: Via Portal (Recommended for First Deployment)

1. **Go to QF Network Portal:**
   - Local: `http://localhost:3000` (if running local node)
   - Testnet: `https://portal.qfnetwork.xyz`

2. **Navigate to Developer → Extrinsics**

3. **For each contract, do the following:**

   a. Select `revive` → `instantiateWithCode`
   
   b. Fill in parameters:
   - `value`: 0
   - `gasLimit`: 
     - `refTime`: 10000000000000
     - `proofSize`: 10000000000000
   - `storageDepositLimit`: null (leave empty)
   - `code`: Upload the `.polkavm` file
   - `data`: 0x (empty)
   - `salt`: 0x (empty)
   
   c. Sign and submit
   
   d. **Copy the contract address** from the `revive.Instantiated` event

4. **Update your `.env` file** with the addresses:
   ```
   VITE_REGISTRY_ADDRESS=0x...
   VITE_PODS_ADDRESS=0x...
   VITE_MESSAGES_ADDRESS=0x...
   ```

### Option 2: Via JavaScript Console

1. **Open Portal → Developer → JavaScript**

2. **Prepare contract files:**
   ```bash
   # Convert .polkavm to base64
   base64 qflink-registry/qflink-registry.polkavm > registry.b64
   base64 qflink-pods/qflink-pods.polkavm > pods.b64
   base64 qflink-messages/qflink-messages.polkavm > messages.b64
   ```

3. **Edit `deploy.js`:**
   - Paste base64 content into `registryWasm`, `podsWasm`, `messagesWasm` variables

4. **Paste entire `deploy.js` into console and run**

5. **Copy addresses from output to `.env`**

## Deployment Order

**IMPORTANT:** Deploy in this exact order:

1. **qflink-registry** (first) - Other contracts may depend on it
2. **qflink-pods** (second) - Initializes 6 default pods on deployment
3. **qflink-messages** (third)

## Verification

After deployment, verify each contract:

### 1. Registry Contract
```javascript
// Get user count (should be 0 initially)
const selector = '0x9a8a0592'; // get_user_count()
const result = await api.call.revive.call(
  '0x0000000000000000000000000000000000000000',
  'REGISTRY_ADDRESS',
  '0',
  { refTime: 1000000000000, proofSize: 1000000000000 },
  null,
  selector
);
console.log('User count:', result.toJSON());
```

### 2. Pods Contract
```javascript
// Get pod count (should be 6 - the default pods)
const selector = '0x9a8a0592'; // get_pod_count()
const result = await api.call.revive.call(
  '0x0000000000000000000000000000000000000000',
  'PODS_ADDRESS',
  '0',
  { refTime: 1000000000000, proofSize: 1000000000000 },
  null,
  selector
);
console.log('Pod count:', result.toJSON());
```

### 3. Messages Contract
```javascript
// Get message count for a conversation (should be 0 initially)
const selector = '0x...' // get_message_count(address,address)
// ... encode addresses and call
```

## Default Pods

The `qflink-pods` contract automatically creates 6 default pods on deployment:

| ID | Name   | Min Balance (QF) |
|----|--------|------------------|
| 0  | Shrimp | 0                |
| 1  | Crab   | 1,000            |
| 2  | Fish   | 10,000           |
| 3  | Shark  | 50,000           |
| 4  | Whale  | 100,000          |
| 5  | Kraken | 500,000          |

## Troubleshooting

### "OutOfGas" Error
- Increase `refTime` and `proofSize` in gasLimit

### "StorageDepositLimitExhausted" Error
- Set `storageDepositLimit` to a higher value (e.g., 1000000000000000000)

### Contract Not Found After Deployment
- Check the `revive.Instantiated` event in the block explorer
- Verify you're using the correct network (local/testnet/mainnet)

### Default Pods Not Created
- Check the `deploy()` function was called during instantiation
- Query `get_pod_count()` - should return 6
- Query `get_pod(0)` - should return Shrimp pod details

## Network Endpoints

- **Local Dev:** `ws://127.0.0.1:9944`
- **Testnet:** `wss://test.qfnetwork.xyz`
- **Mainnet:** `wss://rpc.qfnetwork.xyz`

## Next Steps

After deployment:

1. Update `.env` with contract addresses
2. Restart your frontend dev server
3. Connect wallet and map account via `revive.mapAccount()`
4. Register a user profile
5. Test pod access and messaging

## Re-deployment

If you need to redeploy (e.g., after contract changes):

1. Rebuild contracts: `./build.sh`
2. Deploy new instances
3. Update `.env` with new addresses
4. Clear localStorage in browser (old data won't work with new contracts)
5. Restart frontend

## Support

For issues:
- Check QF Network documentation
- Review contract logs in block explorer
- Verify SCALE encoding/decoding is correct
