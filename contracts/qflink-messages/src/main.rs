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
struct DirectMessage {
    sender: [u8; 20],
    recipient: [u8; 20],
    content_hash: [u8; 32],
    timestamp: u64,
    nonce: [u8; 24],
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

fn sorted_pair(addr1: [u8; 20], addr2: [u8; 20]) -> ([u8; 20], [u8; 20]) {
    if addr1 < addr2 {
        (addr1, addr2)
    } else {
        (addr2, addr1)
    }
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

    let send_message_sel = selector(b"send_message(address,bytes32,bytes24)");
    let get_messages_sel = selector(b"get_messages(address,address,uint64,uint64)");
    let get_conversations_sel = selector(b"get_conversations(address)");
    let get_message_count_sel = selector(b"get_message_count(address,address)");

    if sel == send_message_sel {
        handle_send_message(input);
    } else if sel == get_messages_sel {
        handle_get_messages(input);
    } else if sel == get_conversations_sel {
        handle_get_conversations(input);
    } else if sel == get_message_count_sel {
        handle_get_message_count(input);
    } else {
        api::return_value(ReturnFlags::REVERT, b"Unknown function");
    }
}

fn handle_send_message(input: &[u8]) {
    let (recipient, content_hash, nonce): ([u8; 20], [u8; 32], [u8; 24]) = 
        match Decode::decode(&mut &input[..]) {
            Ok(v) => v,
            Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
        };

    let mut caller = [0u8; 20];
    api::caller(&mut caller);

    if caller == recipient {
        api::return_value(ReturnFlags::REVERT, b"Cannot send to self");
    }

    let mut timestamp = [0u8; 32];
    api::now(&mut timestamp);
    let ts = u64::from_le_bytes([
        timestamp[0], timestamp[1], timestamp[2], timestamp[3],
        timestamp[4], timestamp[5], timestamp[6], timestamp[7],
    ]);

    let message = DirectMessage {
        sender: caller,
        recipient,
        content_hash,
        timestamp: ts,
        nonce,
    };

    let (addr1, addr2) = sorted_pair(caller, recipient);

    let count_key = storage_key(b"dm_count", &[&addr1, &addr2]);
    let msg_index = get_u64(&count_key);

    let msg_key = storage_key(b"dm", &[&addr1, &addr2, &msg_index.to_le_bytes()]);
    set_storage(&msg_key, &message.encode());

    set_u64(&count_key, msg_index + 1);

    if msg_index == 0 {
        let conv_key_caller = storage_key(b"conversations", &[&caller]);
        let mut convs: Vec<[u8; 20]> = get_storage(&conv_key_caller)
            .and_then(|data| Decode::decode(&mut &data[..]).ok())
            .unwrap_or_default();
        if !convs.contains(&recipient) {
            convs.push(recipient);
            set_storage(&conv_key_caller, &convs.encode());
        }

        let conv_key_recipient = storage_key(b"conversations", &[&recipient]);
        let mut convs: Vec<[u8; 20]> = get_storage(&conv_key_recipient)
            .and_then(|data| Decode::decode(&mut &data[..]).ok())
            .unwrap_or_default();
        if !convs.contains(&caller) {
            convs.push(caller);
            set_storage(&conv_key_recipient, &convs.encode());
        }

        let conv_count_key_caller = storage_key(b"conv_count", &[&caller]);
        let count = get_u64(&conv_count_key_caller);
        set_u64(&conv_count_key_caller, count + 1);

        let conv_count_key_recipient = storage_key(b"conv_count", &[&recipient]);
        let count = get_u64(&conv_count_key_recipient);
        set_u64(&conv_count_key_recipient, count + 1);
    }

    let mut topic = [0u8; 32];
    api::hash_keccak_256(b"MessageSent", &mut topic);
    let mut event_data = Vec::new();
    event_data.extend_from_slice(&caller);
    event_data.extend_from_slice(&recipient);
    event_data.extend_from_slice(&content_hash);
    event_data.extend_from_slice(&ts.to_le_bytes());
    api::deposit_event(&[topic], &event_data);

    api::return_value(ReturnFlags::empty(), &[]);
}

fn handle_get_messages(input: &[u8]) {
    let (address1, address2, start, limit): ([u8; 20], [u8; 20], u64, u64) = 
        match Decode::decode(&mut &input[..]) {
            Ok(v) => v,
            Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
        };

    let (addr1, addr2) = sorted_pair(address1, address2);

    let count_key = storage_key(b"dm_count", &[&addr1, &addr2]);
    let total = get_u64(&count_key);

    let end = if start + limit > total {
        total
    } else {
        start + limit
    };

    let mut messages = Vec::new();
    for i in start..end {
        let msg_key = storage_key(b"dm", &[&addr1, &addr2, &i.to_le_bytes()]);
        if let Some(data) = get_storage(&msg_key) {
            if let Ok(msg) = DirectMessage::decode(&mut &data[..]) {
                messages.push(msg);
            }
        }
    }

    api::return_value(ReturnFlags::empty(), &messages.encode());
}

fn handle_get_conversations(input: &[u8]) {
    if input.len() < 20 {
        api::return_value(ReturnFlags::REVERT, b"Invalid address");
    }

    let mut address = [0u8; 20];
    address.copy_from_slice(&input[0..20]);

    let conv_key = storage_key(b"conversations", &[&address]);
    let conversations: Vec<[u8; 20]> = get_storage(&conv_key)
        .and_then(|data| Decode::decode(&mut &data[..]).ok())
        .unwrap_or_default();

    api::return_value(ReturnFlags::empty(), &conversations.encode());
}

fn handle_get_message_count(input: &[u8]) {
    let (address1, address2): ([u8; 20], [u8; 20]) = 
        match Decode::decode(&mut &input[..]) {
            Ok(v) => v,
            Err(_) => api::return_value(ReturnFlags::REVERT, b"Invalid input"),
        };

    let (addr1, addr2) = sorted_pair(address1, address2);

    let count_key = storage_key(b"dm_count", &[&addr1, &addr2]);
    let count = get_u64(&count_key);

    api::return_value(ReturnFlags::empty(), &count.encode());
}
