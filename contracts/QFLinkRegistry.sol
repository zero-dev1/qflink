// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title QFLinkRegistry v1 — optimized for resolc/PolkaVM bytecode size
contract QFLinkRegistry {
    error UserExists();
    error UserNotFound();
    error InvalidName();

    struct Profile {
        bytes32 displayName;
        bytes32 encryptionPubkey;
        uint64 registeredAt;     // != 0 means exists
    }

    mapping(address => Profile) private profiles;
    uint64 public userCount;
    address public immutable owner;

    constructor() { owner = msg.sender; }

    function register(bytes32 displayName, bytes32 encryptionPubkey) external {
        if (profiles[msg.sender].registeredAt != 0) revert UserExists();
        if (displayName == 0) revert InvalidName();
        profiles[msg.sender] = Profile(displayName, encryptionPubkey, uint64(block.timestamp));
        userCount++;
    }

    function updateProfile(bytes32 displayName, bytes32 encryptionPubkey) external {
        if (profiles[msg.sender].registeredAt == 0) revert UserNotFound();
        if (displayName == 0) revert InvalidName();
        profiles[msg.sender].displayName = displayName;
        profiles[msg.sender].encryptionPubkey = encryptionPubkey;
    }

    function getProfile(address addr) external view returns (bytes32, bytes32, uint64) {
        Profile storage p = profiles[addr];
        if (p.registeredAt == 0) revert UserNotFound();
        return (p.displayName, p.encryptionPubkey, p.registeredAt);
    }

    function getUserCount() external view returns (uint64) {
        return userCount;
    }

    function profileExists(address addr) external view returns (bool) {
        return profiles[addr].registeredAt != 0;
    }
}
