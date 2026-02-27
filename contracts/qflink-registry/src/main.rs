#![no_std]
#![no_main]

extern crate alloc;

use alloc::vec::Vec;
use codec::{Decode, Encode};
use pallet_revive_uapi::{
    HostFn, HostFnImpl as api, ReturnFlags, StorageFlags,
};
use qf_polkavm_sdk::prelude::*;

#[derive(Encode, Decode)]
struct UserProfile {
    display_name: Vec<u8>,
    encryption_pubkey: [u8; 32],
    registered_at: u64,
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

fn selector(sig: &[u8]) -> [u8; 4] {
    let mut hash = [0u8; 32];
    api::hash_keccak_256(sig, &mut hash);
    [hash[0], hash[1], hash[2], hash[3]]
}

#[export]
pub fn deploy() {
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

    let register_sel = selector(b"register(bytes,bytes32)");
    let get_profile_sel = selector(b"get_profile(address)");
    let update_profile_sel = selector(b"update_profile(bytes,bytes32)");
    let link_wallet_sel = selector(b"link_wallet(address,bytes)");
    let confirm_link_sel = selector(b"confirm_link(address)");
    let unlink_wallet_sel = selector(b"unlink_wallet(address)");
    let get_primary_sel = selector(b"get_primary(address)");
    let get_linked_wallets_sel = selector(b"get_linked_wallets(address)");
    let get_total_balance_sel = selector(b"get_total_balance(address)");
    let get_user_count_sel = selector(b"get_user_count()");

    if sel == register_sel {
        handle_register(input);
    } else if sel == get_profile_sel {
        handle_get_profile(input);
    } else if sel == update_profile_sel {
        handle_update_profile(input);
    } else if sel == link_wallet_sel {
        handle_link_wallet(input);
    } else if sel == confirm_link_sel {
        handle_confirm_link(input);
    } else if sel == unlink_wallet_sel {
        handle_unlink_wallet(input);
    } else if sel == get_primary_sel {
        handle_get_primary(input);
    } else if sel == get_linked_wallets_sel {
        handle_get_linked_wallets(input);
    } else if sel == get_total_balance_sel {
        handle_get_total_balance(input);
    } else if sel == get_user_count_sel {
        handle_get_user_count();
    } else {
        api::return_value(ReturnFlags::REVERT, b"Unknown function");
    }
}

fn handle_register(input: &[u8]) {
    let (display_name, encryption_pubkey): (Vec<u8>, [u8; 32]) = 
        match Decode::decode(&mut &input[..]) {
            Ok(v) => v,
            Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
        };

    if display_name.len() > 32 {
        api::return_value(ReturnFlags::REVERT, b"Display name too long");
    }

    let mut caller = [0u8; 20];
    api::caller(&mut caller);

    let user_key = storage_key(b"user", &[&caller]);
    if get_storage(&user_key).is_some() {
        api::return_value(ReturnFlags::REVERT, b"User already registered");
    }

    let mut timestamp = [0u8; 32];
    api::now(&mut timestamp);
    let registered_at = u64::from_le_bytes([
        timestamp[0], timestamp[1], timestamp[2], timestamp[3],
        timestamp[4], timestamp[5], timestamp[6], timestamp[7],
    ]);

    let profile = UserProfile {
        display_name: display_name.clone(),
        encryption_pubkey,
        registered_at,
    };

    set_storage(&user_key, &profile.encode());

    let count_key = storage_key(b"user_count", &[]);
    let count = get_u64(&count_key);
    set_u64(&count_key, count + 1);

    let mut event_data = Vec::new();
    event_data.extend_from_slice(&caller);
    event_data.extend_from_slice(&display_name);

    let mut topic = [0u8; 32];
    api::hash_keccak_256(b"UserRegistered", &mut topic);
    api::deposit_event(&[topic], &event_data);

    api::return_value(ReturnFlags::empty(), &[]);
}

fn handle_get_profile(input: &[u8]) {
    if input.len() < 20 {
        api::return_value(ReturnFlags::REVERT, b"Invalid address");
    }

    let mut address = [0u8; 20];
    address.copy_from_slice(&input[0..20]);

    let user_key = storage_key(b"user", &[&address]);
    match get_storage(&user_key) {
        Some(data) => api::return_value(ReturnFlags::empty(), &data),
        None => api::return_value(ReturnFlags::REVERT, b"User not found"),
    }
}

fn handle_update_profile(input: &[u8]) {
    let (display_name, encryption_pubkey): (Vec<u8>, [u8; 32]) = 
        match Decode::decode(&mut &input[..]) {
            Ok(v) => v,
            Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
        };

    if display_name.len() > 32 {
        api::return_value(ReturnFlags::REVERT, b"Display name too long");
    }

    let mut caller = [0u8; 20];
    api::caller(&mut caller);

    let user_key = storage_key(b"user", &[&caller]);
    let profile_data = match get_storage(&user_key) {
        Some(data) => data,
        None => api::return_value(ReturnFlags::REVERT, b"User not registered"),
    };

    let mut profile: UserProfile = match Decode::decode(&mut &profile_data[..]) {
        Ok(p) => p,
        Err(_) => api::return_value(ReturnFlags::REVERT, b"Profile decode error"),
    };

    profile.display_name = display_name;
    profile.encryption_pubkey = encryption_pubkey;

    set_storage(&user_key, &profile.encode());

    let mut topic = [0u8; 32];
    api::hash_keccak_256(b"ProfileUpdated", &mut topic);
    api::deposit_event(&[topic], &caller);

    api::return_value(ReturnFlags::empty(), &[]);
}

fn handle_link_wallet(input: &[u8]) {
    let (linked_address, _signature): ([u8; 20], Vec<u8>) = 
        match Decode::decode(&mut &input[..]) {
            Ok(v) => v,
            Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
        };

    let mut caller = [0u8; 20];
    api::caller(&mut caller);

    let linked_user_key = storage_key(b"user", &[&linked_address]);
    if get_storage(&linked_user_key).is_some() {
        api::return_value(ReturnFlags::REVERT, b"Linked address is a registered primary");
    }

    let existing_primary_key = storage_key(b"primary", &[&linked_address]);
    if get_storage(&existing_primary_key).is_some() {
        api::return_value(ReturnFlags::REVERT, b"Address already linked");
    }

    let linked_key = storage_key(b"linked", &[&caller]);
    let mut linked_wallets: Vec<[u8; 20]> = get_storage(&linked_key)
        .and_then(|data| Decode::decode(&mut &data[..]).ok())
        .unwrap_or_default();

    if !linked_wallets.contains(&linked_address) {
        linked_wallets.push(linked_address);
        set_storage(&linked_key, &linked_wallets.encode());
    }

    let pending_key = storage_key(b"pending_link", &[&caller, &linked_address]);
    set_storage(&pending_key, &[1u8]);

    let mut topic = [0u8; 32];
    api::hash_keccak_256(b"WalletLinkPending", &mut topic);
    let mut event_data = Vec::new();
    event_data.extend_from_slice(&caller);
    event_data.extend_from_slice(&linked_address);
    api::deposit_event(&[topic], &event_data);

    api::return_value(ReturnFlags::empty(), &[]);
}

fn handle_confirm_link(input: &[u8]) {
    if input.len() < 20 {
        api::return_value(ReturnFlags::REVERT, b"Invalid address");
    }

    let mut primary_address = [0u8; 20];
    primary_address.copy_from_slice(&input[0..20]);

    let mut caller = [0u8; 20];
    api::caller(&mut caller);

    let pending_key = storage_key(b"pending_link", &[&primary_address, &caller]);
    if get_storage(&pending_key).is_none() {
        api::return_value(ReturnFlags::REVERT, b"No pending link");
    }

    let primary_key = storage_key(b"primary", &[&caller]);
    set_storage(&primary_key, &primary_address);

    let mut topic = [0u8; 32];
    api::hash_keccak_256(b"WalletLinked", &mut topic);
    let mut event_data = Vec::new();
    event_data.extend_from_slice(&primary_address);
    event_data.extend_from_slice(&caller);
    api::deposit_event(&[topic], &event_data);

    api::return_value(ReturnFlags::empty(), &[]);
}

fn handle_unlink_wallet(input: &[u8]) {
    if input.len() < 20 {
        api::return_value(ReturnFlags::REVERT, b"Invalid address");
    }

    let mut linked_address = [0u8; 20];
    linked_address.copy_from_slice(&input[0..20]);

    let mut caller = [0u8; 20];
    api::caller(&mut caller);

    let linked_key = storage_key(b"linked", &[&caller]);
    let mut linked_wallets: Vec<[u8; 20]> = get_storage(&linked_key)
        .and_then(|data| Decode::decode(&mut &data[..]).ok())
        .unwrap_or_default();

    linked_wallets.retain(|&addr| addr != linked_address);
    set_storage(&linked_key, &linked_wallets.encode());

    let primary_key = storage_key(b"primary", &[&linked_address]);
    set_storage(&primary_key, &[]);

    let mut topic = [0u8; 32];
    api::hash_keccak_256(b"WalletUnlinked", &mut topic);
    let mut event_data = Vec::new();
    event_data.extend_from_slice(&caller);
    event_data.extend_from_slice(&linked_address);
    api::deposit_event(&[topic], &event_data);

    api::return_value(ReturnFlags::empty(), &[]);
}

fn handle_get_primary(input: &[u8]) {
    if input.len() < 20 {
        api::return_value(ReturnFlags::REVERT, b"Invalid address");
    }

    let mut address = [0u8; 20];
    address.copy_from_slice(&input[0..20]);

    let primary_key = storage_key(b"primary", &[&address]);
    let primary = get_storage(&primary_key)
        .and_then(|data| {
            if data.len() >= 20 {
                let mut addr = [0u8; 20];
                addr.copy_from_slice(&data[0..20]);
                Some(addr)
            } else {
                None
            }
        })
        .unwrap_or(address);

    api::return_value(ReturnFlags::empty(), &primary);
}

fn handle_get_linked_wallets(input: &[u8]) {
    if input.len() < 20 {
        api::return_value(ReturnFlags::REVERT, b"Invalid address");
    }

    let mut primary = [0u8; 20];
    primary.copy_from_slice(&input[0..20]);

    let linked_key = storage_key(b"linked", &[&primary]);
    let linked_wallets: Vec<[u8; 20]> = get_storage(&linked_key)
        .and_then(|data| Decode::decode(&mut &data[..]).ok())
        .unwrap_or_default();

    api::return_value(ReturnFlags::empty(), &linked_wallets.encode());
}

fn handle_get_total_balance(input: &[u8]) {
    if input.len() < 20 {
        api::return_value(ReturnFlags::REVERT, b"Invalid address");
    }

    let mut primary = [0u8; 20];
    primary.copy_from_slice(&input[0..20]);

    let mut total_balance = [0u8; 32];
    api::balance_of(&primary, &mut total_balance);

    let linked_key = storage_key(b"linked", &[&primary]);
    let linked_wallets: Vec<[u8; 20]> = get_storage(&linked_key)
        .and_then(|data| Decode::decode(&mut &data[..]).ok())
        .unwrap_or_default();

    for linked_addr in linked_wallets {
        let mut linked_balance = [0u8; 32];
        api::balance_of(&linked_addr, &mut linked_balance);
        
        let mut carry = 0u16;
        for i in 0..32 {
            let sum = total_balance[i] as u16 + linked_balance[i] as u16 + carry;
            total_balance[i] = sum as u8;
            carry = sum >> 8;
        }
    }

    api::return_value(ReturnFlags::empty(), &total_balance);
}

fn handle_get_user_count() {
    let count_key = storage_key(b"user_count", &[]);
    let count = get_u64(&count_key);
    api::return_value(ReturnFlags::empty(), &count.encode());
}
