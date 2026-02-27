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

    let initialize_pods_sel = selector(b"initialize_pods()");
    let create_pod_sel = selector(b"create_pod(bytes,bytes,uint256)");
    let send_pod_message_sel = selector(b"send_pod_message(uint64,bytes32)");
    let get_pod_sel = selector(b"get_pod(uint64)");
    let get_pod_messages_sel = selector(b"get_pod_messages(uint64,uint64,uint64)");
    let get_pod_count_sel = selector(b"get_pod_count()");
    let check_pod_access_sel = selector(b"check_pod_access(uint64,address)");

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

    let default_pods = [
        (b"Chefs".as_ref(), b"10+ QF Holders".as_ref(), 10u64),
        (b"Whale".as_ref(), b"250,000+ QF Holders".as_ref(), 250_000u64),
        (b"Kraken".as_ref(), b"500,000+ QF Holders".as_ref(), 500_000u64),
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
    }

    let count_key = storage_key(b"pod_count", &[]);
    set_u64(&count_key, 3);

    // Mark as initialized
    set_storage(&init_key, &[1u8]);

    api::return_value(ReturnFlags::empty(), &[]);
}

fn handle_create_pod(input: &[u8]) {
    let (name, description, min_balance): (Vec<u8>, Vec<u8>, [u8; 32]) = 
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

    let pod_key = storage_key(b"pod", &[&pod_id.to_le_bytes()]);
    let pod_data = match get_storage(&pod_key) {
        Some(data) => data,
        None => api::return_value(ReturnFlags::REVERT, b"Pod not found"),
    };

    let pod: Pod = match Decode::decode(&mut &pod_data[..]) {
        Ok(p) => p,
        Err(_) => api::return_value(ReturnFlags::REVERT, b"Pod decode error"),
    };

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

    let result = if has_access { 1u8 } else { 0u8 };
    api::return_value(ReturnFlags::empty(), &[result]);
}
