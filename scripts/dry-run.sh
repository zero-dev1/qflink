#!/bin/bash
set -e

echo "=== QFLink Full Dry Run ==="
echo "Started: $(date)"

# Step 1: Stop any running processes
echo ""
echo "[1/6] Stopping processes..."
pkill -f "substrate\|node.*dev\|qf-node" 2>/dev/null || true
pkill -f vite 2>/dev/null || true
sleep 2

# Step 2: Wipe and restart chain
echo ""
echo "[2/6] Wiping chain and restarting..."

# Check if qf-solochain exists
QF_NODE_PATH="$HOME/CascadeProjects/QFDapps/qf-solochain"
if [ ! -d "$QF_NODE_PATH" ]; then
    echo "⚠️  Warning: qf-solochain not found at $QF_NODE_PATH"
    echo "    Please update the QF_NODE_PATH variable in this script"
    echo "    or start your chain manually and press Enter to continue..."
    read -p "Press Enter when the chain is running..."
else
    # Remove dev-data to wipe the chain
    if [ -d "$QF_NODE_PATH/dev-data" ]; then
        echo "    Wiping existing chain data..."
        rm -rf "$QF_NODE_PATH/dev-data"
    fi
    
    # Start the chain in the background
    echo "    Starting qf-node in dev mode..."
    cd "$QF_NODE_PATH"
    ./target/release/qf-node --dev --base-path ./dev-data &
    NODE_PID=$!
    
    # Give the node a moment to start
    sleep 3
    
    # Check if node is still running
    if ! kill -0 $NODE_PID 2>/dev/null; then
        echo "❌ Failed to start qf-node. Check the binary exists at:"
        echo "   $QF_NODE_PATH/target/release/qf-node"
        exit 1
    fi
    
    echo "    qf-node started (PID: $NODE_PID)"
fi

# Step 3: Wait for chain to be ready
echo ""
echo "[3/6] Waiting for chain..."
MAX_RETRIES=60
RETRY_COUNT=0

until curl -s http://127.0.0.1:9944 > /dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "❌ Timeout waiting for chain to be ready"
        exit 1
    fi
    echo "    Waiting for chain... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 1
done
echo "    Chain ready on port 9944"

# Also wait for eth-rpc (port 8545)
RETRY_COUNT=0
until curl -s -X POST -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    http://127.0.0.1:8545 > /dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "❌ Timeout waiting for eth-rpc to be ready"
        exit 1
    fi
    echo "    Waiting for eth-rpc... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 1
done
echo "    eth-rpc ready on port 8545"

# Step 4: Deploy QNS (if in separate repo)
echo ""
echo "[4/6] Deploy QNS..."
QNS_PATH="$HOME/CascadeProjects/QFDapps/qns"

if [ -d "$QNS_PATH" ]; then
    echo "    Found QNS at $QNS_PATH"
    echo "    Deploying QNS contracts..."
    cd "$QNS_PATH"
    
    # Check for deploy script
    if [ -f "scripts/deploy.mjs" ]; then
        node scripts/deploy.mjs
    elif [ -f "scripts/deploy.js" ]; then
        node scripts/deploy.js
    else
        echo "    ⚠️  No deploy script found in QNS repo"
        echo "       Please deploy QNS manually and press Enter to continue..."
        read -p "Press Enter after QNS is deployed..."
    fi
else
    echo "    ⚠️  QNS repo not found at $QNS_PATH"
    echo "       QNS tests will be skipped."
    echo "       To include QNS, clone the QNS repo to: $QNS_PATH"
fi

# Step 5: Deploy QFLink
echo ""
echo "[5/6] Deploying QFLink..."
cd "$(dirname "$0")/.."
node scripts/deploy-all.mjs

# Step 6: Run smoke test
echo ""
echo "[6/6] Running smoke test..."
node scripts/smoke-test.mjs

echo ""
echo "=== Dry Run Complete ==="
echo "Finished: $(date)"

# Optional: Keep node running or shut it down
if [ -n "$NODE_PID" ]; then
    echo ""
    read -p "Keep the chain running? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Stopping qf-node (PID: $NODE_PID)..."
        kill $NODE_PID 2>/dev/null || true
        echo "Chain stopped."
    else
        echo "Chain is still running (PID: $NODE_PID)"
        echo "Stop it later with: kill $NODE_PID"
    fi
fi
