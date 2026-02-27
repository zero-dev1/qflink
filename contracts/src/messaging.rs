#![no_std]

extern crate alloc;
use alloc::vec::Vec;
use parity_scale_codec::{Decode, Encode};

#[derive(Encode, Decode, Clone)]
pub struct Message {
    pub sender: [u8; 32],
    pub recipient: [u8; 32],
    pub encrypted_content: Vec<u8>,
    pub timestamp: u64,
}

pub struct MessagingContract;

impl MessagingContract {
    pub fn send_message(
        sender: [u8; 32],
        recipient: [u8; 32],
        encrypted_content: Vec<u8>,
        timestamp: u64,
    ) -> Result<Message, &'static str> {
        if encrypted_content.len() > 4096 {
            return Err("Content exceeds maximum length of 4096 bytes");
        }

        Ok(Message {
            sender,
            recipient,
            encrypted_content,
            timestamp,
        })
    }

    pub fn get_messages(
        messages: &[Message],
        user1: [u8; 32],
        user2: [u8; 32],
    ) -> Vec<Message> {
        messages
            .iter()
            .filter(|m| {
                (m.sender == user1 && m.recipient == user2)
                    || (m.sender == user2 && m.recipient == user1)
            })
            .cloned()
            .collect()
    }

    pub fn get_conversations(messages: &[Message], user: [u8; 32]) -> Vec<[u8; 32]> {
        let mut addresses: Vec<[u8; 32]> = Vec::new();
        for msg in messages {
            let other = if msg.sender == user {
                msg.recipient
            } else if msg.recipient == user {
                msg.sender
            } else {
                continue;
            };
            if !addresses.contains(&other) {
                addresses.push(other);
            }
        }
        addresses
    }
}
