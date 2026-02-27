#![no_std]

extern crate alloc;
use alloc::string::String;
use alloc::vec::Vec;
use parity_scale_codec::{Decode, Encode};

// Tier fee constants (in planck, 18 decimals)
pub const STANDARD_FEE: u128 = 500_000_000_000_000_000_000; // 500 QF
pub const PREMIUM_FEE: u128 = 5_000_000_000_000_000_000_000; // 5,000 QF
pub const ELITE_FEE: u128 = 50_000_000_000_000_000_000_000; // 50,000 QF

pub const TREASURY_SPLIT_PCT: u128 = 25;
pub const BURN_SPLIT_PCT: u128 = 75;

#[derive(Encode, Decode, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum PodTier {
    Standard = 0,
    Premium = 1,
    Elite = 2,
}

impl PodTier {
    pub fn from_u8(v: u8) -> Result<Self, &'static str> {
        match v {
            0 => Ok(PodTier::Standard),
            1 => Ok(PodTier::Premium),
            2 => Ok(PodTier::Elite),
            _ => Err("Invalid tier"),
        }
    }

    pub fn fee(&self) -> u128 {
        match self {
            PodTier::Standard => STANDARD_FEE,
            PodTier::Premium => PREMIUM_FEE,
            PodTier::Elite => ELITE_FEE,
        }
    }

    pub fn max_members(&self) -> u32 {
        match self {
            PodTier::Standard => 100,
            _ => u32::MAX,
        }
    }
}

#[derive(Encode, Decode, Clone)]
pub struct Pod {
    pub id: u64,
    pub name: String,
    pub min_balance: u128,
    pub creator: [u8; 32],
    pub created_at: u64,
    pub is_public: bool,
    pub tier: u8,
    pub max_members: u32,
    pub is_verified: bool,
}

#[derive(Encode, Decode, Clone)]
pub struct PodMessage {
    pub sender: [u8; 32],
    pub content: Vec<u8>,
    pub timestamp: u64,
}

#[derive(Encode, Decode, Clone, Default)]
pub struct FeeStats {
    pub total_treasury_received: u128,
    pub total_burned: u128,
    pub standard_pods_created: u64,
    pub premium_pods_created: u64,
    pub elite_pods_created: u64,
}

#[derive(Encode, Decode, Clone)]
pub struct ContractStorage {
    pub treasury_address: [u8; 32],
    pub fee_stats: FeeStats,
    pub next_pod_id: u64,
}

pub struct PodsContract;

impl PodsContract {
    /// Calculate the treasury/burn split for a given fee
    pub fn calculate_split(fee: u128) -> (u128, u128) {
        let treasury_amount = fee * TREASURY_SPLIT_PCT / 100;
        let burn_amount = fee * BURN_SPLIT_PCT / 100;
        (treasury_amount, burn_amount)
    }

    pub fn create_pod(
        id: u64,
        name: String,
        min_balance: u128,
        creator: [u8; 32],
        timestamp: u64,
        is_public: bool,
        tier_raw: u8,
        value: u128,
    ) -> Result<(Pod, u128, u128), &'static str> {
        if name.len() > 64 {
            return Err("Pod name exceeds maximum length of 64 characters");
        }

        let tier = PodTier::from_u8(tier_raw)?;
        let required_fee = tier.fee();

        if value < required_fee {
            return Err("Insufficient fee for selected tier");
        }

        let (treasury_amount, burn_amount) = Self::calculate_split(required_fee);

        let pod = Pod {
            id,
            name,
            min_balance,
            creator,
            created_at: timestamp,
            is_public,
            tier: tier_raw,
            max_members: tier.max_members(),
            is_verified: tier == PodTier::Elite,
        };

        // Returns pod + amounts so the caller can execute transfers
        Ok((pod, treasury_amount, burn_amount))
    }

    pub fn can_join(balance: u128, min_balance: u128) -> bool {
        balance >= min_balance
    }

    pub fn is_member(members: &[[u8; 32]], address: [u8; 32]) -> bool {
        members.contains(&address)
    }

    pub fn send_pod_message(
        sender: [u8; 32],
        content: Vec<u8>,
        timestamp: u64,
        members: &[[u8; 32]],
    ) -> Result<PodMessage, &'static str> {
        if !Self::is_member(members, sender) {
            return Err("Sender is not a member of this pod");
        }
        if content.len() > 4096 {
            return Err("Content exceeds maximum length of 4096 bytes");
        }

        Ok(PodMessage {
            sender,
            content,
            timestamp,
        })
    }

    pub fn get_public_pods(pods: &[Pod]) -> Vec<Pod> {
        pods.iter().filter(|p| p.is_public).cloned().collect()
    }

    pub fn set_treasury_address(
        storage: &mut ContractStorage,
        caller: [u8; 32],
        admin: [u8; 32],
        new_address: [u8; 32],
    ) -> Result<(), &'static str> {
        if caller != admin {
            return Err("Only admin can set treasury address");
        }
        storage.treasury_address = new_address;
        Ok(())
    }

    pub fn get_fee_stats(storage: &ContractStorage) -> FeeStats {
        storage.fee_stats.clone()
    }

    pub fn update_fee_stats(stats: &mut FeeStats, tier: PodTier, treasury: u128, burned: u128) {
        stats.total_treasury_received += treasury;
        stats.total_burned += burned;
        match tier {
            PodTier::Standard => stats.standard_pods_created += 1,
            PodTier::Premium => stats.premium_pods_created += 1,
            PodTier::Elite => stats.elite_pods_created += 1,
        }
    }
}
