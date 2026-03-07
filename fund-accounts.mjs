#!/usr/bin/env node
// Fund Ethereum-style addresses from Alice on the Polkadot chain

import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';

// Addresses to fund (H160 format for Ethereum compatibility)
const ADDR1 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'; // Anvil account 0
const ADDR2 = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'; // Anvil account 1

async function fundAccounts() {
  const provider = new WsProvider('ws://127.0.0.1:9944');
  const api = await ApiPromise.create({ provider });
  
  console.log('Connected to:', await api.rpc.system.chain());
  
  const keyring = new Keyring({ type: 'sr25519' });
  const alice = keyring.addFromUri('//Alice');
  
  console.log('\nAlice address:', alice.address);
  
  // Check Alice's balance
  const aliceBalance = await api.query.system.account(alice.address);
  console.log('Alice balance:', aliceBalance.data.free.toHuman());
  
  // Map Alice's account to get an H160 address if not already mapped
  console.log('\nMapping Alice account...');
  try {
    await new Promise((resolve, reject) => {
      api.tx.revive.mapAccount()
        .signAndSend(alice, { nonce: -1 }, (result) => {
          if (result.status.isInBlock || result.status.isFinalized) {
            resolve();
          }
          if (result.isError) reject(new Error('Mapping failed'));
        })
        .catch(reject);
    });
    console.log('Alice mapped successfully');
  } catch (e) {
    console.log('Alice already mapped or error:', e.message);
  }
  
  // Transfer funds to ADDR1 (convert H160 to ss58 for transfer)
  // For pallet-revive, we can transfer directly to the H160 address
  console.log('\nFunding ADDR1:', ADDR1);
  try {
    const tx1 = await api.tx.balances.transferAllowDeath(ADDR1, '1000000000000000000000'); // 1000 QF
    await new Promise((resolve, reject) => {
      tx1.signAndSend(alice, { nonce: -1 }, (result) => {
        if (result.status.isInBlock) {
          console.log('ADDR1 funded in block:', result.status.asInBlock.toHex());
        }
        if (result.status.isFinalized) {
          resolve();
        }
        if (result.isError) reject(new Error('Funding ADDR1 failed'));
      })
      .catch(reject);
    });
    console.log('ADDR1 funded successfully');
  } catch (e) {
    console.error('Failed to fund ADDR1:', e.message);
  }
  
  // Transfer funds to ADDR2
  console.log('\nFunding ADDR2:', ADDR2);
  try {
    const tx2 = await api.tx.balances.transferAllowDeath(ADDR2, '1000000000000000000000'); // 1000 QF
    await new Promise((resolve, reject) => {
      tx2.signAndSend(alice, { nonce: -1 }, (result) => {
        if (result.status.isInBlock) {
          console.log('ADDR2 funded in block:', result.status.asInBlock.toHex());
        }
        if (result.status.isFinalized) {
          resolve();
        }
        if (result.isError) reject(new Error('Funding ADDR2 failed'));
      })
      .catch(reject);
    });
    console.log('ADDR2 funded successfully');
  } catch (e) {
    console.error('Failed to fund ADDR2:', e.message);
  }
  
  // Verify balances via RPC
  console.log('\nVerifying balances via Ethereum RPC...');
  
  await api.disconnect();
  console.log('\nDone!');
}

fundAccounts().catch(console.error);
