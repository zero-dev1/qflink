#![no_std]

extern crate alloc;
use alloc::vec::Vec;
use parity_scale_codec::{Decode, Encode};

#[derive(Encode, Decode, Clone)]
pub struct WalletLink {
    pub primary: [u8; 32],
    pub linked: [u8; 32],
}

pub struct LinkedWalletsContract;

impl LinkedWalletsContract {
    pub fn link_wallet(
        primary: [u8; 32],
        linked: [u8; 32],
        _signature: &[u8],
    ) -> Result<WalletLink, &'static str> {
        if primary == linked {
            return Err("Cannot link wallet to itself");
        }
        Ok(WalletLink { primary, linked })
    }

    pub fn get_linked_wallets(
        links: &[WalletLink],
        primary: [u8; 32],
    ) -> Vec<[u8; 32]> {
        links
            .iter()
            .filter(|l| l.primary == primary)
            .map(|l| l.linked)
            .collect()
    }

    pub fn get_primary_wallet(
        links: &[WalletLink],
        linked: [u8; 32],
    ) -> Option<[u8; 32]> {
        links.iter().find(|l| l.linked == linked).map(|l| l.primary)
    }

    pub fn get_total_balance(
        primary_balance: u128,
        linked_balances: &[u128],
    ) -> u128 {
        linked_balances.iter().fold(primary_balance, |acc, b| acc + b)
    }
}
