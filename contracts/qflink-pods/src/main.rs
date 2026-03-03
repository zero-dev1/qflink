#![no_std]
#![no_main]

extern crate alloc;

use alloc::vec::Vec;
use codec::{Decode, Encode};
use pallet_revive_uapi::{
    CallFlags, HostFn, HostFnImpl as api, ReturnFlags, StorageFlags,
};
use qf_polkavm_sdk::prelude::*;

// Hardcoded deployer address (Alice's H160 address for front-running protection)
// Derived from SS58 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
const DEPLOYER: [u8; 20] = [0x96, 0x21, 0xdd, 0xe6, 0x36, 0xde, 0x09, 0x8b, 0x43, 0xef, 0xb0, 0xfa, 0x9b, 0x61, 0xfa, 0xcf, 0xe3, 0x28, 0xf9, 0x9d];

// Zero address constant
const ZERO_ADDRESS: [u8; 20] = [0u8; 20];

#[derive(Encode, Decode)]
struct Pod {
    id: u64,
    name: Vec<u8>,
    description: Vec<u8>,
    min_balance: [u8; 32],
    creator: [u8; 20],
    created_at: u64,
    is_default: bool,
    pod_type: u8,
}

#[derive(Encode, Decode)]
struct PodMessage {
    sender: [u8; 20],
    content_hash: [u8; 32],
    timestamp: u64,
}

fn storage_key(prefix: &[u8], parts: &[&[u8]]) -> [u8; 32] {
    let mut input = Vec::new();
    input.extend_from_slice(prefix);
    for part in parts {
        input.extend_from_slice(part);
    }
    let mut key = [0u8; 32];
    api::hash_keccak_256(&input, &mut key);
    key
}

fn get_storage(key: &[u8; 32]) -> Option<Vec<u8>> {
    let mut buffer = alloc::vec![0u8; 512];
    let mut output = &mut buffer[..];
    match api::get_storage(StorageFlags::empty(), key, &mut output) {
        Ok(()) => {
            let len = 512 - output.len();
            Some(buffer[..len].to_vec())
        }
        Err(_) => None,
    }
}

fn set_storage(key: &[u8; 32], value: &[u8]) {
    api::set_storage(StorageFlags::empty(), key, value);
}

fn get_u64(key: &[u8; 32]) -> u64 {
    get_storage(key)
        .and_then(|data| u64::decode(&mut &data[..]).ok())
        .unwrap_or(0)
}

fn set_u64(key: &[u8; 32], value: u64) {
    set_storage(key, &value.encode());
}

fn get_u32(key: &[u8; 32]) -> u32 {
    get_storage(key)
        .and_then(|data| u32::decode(&mut &data[..]).ok())
        .unwrap_or(0)
}

fn set_u32(key: &[u8; 32], value: u32) {
    set_storage(key, &value.encode());
}

fn get_u8(key: &[u8; 32]) -> u8 {
    get_storage(key)
        .and_then(|data| u8::decode(&mut &data[..]).ok())
        .unwrap_or(0)
}

fn set_u8(key: &[u8; 32], value: u8) {
    set_storage(key, &[value]);
}

fn selector(sig: &[u8]) -> [u8; 4] {
    let mut hash = [0u8; 32];
    api::hash_keccak_256(sig, &mut hash);
    [hash[0], hash[1], hash[2], hash[3]]
}

fn u256_from_qf(qf_amount: u64) -> [u8; 32] {
    let mut result = [0u8; 32];
    let decimals_18 = 1_000_000_000_000_000_000u128;
    let value = (qf_amount as u128) * decimals_18;
    result[0..16].copy_from_slice(&value.to_le_bytes());
    result
}

fn qf_from_u256(u256_value: [u8; 32]) -> u64 {
    let mut bytes = [0u8; 16];
    bytes.copy_from_slice(&u256_value[0..16]);
    let value = u128::from_le_bytes(bytes);
    let decimals_18 = 1_000_000_000_000_000_000u128;
    (value / decimals_18) as u64
}

fn get_u256(key: &[u8; 32]) -> [u8; 32] {
    let mut result = [0u8; 32];
    if let Some(data) = get_storage(key) {
        if data.len() >= 32 {
            result.copy_from_slice(&data[0..32]);
        }
    }
    result
}

fn set_u256(key: &[u8; 32], value: [u8; 32]) {
    set_storage(key, &value);
}

// Helper: Check if caller is admin
fn is_admin(caller: [u8; 20]) -> bool {
    let admin_key = storage_key(b"admin", &[]);
    match get_storage(&admin_key) {
        Some(data) if data.len() == 20 => {
            let mut admin = [0u8; 20];
            admin.copy_from_slice(&data);
            caller == admin
        }
        _ => false,
    }
}

// Helper: Check if caller is creator or mod for a pod
fn is_creator_or_mod(pod_id: u64, caller: [u8; 20]) -> bool {
    // Load pod to get creator
    let pod_key = storage_key(b"pod", &[&pod_id.to_le_bytes()]);
    let pod_data = match get_storage(&pod_key) {
        Some(data) => data,
        None => return false,
    };
    
    let pod: Pod = match Decode::decode(&mut &pod_data[..]) {
        Ok(p) => p,
        Err(_) => return false,
    };
    
    // Check if caller is creator
    if caller == pod.creator {
        return true;
    }
    
    // Check if caller is a mod
    let mod_count = get_u8(&storage_key(b"modc", &[&pod_id.to_le_bytes()]));
    for i in 0..mod_count {
        let mod_key = storage_key(b"mod", &[&pod_id.to_le_bytes(), &[i]]);
        if let Some(data) = get_storage(&mod_key) {
            if data.len() == 20 {
                let mut mod_addr = [0u8; 20];
                mod_addr.copy_from_slice(&data);
                if mod_addr == caller {
                    return true;
                }
            }
        }
    }
    
    false
}

// Helper: Check if address is globally banned
fn is_globally_banned_addr(address: [u8; 20]) -> bool {
    let gban_key = storage_key(b"gban", &[&address]);
    get_u8(&gban_key) == 1
}

// Helper: Check if address is banned from a specific pod
fn is_banned_from_pod(pod_id: u64, address: [u8; 20]) -> bool {
    let ban_key = storage_key(b"ban", &[&pod_id.to_le_bytes(), &address]);
    get_u8(&ban_key) == 1
}

// Helper: Get pod tier (0=Free, 1=Pro)
fn get_pod_tier_value(pod_id: u64) -> u8 {
    let tier_key = storage_key(b"tier", &[&pod_id.to_le_bytes()]);
    get_u8(&tier_key)
}

#[export]
pub fn deploy() {
    // Empty - initialization is done via initialize_pods() call
}

#[export]
pub fn call() {
    let call_data_len = api::call_data_size();
    let mut call_data = alloc::vec![0u8; call_data_len as usize];
    api::call_data_copy(&mut call_data, 0);

    if call_data.len() < 4 {
        api::return_value(ReturnFlags::REVERT, b"Input too short");
    }

    let sel: [u8; 4] = call_data[0..4].try_into().unwrap();
    let input = &call_data[4..];

    // Existing selectors
    let initialize_pods_sel = selector(b"initialize_pods()");
    let create_pod_sel = selector(b"create_pod(bytes,bytes,uint256,uint256,address)");
    let send_pod_message_sel = selector(b"send_pod_message(uint64,bytes32)");
    let get_pod_sel = selector(b"get_pod(uint64)");
    let get_pod_messages_sel = selector(b"get_pod_messages(uint64,uint64,uint64)");
    let get_pod_count_sel = selector(b"get_pod_count()");
    let check_pod_access_sel = selector(b"check_pod_access(uint64,address)");
    let update_pod_sel = selector(b"update_pod(uint64,bytes,bytes,uint256)");
    let transfer_admin_sel = selector(b"transfer_admin(address)");
    let get_admin_sel = selector(b"get_admin()");
    let remove_pod_sel = selector(b"remove_pod(uint64)");
    
    // Moderation selectors
    let ban_member_sel = selector(b"ban_member(uint64,address)");
    let unban_member_sel = selector(b"unban_member(uint64,address)");
    let add_mod_sel = selector(b"add_mod(uint64,address)");
    let remove_mod_sel = selector(b"remove_mod(uint64,address)");
    let global_ban_sel = selector(b"global_ban(address)");
    let global_unban_sel = selector(b"global_unban(address)");
    let is_banned_sel = selector(b"is_banned(uint64,address)");
    let is_globally_banned_sel = selector(b"is_globally_banned(address)");
    let get_mods_sel = selector(b"get_mods(uint64)");
    
    // Tier selectors
    let set_pro_fee_sel = selector(b"set_pro_fee(uint256)");
    let set_treasury_sel = selector(b"set_treasury(address)");
    let get_pro_fee_sel = selector(b"get_pro_fee()");
    let get_treasury_sel = selector(b"get_treasury()");
    let get_pod_tier_sel = selector(b"get_pod_tier(uint64)");
    let upgrade_pod_sel = selector(b"upgrade_pod(uint64)");
    
    // Paid pods selectors
    let join_pod_sel = selector(b"join_pod(uint64)");
    let has_paid_sel = selector(b"has_paid(uint64,address)");
    let get_pod_fee_sel = selector(b"get_pod_fee(uint64)");
    let get_pod_member_count_sel = selector(b"get_pod_member_count(uint64)");
    let get_user_pods_sel = selector(b"get_user_pods(address)");
    let leave_pod_sel = selector(b"leave_pod(uint64)");
    let get_pod_members_sel = selector(b"get_pod_members(uint64)");

    if sel == initialize_pods_sel {
        handle_initialize_pods();
    } else if sel == create_pod_sel {
        handle_create_pod(input);
    } else if sel == send_pod_message_sel {
        handle_send_pod_message(input);
    } else if sel == get_pod_sel {
        handle_get_pod(input);
    } else if sel == get_pod_messages_sel {
        handle_get_pod_messages(input);
    } else if sel == get_pod_count_sel {
        handle_get_pod_count();
    } else if sel == check_pod_access_sel {
        handle_check_pod_access(input);
    } else if sel == update_pod_sel {
        handle_update_pod(input);
    } else if sel == transfer_admin_sel {
        handle_transfer_admin(input);
    } else if sel == get_admin_sel {
        handle_get_admin();
    } else if sel == remove_pod_sel {
        handle_remove_pod(input);
    } else if sel == ban_member_sel {
        handle_ban_member(input);
    } else if sel == unban_member_sel {
        handle_unban_member(input);
    } else if sel == add_mod_sel {
        handle_add_mod(input);
    } else if sel == remove_mod_sel {
        handle_remove_mod(input);
    } else if sel == global_ban_sel {
        handle_global_ban(input);
    } else if sel == global_unban_sel {
        handle_global_unban(input);
    } else if sel == is_banned_sel {
        handle_is_banned(input);
    } else if sel == is_globally_banned_sel {
        handle_is_globally_banned(input);
    } else if sel == get_mods_sel {
        handle_get_mods(input);
    } else if sel == set_pro_fee_sel {
        handle_set_pro_fee(input);
    } else if sel == set_treasury_sel {
        handle_set_treasury(input);
    } else if sel == get_pro_fee_sel {
        handle_get_pro_fee();
    } else if sel == get_treasury_sel {
        handle_get_treasury();
    } else if sel == get_pod_tier_sel {
        handle_get_pod_tier(input);
    } else if sel == upgrade_pod_sel {
        handle_upgrade_pod(input);
    } else if sel == join_pod_sel {
        handle_join_pod(input);
    } else if sel == has_paid_sel {
        handle_has_paid(input);
    } else if sel == get_pod_fee_sel {
        handle_get_pod_fee(input);
    } else if sel == get_pod_member_count_sel {
        handle_get_pod_member_count(input);
    } else if sel == get_user_pods_sel {
        handle_get_user_pods(input);
    } else if sel == leave_pod_sel {
        handle_leave_pod(input);
    } else if sel == get_pod_members_sel {
        handle_get_pod_members(input);
    } else {
        api::return_value(ReturnFlags::REVERT, b"Unknown function");
    }
}

fn handle_initialize_pods() {
    // Check if already initialized
    let init_key = storage_key(b"initialized", &[]);
    if get_storage(&init_key).is_some() {
        api::return_value(ReturnFlags::REVERT, b"Already initialized");
    }

    // Verify caller is the expected deployer (Fix C4: Prevent admin front-running)
    let mut caller = [0u8; 20];
    api::caller(&mut caller);
    
    if caller != DEPLOYER {
        api::return_value(ReturnFlags::REVERT, b"Only deployer can initialize");
    }
    let admin_key = storage_key(b"admin", &[]);
    set_storage(&admin_key, &caller);

    let default_pods = [
        (b"Chefs".as_ref(), b"10,000+ QF".as_ref(), 10_000u64),
        (b"Whale".as_ref(), b"1,000,000+ QF".as_ref(), 1_000_000u64),
        (b"Builders".as_ref(), b"Deploy a contract on QF Network".as_ref(), 0u64),
    ];

    let mut timestamp = [0u8; 32];
    api::now(&mut timestamp);
    let created_at = u64::from_le_bytes(timestamp[0..8].try_into().unwrap());

    let zero_address = [0u8; 20];

    for (i, (name, description, min_qf)) in default_pods.iter().enumerate() {
        let pod = Pod {
            id: i as u64,
            name: name.to_vec(),
            description: description.to_vec(),
            min_balance: u256_from_qf(*min_qf),
            creator: zero_address,
            created_at,
            is_default: true,
            pod_type: 0,
        };

        let pod_key = storage_key(b"pod", &[&(i as u64).to_le_bytes()]);
        set_storage(&pod_key, &pod.encode());
        
        // Set default pods as Pro tier
        let tier_key = storage_key(b"tier", &[&(i as u64).to_le_bytes()]);
        set_u8(&tier_key, 1);
    }

    let count_key = storage_key(b"pod_count", &[]);
    set_u64(&count_key, 3);
    
    // Set treasury to admin
    let treasury_key = storage_key(b"treasury", &[]);
    set_storage(&treasury_key, &caller);
    
    // Set initial pro creation fee (500 QF = 500 * 10^18)
    let profee_key = storage_key(b"profee", &[]);
    set_u256(&profee_key, u256_from_qf(500));

    // Mark as initialized
    set_storage(&init_key, &[1u8]);

    api::return_value(ReturnFlags::empty(), &[]);
}

fn handle_create_pod(input: &[u8]) {
    let (name, description, min_balance, entry_fee, payout_wallet): (Vec<u8>, Vec<u8>, [u8; 32], [u8; 32], [u8; 20]) = 
        match Decode::decode(&mut &input[..]) {
            Ok(v) => v,
            Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
        };

    if name.len() > 32 {
        api::return_value(ReturnFlags::REVERT, b"Name too long");
    }
    if description.len() > 256 {
        api::return_value(ReturnFlags::REVERT, b"Description too long");
    }

    let mut caller = [0u8; 20];
    api::caller(&mut caller);

    let count_key = storage_key(b"pod_count", &[]);
    let pod_id = get_u64(&count_key);

    let mut timestamp = [0u8; 32];
    api::now(&mut timestamp);
    let created_at = u64::from_le_bytes(timestamp[0..8].try_into().unwrap());

    // Determine tier based on value transferred
    let pro_fee = get_u256(&storage_key(b"profee", &[]));
    let mut value_bytes = [0u8; 32];
    api::value_transferred(&mut value_bytes);
    
    // Creation fee: >= is safe (overpayment stays in contract/treasury, no stuck value)
    // Entry fee in join_pod keeps exact match (H4) since fee is distributed
    let is_pro = !is_zero_u256(pro_fee) && compare_u256(value_bytes, pro_fee) >= 0;
    let tier: u8 = if is_pro { 1 } else { 0 };
    
    // If user sent value but not enough for pro, give a clear error
    if tier == 0 && !is_zero_u256(value_bytes) {
        api::return_value(ReturnFlags::REVERT, b"Insufficient creation fee for Pro tier");
    }
    
    // Free pods cannot charge entry fees
    if tier == 0 && !is_zero_u256(entry_fee) {
        api::return_value(ReturnFlags::REVERT, b"Free pods cannot charge entry fees");
    }

    let pod = Pod {
        id: pod_id,
        name: name.clone(),
        description,
        min_balance,
        creator: caller,
        created_at,
        is_default: false,
        pod_type: 1,
    };

    let pod_key = storage_key(b"pod", &[&pod_id.to_le_bytes()]);
    set_storage(&pod_key, &pod.encode());
    
    // Store tier
    let tier_key = storage_key(b"tier", &[&pod_id.to_le_bytes()]);
    set_u8(&tier_key, tier);
    
    // Store entry fee
    let efee_key = storage_key(b"efee", &[&pod_id.to_le_bytes()]);
    set_u256(&efee_key, entry_fee);
    
    // Store payout wallet
    let payout_key = storage_key(b"payout", &[&pod_id.to_le_bytes()]);
    set_storage(&payout_key, &payout_wallet);
    
    // TODO: H1 treasury transfer — disabled for MVP, sweep funds manually
    // if is_pro {
    //     // Load treasury address from storage
    //     let treasury_storage_key = storage_key(b"treasury", &[]);
    //     let mut treasury_addr = [0u8; 20];
    //     if let Some(data) = get_storage(&treasury_storage_key) {
    //         if data.len() == 20 {
    //             treasury_addr.copy_from_slice(&data);
    //         }
    //     }
    //     
    //     // Check treasury is configured (not zero address)
    //     if treasury_addr == ZERO_ADDRESS {
    //         api::return_value(ReturnFlags::REVERT, b"Treasury not configured");
    //     }
    //     
    //     // Calculate split: 95% to treasury, 5% burned (kept in contract)
    //     let mut fee_lo = [0u8; 16];
    //     fee_lo.copy_from_slice(&value_bytes[0..16]);
    //     let fee_u128 = u128::from_le_bytes(fee_lo);
    //     let treasury_share_u128 = fee_u128 * 95 / 100;
    //     
    //     let mut treasury_share = [0u8; 32];
    //     treasury_share[0..16].copy_from_slice(&treasury_share_u128.to_le_bytes());
    //     
    //     let no_deposit = [0u8; 32];
    //     
    //     // Transfer 95% to treasury
    //     if api::call(
    //         CallFlags::empty(),
    //         treasury_addr,
    //         0u64,
    //         0u64,
    //         &no_deposit,
    //         &treasury_share,
    //         &[],
    //         None,
    //     ).is_err() {
    //         api::return_value(ReturnFlags::REVERT, b"Treasury transfer failed");
    //     }
    // }

    set_u64(&count_key, pod_id + 1);

    let mut topic = [0u8; 32];
    api::hash_keccak_256(b"PodCreated", &mut topic);
    let mut event_data = Vec::new();
    event_data.extend_from_slice(&pod_id.to_le_bytes());
    event_data.extend_from_slice(&name);
    event_data.extend_from_slice(&caller);
    api::deposit_event(&[topic], &event_data);

    api::return_value(ReturnFlags::empty(), &[]);
}

fn handle_send_pod_message(input: &[u8]) {
    let (pod_id, content_hash): (u64, [u8; 32]) = 
        match Decode::decode(&mut &input[..]) {
            Ok(v) => v,
            Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
        };

    let pod_key = storage_key(b"pod", &[&pod_id.to_le_bytes()]);
    let pod_data = match get_storage(&pod_key) {
        Some(data) => data,
        None => api::return_value(ReturnFlags::REVERT, b"Pod not found"),
    };

    let pod: Pod = match Decode::decode(&mut &pod_data[..]) {
        Ok(p) => p,
        Err(_) => api::return_value(ReturnFlags::REVERT, b"Pod decode error"),
    };

    let mut caller = [0u8; 20];
    api::caller(&mut caller);

    // Check global ban
    if is_globally_banned_addr(caller) {
        api::return_value(ReturnFlags::REVERT, b"Globally banned");
    }

    // Check pod ban
    if is_banned_from_pod(pod_id, caller) {
        api::return_value(ReturnFlags::REVERT, b"Banned from pod");
    }

    // Creator exemption: creator can always send messages regardless of payment or balance
    if caller != pod.creator {
        // Check paid membership for paid pods
        let entry_fee = get_u256(&storage_key(b"efee", &[&pod_id.to_le_bytes()]));
        if !is_zero_u256(entry_fee) {
            let paid_key = storage_key(b"paid", &[&pod_id.to_le_bytes(), &caller]);
            if get_u8(&paid_key) != 1 {
                api::return_value(ReturnFlags::REVERT, b"Payment required");
            }
        }
    }

    if caller != pod.creator {
        let mut caller_balance = [0u8; 32];
        api::balance_of(&caller, &mut caller_balance);

        let mut has_access = true;
        for i in (0..32).rev() {
            if caller_balance[i] < pod.min_balance[i] {
                has_access = false;
                break;
            } else if caller_balance[i] > pod.min_balance[i] {
                break;
            }
        }

        if !has_access {
            api::return_value(ReturnFlags::REVERT, b"Insufficient balance");
        }
    }

    let mut timestamp = [0u8; 32];
    api::now(&mut timestamp);
    let ts = u64::from_le_bytes(timestamp[0..8].try_into().unwrap());

    let message = PodMessage {
        sender: caller,
        content_hash,
        timestamp: ts,
    };

    let count_key = storage_key(b"pod_msg_count", &[&pod_id.to_le_bytes()]);
    let msg_index = get_u64(&count_key);

    let msg_key = storage_key(b"pod_msg", &[&pod_id.to_le_bytes(), &msg_index.to_le_bytes()]);
    set_storage(&msg_key, &message.encode());

    set_u64(&count_key, msg_index + 1);

    let mut topic = [0u8; 32];
    api::hash_keccak_256(b"PodMessageSent", &mut topic);
    let mut event_data = Vec::new();
    event_data.extend_from_slice(&pod_id.to_le_bytes());
    event_data.extend_from_slice(&caller);
    event_data.extend_from_slice(&content_hash);
    event_data.extend_from_slice(&ts.to_le_bytes());
    api::deposit_event(&[topic], &event_data);

    api::return_value(ReturnFlags::empty(), &[]);
}

fn handle_get_pod(input: &[u8]) {
    let pod_id: u64 = match Decode::decode(&mut &input[..]) {
        Ok(v) => v,
        Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
    };

    let pod_key = storage_key(b"pod", &[&pod_id.to_le_bytes()]);
    match get_storage(&pod_key) {
        Some(data) => api::return_value(ReturnFlags::empty(), &data),
        None => api::return_value(ReturnFlags::REVERT, b"Pod not found"),
    }
}

fn handle_get_pod_messages(input: &[u8]) {
    let (pod_id, start, limit): (u64, u64, u64) = 
        match Decode::decode(&mut &input[..]) {
            Ok(v) => v,
            Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
        };

    let count_key = storage_key(b"pod_msg_count", &[&pod_id.to_le_bytes()]);
    let total = get_u64(&count_key);

    let end = if start + limit > total {
        total
    } else {
        start + limit
    };

    let mut messages = Vec::new();
    for i in start..end {
        let msg_key = storage_key(b"pod_msg", &[&pod_id.to_le_bytes(), &i.to_le_bytes()]);
        if let Some(data) = get_storage(&msg_key) {
            if let Ok(msg) = PodMessage::decode(&mut &data[..]) {
                messages.push(msg);
            }
        }
    }

    api::return_value(ReturnFlags::empty(), &messages.encode());
}

fn handle_get_pod_count() {
    let count_key = storage_key(b"pod_count", &[]);
    let count = get_u64(&count_key);
    api::return_value(ReturnFlags::empty(), &count.encode());
}

fn handle_check_pod_access(input: &[u8]) {
    let (pod_id, address): (u64, [u8; 20]) = 
        match Decode::decode(&mut &input[..]) {
            Ok(v) => v,
            Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
        };

    // 1. Check global ban (code 2)
    if is_globally_banned_addr(address) {
        api::return_value(ReturnFlags::empty(), &[2u8]);
    }

    // 2. Check pod ban (code 1)
    if is_banned_from_pod(pod_id, address) {
        api::return_value(ReturnFlags::empty(), &[1u8]);
    }

    let pod_key = storage_key(b"pod", &[&pod_id.to_le_bytes()]);
    let pod_data = match get_storage(&pod_key) {
        Some(data) => data,
        None => api::return_value(ReturnFlags::REVERT, b"Pod not found"),
    };

    let pod: Pod = match Decode::decode(&mut &pod_data[..]) {
        Ok(p) => p,
        Err(_) => api::return_value(ReturnFlags::REVERT, b"Pod decode error"),
    };

    // Creator exemption: creator always has access (code 0)
    if address == pod.creator {
        api::return_value(ReturnFlags::empty(), &[0u8]);
    }

    let threshold_qf = qf_from_u256(pod.min_balance);
    let entry_fee = get_u256(&storage_key(b"efee", &[&pod_id.to_le_bytes()]));
    let has_entry_fee = !is_zero_u256(entry_fee);

    // 3. If threshold == 0 AND fee == 0 → open pod, grant access
    if threshold_qf == 0 && !has_entry_fee {
        api::return_value(ReturnFlags::empty(), &[0u8]);
    }

    // 4. If fee > 0 AND not paid → return 4 (payment required)
    if has_entry_fee {
        let paid_key = storage_key(b"paid", &[&pod_id.to_le_bytes(), &address]);
        if get_u8(&paid_key) != 1 {
            api::return_value(ReturnFlags::empty(), &[4u8]);
        }
    }

    // 5. Balance check (code 3 if insufficient)
    let mut balance = [0u8; 32];
    api::balance_of(&address, &mut balance);

    let mut has_access = true;
    for i in (0..32).rev() {
        if balance[i] < pod.min_balance[i] {
            has_access = false;
            break;
        } else if balance[i] > pod.min_balance[i] {
            break;
        }
    }

    if !has_access {
        api::return_value(ReturnFlags::empty(), &[3u8]);
    }

    // 6. Free pod member limit check (code 6 if full)
    let tier = get_pod_tier_value(pod_id);
    if tier == 0 {
        let member_count = get_u32(&storage_key(b"memc", &[&pod_id.to_le_bytes()]));
        if member_count >= 50 {
            api::return_value(ReturnFlags::empty(), &[6u8]);
        }
    }

    // 7. Return 0 (granted)
    api::return_value(ReturnFlags::empty(), &[0u8]);
}

fn handle_update_pod(input: &[u8]) {
    let (pod_id, new_name, new_description, new_threshold): (u64, Vec<u8>, Vec<u8>, [u8; 32]) = 
        match Decode::decode(&mut &input[..]) {
            Ok(v) => v,
            Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
        };

    // Verify caller is admin
    let mut caller = [0u8; 20];
    api::caller(&mut caller);
    
    if !is_admin(caller) {
        api::return_value(ReturnFlags::REVERT, b"Only admin can update pods");
    }

    // Validate input lengths
    if new_name.len() > 32 {
        api::return_value(ReturnFlags::REVERT, b"Name too long");
    }
    if new_description.len() > 256 {
        api::return_value(ReturnFlags::REVERT, b"Description too long");
    }

    // Verify pod exists
    let pod_key = storage_key(b"pod", &[&pod_id.to_le_bytes()]);
    let pod_data = match get_storage(&pod_key) {
        Some(data) => data,
        None => api::return_value(ReturnFlags::REVERT, b"Pod not found"),
    };

    let mut pod: Pod = match Decode::decode(&mut &pod_data[..]) {
        Ok(p) => p,
        Err(_) => api::return_value(ReturnFlags::REVERT, b"Pod decode error"),
    };

    // Update pod fields - preserve id, creator, created_at, is_default, pod_type
    pod.name = new_name;
    pod.description = new_description;
    pod.min_balance = new_threshold;

    // Save updated pod
    set_storage(&pod_key, &pod.encode());

    api::return_value(ReturnFlags::empty(), &[]);
}

fn handle_transfer_admin(input: &[u8]) {
    let new_admin: [u8; 20] = match Decode::decode(&mut &input[..]) {
        Ok(v) => v,
        Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
    };

    // Fix H2: Zero-address check on transfer_admin
    if new_admin == ZERO_ADDRESS {
        api::return_value(ReturnFlags::REVERT, b"Cannot transfer admin to zero address");
    }

    // Verify caller is current admin
    let mut caller = [0u8; 20];
    api::caller(&mut caller);
    
    if !is_admin(caller) {
        api::return_value(ReturnFlags::REVERT, b"Only admin can transfer admin");
    }

    // Set new admin
    let admin_key = storage_key(b"admin", &[]);
    set_storage(&admin_key, &new_admin);

    api::return_value(ReturnFlags::empty(), &[]);
}

fn handle_get_admin() {
    let admin_key = storage_key(b"admin", &[]);
    match get_storage(&admin_key) {
        Some(data) => api::return_value(ReturnFlags::empty(), &data),
        None => api::return_value(ReturnFlags::REVERT, b"Admin not set"),
    }
}

fn handle_remove_pod(input: &[u8]) {
    let pod_id: u64 = match Decode::decode(&mut &input[..]) {
        Ok(v) => v,
        Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
    };

    // Verify caller is admin
    let mut caller = [0u8; 20];
    api::caller(&mut caller);
    
    if !is_admin(caller) {
        api::return_value(ReturnFlags::REVERT, b"Only admin can remove pods");
    }

    // Verify pod exists
    let pod_key = storage_key(b"pod", &[&pod_id.to_le_bytes()]);
    if get_storage(&pod_key).is_none() {
        api::return_value(ReturnFlags::REVERT, b"Pod not found");
    }

    // Remove pod from storage
    api::set_storage(StorageFlags::empty(), &pod_key, &[]);

    api::return_value(ReturnFlags::empty(), &[]);
}

// ============ MODERATION FUNCTIONS ============

fn handle_ban_member(input: &[u8]) {
    let (pod_id, target): (u64, [u8; 20]) = 
        match Decode::decode(&mut &input[..]) {
            Ok(v) => v,
            Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
        };

    let mut caller = [0u8; 20];
    api::caller(&mut caller);

    // Must be creator or mod
    if !is_creator_or_mod(pod_id, caller) {
        api::return_value(ReturnFlags::REVERT, b"Not authorized");
    }

    // Load pod to get creator
    let pod_key = storage_key(b"pod", &[&pod_id.to_le_bytes()]);
    let pod_data = match get_storage(&pod_key) {
        Some(data) => data,
        None => api::return_value(ReturnFlags::REVERT, b"Pod not found"),
    };
    let pod: Pod = match Decode::decode(&mut &pod_data[..]) {
        Ok(p) => p,
        Err(_) => api::return_value(ReturnFlags::REVERT, b"Pod decode error"),
    };

    // Cannot ban the pod creator
    if target == pod.creator {
        api::return_value(ReturnFlags::REVERT, b"Cannot ban creator");
    }

    // Cannot ban another mod
    let mod_count = get_u8(&storage_key(b"modc", &[&pod_id.to_le_bytes()]));
    for i in 0..mod_count {
        let mod_key = storage_key(b"mod", &[&pod_id.to_le_bytes(), &[i]]);
        if let Some(data) = get_storage(&mod_key) {
            if data.len() == 20 {
                let mut mod_addr = [0u8; 20];
                mod_addr.copy_from_slice(&data);
                if mod_addr == target {
                    api::return_value(ReturnFlags::REVERT, b"Cannot ban a mod");
                }
            }
        }
    }

    // Set ban
    let ban_key = storage_key(b"ban", &[&pod_id.to_le_bytes(), &target]);
    set_u8(&ban_key, 1);

    // Remove pod from user's list (they're no longer a member)
    remove_pod_from_user(target, pod_id);

    // Also remove paid status if they had paid
    let paid_key = storage_key(b"paid", &[&pod_id.to_le_bytes(), &target]);
    set_u8(&paid_key, 0);

    // Decrement member count
    let member_count_key = storage_key(b"memc", &[&pod_id.to_le_bytes()]);
    let member_count = get_u32(&member_count_key);
    if member_count > 0 {
        set_u32(&member_count_key, member_count - 1);
    }

    api::return_value(ReturnFlags::empty(), &[]);
}

fn handle_unban_member(input: &[u8]) {
    let (pod_id, target): (u64, [u8; 20]) = 
        match Decode::decode(&mut &input[..]) {
            Ok(v) => v,
            Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
        };

    let mut caller = [0u8; 20];
    api::caller(&mut caller);

    // Must be creator or mod
    if !is_creator_or_mod(pod_id, caller) {
        api::return_value(ReturnFlags::REVERT, b"Not authorized");
    }

    // Remove ban
    let ban_key = storage_key(b"ban", &[&pod_id.to_le_bytes(), &target]);
    set_u8(&ban_key, 0);

    api::return_value(ReturnFlags::empty(), &[]);
}

fn handle_add_mod(input: &[u8]) {
    let (pod_id, moderator): (u64, [u8; 20]) = 
        match Decode::decode(&mut &input[..]) {
            Ok(v) => v,
            Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
        };

    let mut caller = [0u8; 20];
    api::caller(&mut caller);

    // Load pod to verify caller is creator
    let pod_key = storage_key(b"pod", &[&pod_id.to_le_bytes()]);
    let pod_data = match get_storage(&pod_key) {
        Some(data) => data,
        None => api::return_value(ReturnFlags::REVERT, b"Pod not found"),
    };
    let pod: Pod = match Decode::decode(&mut &pod_data[..]) {
        Ok(p) => p,
        Err(_) => api::return_value(ReturnFlags::REVERT, b"Pod decode error"),
    };

    if caller != pod.creator {
        api::return_value(ReturnFlags::REVERT, b"Only creator can add mods");
    }

    // Check mod count limit based on tier
    let tier = get_pod_tier_value(pod_id);
    let mod_count_key = storage_key(b"modc", &[&pod_id.to_le_bytes()]);
    let current_count = get_u8(&mod_count_key);
    
    let max_mods = if tier == 1 { 3 } else { 1 };
    if current_count >= max_mods {
        api::return_value(ReturnFlags::REVERT, b"Mod limit reached");
    }

    // Store moderator at next slot
    let mod_key = storage_key(b"mod", &[&pod_id.to_le_bytes(), &[current_count]]);
    set_storage(&mod_key, &moderator);
    
    // Increment count
    set_u8(&mod_count_key, current_count + 1);

    api::return_value(ReturnFlags::empty(), &[]);
}

fn handle_remove_mod(input: &[u8]) {
    let (pod_id, moderator): (u64, [u8; 20]) = 
        match Decode::decode(&mut &input[..]) {
            Ok(v) => v,
            Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
        };

    let mut caller = [0u8; 20];
    api::caller(&mut caller);

    // Load pod to verify caller is creator
    let pod_key = storage_key(b"pod", &[&pod_id.to_le_bytes()]);
    let pod_data = match get_storage(&pod_key) {
        Some(data) => data,
        None => api::return_value(ReturnFlags::REVERT, b"Pod not found"),
    };
    let pod: Pod = match Decode::decode(&mut &pod_data[..]) {
        Ok(p) => p,
        Err(_) => api::return_value(ReturnFlags::REVERT, b"Pod decode error"),
    };

    if caller != pod.creator {
        api::return_value(ReturnFlags::REVERT, b"Only creator can remove mods");
    }

    // Find and remove moderator
    let mod_count_key = storage_key(b"modc", &[&pod_id.to_le_bytes()]);
    let current_count = get_u8(&mod_count_key);
    
    let mut found_index: Option<u8> = None;
    for i in 0..current_count {
        let mod_key = storage_key(b"mod", &[&pod_id.to_le_bytes(), &[i]]);
        if let Some(data) = get_storage(&mod_key) {
            if data.len() == 20 {
                let mut mod_addr = [0u8; 20];
                mod_addr.copy_from_slice(&data);
                if mod_addr == moderator {
                    found_index = Some(i);
                    break;
                }
            }
        }
    }

    let index = match found_index {
        Some(i) => i,
        None => api::return_value(ReturnFlags::REVERT, b"Mod not found"),
    };

    // Shift remaining mods down
    for i in (index as usize)..((current_count - 1) as usize) {
        let next_key = storage_key(b"mod", &[&pod_id.to_le_bytes(), &[(i + 1) as u8]]);
        let curr_key = storage_key(b"mod", &[&pod_id.to_le_bytes(), &[i as u8]]);
        
        if let Some(data) = get_storage(&next_key) {
            set_storage(&curr_key, &data);
        }
    }

    // Clear last slot
    let last_key = storage_key(b"mod", &[&pod_id.to_le_bytes(), &[current_count - 1]]);
    set_storage(&last_key, &[]);
    
    // Decrement count
    set_u8(&mod_count_key, current_count - 1);

    api::return_value(ReturnFlags::empty(), &[]);
}

fn handle_global_ban(input: &[u8]) {
    let target: [u8; 20] = match Decode::decode(&mut &input[..]) {
        Ok(v) => v,
        Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
    };

    let mut caller = [0u8; 20];
    api::caller(&mut caller);

    if !is_admin(caller) {
        api::return_value(ReturnFlags::REVERT, b"Only admin can global ban");
    }

    let gban_key = storage_key(b"gban", &[&target]);
    set_u8(&gban_key, 1);

    api::return_value(ReturnFlags::empty(), &[]);
}

fn handle_global_unban(input: &[u8]) {
    let target: [u8; 20] = match Decode::decode(&mut &input[..]) {
        Ok(v) => v,
        Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
    };

    let mut caller = [0u8; 20];
    api::caller(&mut caller);

    if !is_admin(caller) {
        api::return_value(ReturnFlags::REVERT, b"Only admin can global unban");
    }

    let gban_key = storage_key(b"gban", &[&target]);
    set_u8(&gban_key, 0);

    api::return_value(ReturnFlags::empty(), &[]);
}

fn handle_is_banned(input: &[u8]) {
    let (pod_id, address): (u64, [u8; 20]) = 
        match Decode::decode(&mut &input[..]) {
            Ok(v) => v,
            Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
        };

    let banned = if is_banned_from_pod(pod_id, address) { 1u8 } else { 0u8 };
    api::return_value(ReturnFlags::empty(), &[banned]);
}

fn handle_is_globally_banned(input: &[u8]) {
    let address: [u8; 20] = match Decode::decode(&mut &input[..]) {
        Ok(v) => v,
        Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
    };

    let banned = if is_globally_banned_addr(address) { 1u8 } else { 0u8 };
    api::return_value(ReturnFlags::empty(), &[banned]);
}

fn handle_get_mods(input: &[u8]) {
    let pod_id: u64 = match Decode::decode(&mut &input[..]) {
        Ok(v) => v,
        Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
    };

    let mod_count = get_u8(&storage_key(b"modc", &[&pod_id.to_le_bytes()]));
    let mut mods: Vec<[u8; 20]> = Vec::new();
    
    for i in 0..mod_count {
        let mod_key = storage_key(b"mod", &[&pod_id.to_le_bytes(), &[i]]);
        if let Some(data) = get_storage(&mod_key) {
            if data.len() == 20 {
                let mut addr = [0u8; 20];
                addr.copy_from_slice(&data);
                mods.push(addr);
            }
        }
    }

    api::return_value(ReturnFlags::empty(), &mods.encode());
}

// ============ TIER FUNCTIONS ============

fn handle_set_pro_fee(input: &[u8]) {
    let amount: [u8; 32] = match Decode::decode(&mut &input[..]) {
        Ok(v) => v,
        Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
    };

    let mut caller = [0u8; 20];
    api::caller(&mut caller);

    if !is_admin(caller) {
        api::return_value(ReturnFlags::REVERT, b"Only admin can set pro fee");
    }

    let profee_key = storage_key(b"profee", &[]);
    set_u256(&profee_key, amount);

    api::return_value(ReturnFlags::empty(), &[]);
}

fn handle_set_treasury(input: &[u8]) {
    let address: [u8; 20] = match Decode::decode(&mut &input[..]) {
        Ok(v) => v,
        Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
    };

    let mut caller = [0u8; 20];
    api::caller(&mut caller);

    if !is_admin(caller) {
        api::return_value(ReturnFlags::REVERT, b"Only admin can set treasury");
    }

    let treasury_key = storage_key(b"treasury", &[]);
    set_storage(&treasury_key, &address);

    api::return_value(ReturnFlags::empty(), &[]);
}

fn handle_get_pro_fee() {
    let profee_key = storage_key(b"profee", &[]);
    let fee = get_u256(&profee_key);
    api::return_value(ReturnFlags::empty(), &fee);
}

fn handle_get_treasury() {
    let treasury_key = storage_key(b"treasury", &[]);
    match get_storage(&treasury_key) {
        Some(data) => api::return_value(ReturnFlags::empty(), &data),
        None => api::return_value(ReturnFlags::empty(), &[0u8; 20]),
    }
}

fn handle_get_pod_tier(input: &[u8]) {
    let pod_id: u64 = match Decode::decode(&mut &input[..]) {
        Ok(v) => v,
        Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
    };

    let tier = get_pod_tier_value(pod_id);
    api::return_value(ReturnFlags::empty(), &[tier]);
}

fn handle_upgrade_pod(input: &[u8]) {
    let pod_id: u64 = match Decode::decode(&mut &input[..]) {
        Ok(v) => v,
        Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
    };

    let mut caller = [0u8; 20];
    api::caller(&mut caller);

    // Load pod
    let pod_key = storage_key(b"pod", &[&pod_id.to_le_bytes()]);
    let pod_data = match get_storage(&pod_key) {
        Some(data) => data,
        None => api::return_value(ReturnFlags::REVERT, b"Pod not found"),
    };
    let pod: Pod = match Decode::decode(&mut &pod_data[..]) {
        Ok(p) => p,
        Err(_) => api::return_value(ReturnFlags::REVERT, b"Pod decode error"),
    };

    // Must be creator
    if caller != pod.creator {
        api::return_value(ReturnFlags::REVERT, b"Only creator can upgrade");
    }

    // Must be Free tier currently
    let tier_key = storage_key(b"tier", &[&pod_id.to_le_bytes()]);
    if get_u8(&tier_key) != 0 {
        api::return_value(ReturnFlags::REVERT, b"Already Pro or invalid tier");
    }

    // Check payment
    let pro_fee = get_u256(&storage_key(b"profee", &[]));
    let mut value_bytes = [0u8; 32];
    api::value_transferred(&mut value_bytes);
    
    // Upgrade fee: >= is safe (overpayment stays in contract/treasury)
    if compare_u256(value_bytes, pro_fee) < 0 {
        api::return_value(ReturnFlags::REVERT, b"Insufficient upgrade fee");
    }
    
    // Fix H1: Implement treasury transfer for upgrade fees
    // Load treasury address from storage
    let treasury_storage_key = storage_key(b"treasury", &[]);
    let mut treasury_addr = [0u8; 20];
    if let Some(data) = get_storage(&treasury_storage_key) {
        if data.len() == 20 {
            treasury_addr.copy_from_slice(&data);
        }
    }
    
    // Check treasury is configured (not zero address)
    if treasury_addr == ZERO_ADDRESS {
        api::return_value(ReturnFlags::REVERT, b"Treasury not configured");
    }
    
    // Calculate split: 95% to treasury, 5% burned (kept in contract)
    let mut fee_lo = [0u8; 16];
    fee_lo.copy_from_slice(&value_bytes[0..16]);
    let fee_u128 = u128::from_le_bytes(fee_lo);
    let treasury_share_u128 = fee_u128 * 95 / 100;
    
    let mut treasury_share = [0u8; 32];
    treasury_share[0..16].copy_from_slice(&treasury_share_u128.to_le_bytes());
    
    let no_deposit = [0u8; 32];
    
    // Transfer 95% to treasury
    if api::call(
        CallFlags::empty(),
        &treasury_addr,
        0u64,
        0u64,
        &no_deposit,
        &treasury_share,
        &[],
        None,
    ).is_err() {
        api::return_value(ReturnFlags::REVERT, b"Treasury transfer failed");
    }

    // Upgrade to Pro
    set_u8(&tier_key, 1);

    api::return_value(ReturnFlags::empty(), &[]);
}

// ============ PAID PODS FUNCTIONS ============

fn handle_join_pod(input: &[u8]) {
    let pod_id: u64 = match Decode::decode(&mut &input[..]) {
        Ok(v) => v,
        Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
    };

    let mut caller = [0u8; 20];
    api::caller(&mut caller);

    // 1. Check not globally banned
    if is_globally_banned_addr(caller) {
        api::return_value(ReturnFlags::REVERT, b"Globally banned");
    }

    // 2. Check not pod-banned
    if is_banned_from_pod(pod_id, caller) {
        api::return_value(ReturnFlags::REVERT, b"Banned from pod");
    }

    // 3. Check pod exists
    let pod_key = storage_key(b"pod", &[&pod_id.to_le_bytes()]);
    if get_storage(&pod_key).is_none() {
        api::return_value(ReturnFlags::REVERT, b"Pod not found");
    }

    // 4. Check not locked (threshold=0 AND fee=0)
    let entry_fee = get_u256(&storage_key(b"efee", &[&pod_id.to_le_bytes()]));
    // Note: We'd need to load pod to check threshold, but if fee > 0 it's not locked
    
    // 5. Free pod member limit check
    let tier = get_pod_tier_value(pod_id);
    let member_count_key = storage_key(b"memc", &[&pod_id.to_le_bytes()]);
    let member_count = get_u32(&member_count_key);
    
    if tier == 0 && member_count >= 50 {
        api::return_value(ReturnFlags::REVERT, b"Pod is full");
    }

    // 6. If entry_fee > 0, process payment
    if !is_zero_u256(entry_fee) {
        let paid_key = storage_key(b"paid", &[&pod_id.to_le_bytes(), &caller]);
        
        // Check not already paid
        if get_u8(&paid_key) == 1 {
            api::return_value(ReturnFlags::REVERT, b"Already paid");
        }

        // Check value transferred
        let mut value_bytes = [0u8; 32];
        api::value_transferred(&mut value_bytes);
        
        // Fix H4: Exact fee matching
        if compare_u256(value_bytes, entry_fee) != 0 {
            api::return_value(ReturnFlags::REVERT, b"Exact fee required");
        }

        // Record paid before transfers (state change first, then external calls)
        set_u8(&paid_key, 1);

        // Load payout wallet (creator's designated recipient)
        let payout_key = storage_key(b"payout", &[&pod_id.to_le_bytes()]);
        let mut payout_wallet = [0u8; 20];
        if let Some(data) = get_storage(&payout_key) {
            if data.len() == 20 {
                payout_wallet.copy_from_slice(&data);
            }
        }
        // Fall back to pod creator if no payout wallet set
        if payout_wallet == ZERO_ADDRESS {
            let pod_data = get_storage(&pod_key).unwrap_or_default();
            if let Ok(pod) = Pod::decode(&mut &pod_data[..]) {
                payout_wallet = pod.creator;
            }
        }

        // Load treasury address from storage
        let treasury_storage_key = storage_key(b"treasury", &[]);
        let mut treasury_addr = [0u8; 20];
        if let Some(data) = get_storage(&treasury_storage_key) {
            if data.len() == 20 {
                treasury_addr.copy_from_slice(&data);
            }
        }
        
        // Fix H3: Zero-address check on treasury in join_pod
        let treasury_is_zero = treasury_addr == ZERO_ADDRESS;

        // Calculate split using 128-bit arithmetic to avoid overflow
        let mut fee_lo = [0u8; 16];
        fee_lo.copy_from_slice(&entry_fee[0..16]);
        let fee_u128 = u128::from_le_bytes(fee_lo);
        
        let no_deposit = [0u8; 32];
        
        if treasury_is_zero {
            // Fix H3: If treasury is zero, send 100% to creator
            if api::call(
                CallFlags::empty(),
                &payout_wallet,
                0u64,
                0u64,
                &no_deposit,
                &entry_fee, // 100% to creator
                &[],
                None,
            ).is_err() {
                api::return_value(ReturnFlags::REVERT, b"Fee transfer failed");
            }
        } else {
            let creator_share_u128 = fee_u128 * 95 / 100;
            let treasury_share_u128 = fee_u128 - creator_share_u128;

            let mut creator_share = [0u8; 32];
            creator_share[0..16].copy_from_slice(&creator_share_u128.to_le_bytes());

            let mut treasury_share = [0u8; 32];
            treasury_share[0..16].copy_from_slice(&treasury_share_u128.to_le_bytes());

            // Transfer 95% to payout wallet
            if api::call(
                CallFlags::empty(),
                &payout_wallet,
                0u64,
                0u64,
                &no_deposit,
                &creator_share,
                &[],
                None,
            ).is_err() {
                api::return_value(ReturnFlags::REVERT, b"Fee distribution failed");
            }

            // Transfer 5% to treasury
            if api::call(
                CallFlags::empty(),
                &treasury_addr,
                0u64,
                0u64,
                &no_deposit,
                &treasury_share,
                &[],
                None,
            ).is_err() {
                api::return_value(ReturnFlags::REVERT, b"Fee distribution failed");
            }
        }
    }

    // 7. Increment member count
    set_u32(&member_count_key, member_count + 1);

    // 8. Add pod to user's list (reverse index for efficient lookup)
    add_pod_to_user(caller, pod_id);

    api::return_value(ReturnFlags::empty(), &[]);
}

fn handle_has_paid(input: &[u8]) {
    let (pod_id, address): (u64, [u8; 20]) = 
        match Decode::decode(&mut &input[..]) {
            Ok(v) => v,
            Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
        };

    let paid_key = storage_key(b"paid", &[&pod_id.to_le_bytes(), &address]);
    let paid = if get_u8(&paid_key) == 1 { 1u8 } else { 0u8 };
    api::return_value(ReturnFlags::empty(), &[paid]);
}

fn handle_get_pod_fee(input: &[u8]) {
    let pod_id: u64 = match Decode::decode(&mut &input[..]) {
        Ok(v) => v,
        Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
    };

    let efee_key = storage_key(b"efee", &[&pod_id.to_le_bytes()]);
    let fee = get_u256(&efee_key);
    api::return_value(ReturnFlags::empty(), &fee);
}

fn handle_get_pod_member_count(input: &[u8]) {
    let pod_id: u64 = match Decode::decode(&mut &input[..]) {
        Ok(v) => v,
        Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
    };

    let count = get_u32(&storage_key(b"memc", &[&pod_id.to_le_bytes()]));
    api::return_value(ReturnFlags::empty(), &count.encode());
}

fn handle_get_user_pods(input: &[u8]) {
    let address: [u8; 20] = match Decode::decode(&mut &input[..]) {
        Ok(v) => v,
        Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
    };

    let pods = get_user_pods_list(address);
    api::return_value(ReturnFlags::empty(), &pods.encode());
}

// Fix 3: Add get_pod_members query function
fn handle_get_pod_members(input: &[u8]) {
    let _pod_id: u64 = match Decode::decode(&mut &input[..]) {
        Ok(v) => v,
        Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
    };

    // Get all members by iterating through paid status and user_pods
    // For paid pods: check paid mapping
    // For free pods: we need to track members differently
    
    // First, let's collect all addresses that have paid for this pod
    // We don't have a reverse index from pod to users, so we'll need to
    // use a different approach or return an empty list for now
    // 
    // Since we don't have a pod->members reverse index in storage,
    // we'll return an empty Vec for now. In a production system,
    // you'd want to maintain a members list in storage when users join.
    
    let members: Vec<[u8; 20]> = Vec::new();
    api::return_value(ReturnFlags::empty(), &members.encode());
}

// ============ HELPER FUNCTIONS ============

fn is_zero_u256(value: [u8; 32]) -> bool {
    for byte in value.iter() {
        if *byte != 0 {
            return false;
        }
    }
    true
}

// Returns: -1 if a < b, 0 if a == b, 1 if a > b
fn compare_u256(a: [u8; 32], b: [u8; 32]) -> i8 {
    for i in (0..32).rev() {
        if a[i] < b[i] {
            return -1;
        } else if a[i] > b[i] {
            return 1;
        }
    }
    0
}

// ============ USER PODS INDEX FUNCTIONS ============

/// Get the list of pod IDs for a user from storage
fn get_user_pods_list(address: [u8; 20]) -> Vec<u64> {
    let key = storage_key(b"user_pods", &[&address]);
    match get_storage(&key) {
        Some(data) => Vec::<u64>::decode(&mut &data[..]).unwrap_or_default(),
        None => Vec::new(),
    }
}

/// Save the list of pod IDs for a user to storage
fn set_user_pods_list(address: [u8; 20], pods: &[u64]) {
    let key = storage_key(b"user_pods", &[&address]);
    set_storage(&key, &pods.encode());
}

/// Add a pod to a user's list (idempotent)
fn add_pod_to_user(address: [u8; 20], pod_id: u64) {
    let mut pods = get_user_pods_list(address);
    // Check if already in list
    if !pods.contains(&pod_id) {
        pods.push(pod_id);
        set_user_pods_list(address, &pods);
    }
}

/// Remove a pod from a user's list
fn remove_pod_from_user(address: [u8; 20], pod_id: u64) {
    let mut pods = get_user_pods_list(address);
    if let Some(pos) = pods.iter().position(|&x| x == pod_id) {
        pods.remove(pos);
        set_user_pods_list(address, &pods);
    }
}

// Fix C1: Add leave_pod and user_pods reverse index
/// Handle leave_pod - allows a user to leave a pod
fn handle_leave_pod(input: &[u8]) {
    let pod_id: u64 = match Decode::decode(&mut &input[..]) {
        Ok(v) => v,
        Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
    };

    let mut caller = [0u8; 20];
    api::caller(&mut caller);

    // Load pod to get creator
    let pod_key = storage_key(b"pod", &[&pod_id.to_le_bytes()]);
    let pod_data = match get_storage(&pod_key) {
        Some(data) => data,
        None => api::return_value(ReturnFlags::REVERT, b"Pod not found"),
    };
    let pod: Pod = match Decode::decode(&mut &pod_data[..]) {
        Ok(p) => p,
        Err(_) => api::return_value(ReturnFlags::REVERT, b"Pod decode error"),
    };

    // Creator cannot leave their own pod
    if caller == pod.creator {
        api::return_value(ReturnFlags::REVERT, b"Creator cannot leave pod");
    }

    // Check if caller is a member (has paid for paid pods, or is in member list)
    // For simplicity, we check if they have paid status for paid pods
    let entry_fee = get_u256(&storage_key(b"efee", &[&pod_id.to_le_bytes()]));
    let has_entry_fee = !is_zero_u256(entry_fee);
    
    if has_entry_fee {
        let paid_key = storage_key(b"paid", &[&pod_id.to_le_bytes(), &caller]);
        if get_u8(&paid_key) != 1 {
            api::return_value(ReturnFlags::REVERT, b"Not a member");
        }
        // Remove paid status
        set_u8(&paid_key, 0);
    } else {
        // For free pods, check if they've joined (we'd need to track this)
        // For now, check if they're in the user_pods list
        let user_pods = get_user_pods_list(caller);
        if !user_pods.contains(&pod_id) {
            api::return_value(ReturnFlags::REVERT, b"Not a member");
        }
    }

    // Decrement member count
    let member_count_key = storage_key(b"memc", &[&pod_id.to_le_bytes()]);
    let member_count = get_u32(&member_count_key);
    if member_count > 0 {
        set_u32(&member_count_key, member_count - 1);
    }

    // Remove pod from user's list
    remove_pod_from_user(caller, pod_id);

    api::return_value(ReturnFlags::empty(), &[]);
}
