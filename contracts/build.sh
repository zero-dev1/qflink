#!/bin/bash
set -e

echo "Building QFLink contracts..."
echo "Target: riscv32imac-unknown-none-elf"

cargo build --release --target riscv32imac-unknown-none-elf

echo "Build complete!"
echo "Output: target/riscv32imac-unknown-none-elf/release/qflink_contracts.wasm"
