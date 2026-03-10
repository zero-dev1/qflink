// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IQFLinkRegistry {
    function profileExists(address addr) external view returns (bool);
}

interface IPayments {
    function getEntryFee(uint64 podId) external view returns (uint256);
    function hasPaid(uint64 podId, address user) external view returns (bool);
}

/// @title QFLinkPods v2 — tiers, thresholds, payment integration (resolc/PolkaVM optimized)
contract QFLinkPods {
    error PodNotFound();
    error AlreadyMember();
    error NotMember();
    error Banned();
    error NotCreator();
    error CreatorCantLeave();
    error InvalidName();
    error Unauthorized();
    error PodFull();
    error InsufficientBalance();
    error PaymentRequired();
    error ModCapReached();
    error AlreadyPro();

    struct Pod {
        bytes32 name;
        address creator;
        uint64 createdAt;
        uint8 tier;
        bool isPublic;
        uint64 memberCount;
        uint64 modCount;
        uint256 threshold;
    }

    mapping(uint64 => Pod) private pods;
    mapping(uint64 => mapping(address => bool)) public members;
    mapping(uint64 => mapping(address => bool)) public bans;
    mapping(uint64 => mapping(address => bool)) public mods;
    uint64 public podCount;

    address public immutable owner;
    IQFLinkRegistry public immutable registry;
    IPayments public immutable payments;

    constructor(address _registry, address _payments) {
        owner = msg.sender;
        registry = IQFLinkRegistry(_registry);
        payments = IPayments(_payments);
    }

    // ── Write ──

    function createPod(bytes32 name, bool isPublic, uint256 threshold) external returns (uint64) {
        if (name == 0) revert InvalidName();
        uint64 podId = podCount;
        pods[podId] = Pod(name, msg.sender, uint64(block.timestamp), 0, isPublic, 1, 1, threshold);
        members[podId][msg.sender] = true;
        mods[podId][msg.sender] = true;
        podCount++;
        return podId;
    }

    function joinPod(uint64 podId) external {
        Pod storage pod = pods[podId];
        if (pod.createdAt == 0) revert PodNotFound();
        if (members[podId][msg.sender]) revert AlreadyMember();
        if (bans[podId][msg.sender]) revert Banned();
        if (pod.tier == 0 && pod.memberCount >= 50) revert PodFull();
        if (pod.threshold > 0 && msg.sender.balance < pod.threshold) revert InsufficientBalance();
        if (payments.getEntryFee(podId) > 0 && !payments.hasPaid(podId, msg.sender)) revert PaymentRequired();
        members[podId][msg.sender] = true;
        pod.memberCount++;
    }

    function leavePod(uint64 podId) external {
        Pod storage pod = pods[podId];
        if (pod.createdAt == 0) revert PodNotFound();
        if (!members[podId][msg.sender]) revert NotMember();
        if (pod.creator == msg.sender) revert CreatorCantLeave();
        members[podId][msg.sender] = false;
        if (mods[podId][msg.sender]) {
            mods[podId][msg.sender] = false;
            pod.modCount--;
        }
        pod.memberCount--;
    }

    function banMember(uint64 podId, address member) external {
        Pod storage pod = pods[podId];
        if (pod.createdAt == 0) revert PodNotFound();
        if (pod.creator != msg.sender && !mods[podId][msg.sender]) revert Unauthorized();
        if (member == pod.creator) revert Unauthorized();
        bans[podId][member] = true;
        if (members[podId][member]) {
            members[podId][member] = false;
            if (mods[podId][member]) {
                mods[podId][member] = false;
                pod.modCount--;
            }
            pod.memberCount--;
        }
    }

    function unbanMember(uint64 podId, address member) external {
        Pod storage pod = pods[podId];
        if (pod.createdAt == 0) revert PodNotFound();
        if (pod.creator != msg.sender && !mods[podId][msg.sender]) revert Unauthorized();
        bans[podId][member] = false;
    }

    function addMod(uint64 podId, address member) external {
        Pod storage pod = pods[podId];
        if (pod.createdAt == 0) revert PodNotFound();
        if (pod.creator != msg.sender) revert NotCreator();
        if (!members[podId][member]) revert NotMember();
        if (pod.tier == 0 && pod.modCount >= 1) revert ModCapReached();
        if (pod.tier == 1 && pod.modCount >= 3) revert ModCapReached();
        mods[podId][member] = true;
        pod.modCount++;
    }

    function removeMod(uint64 podId, address member) external {
        Pod storage pod = pods[podId];
        if (pod.createdAt == 0) revert PodNotFound();
        if (pod.creator != msg.sender) revert NotCreator();
        if (member == pod.creator) revert Unauthorized();
        if (mods[podId][member]) {
            mods[podId][member] = false;
            pod.modCount--;
        }
    }

    function upgradePod(uint64 podId) external {
        Pod storage pod = pods[podId];
        if (pod.createdAt == 0) revert PodNotFound();
        if (pod.creator != msg.sender) revert NotCreator();
        if (pod.tier == 1) revert AlreadyPro();
        pod.tier = 1;
    }

    // ── Read ──

    function getPod(uint64 podId) external view returns (
        bytes32 name, address creator, bool isPublic,
        uint64 createdAt, uint64 memberCount, uint8 tier, uint256 threshold
    ) {
        Pod storage p = pods[podId];
        if (p.createdAt == 0) revert PodNotFound();
        return (p.name, p.creator, p.isPublic, p.createdAt, p.memberCount, p.tier, p.threshold);
    }

    function getPodCount() external view returns (uint64) { return podCount; }

    function getCreator(uint64 podId) external view returns (address) {
        Pod storage p = pods[podId];
        if (p.createdAt == 0) revert PodNotFound();
        return p.creator;
    }

    function getPodTier(uint64 podId) external view returns (uint8) {
        return pods[podId].tier;
    }

    function getThreshold(uint64 podId) external view returns (uint256) {
        return pods[podId].threshold;
    }

    function checkPodAccess(uint64 podId, address user) external view returns (bool) {
        return pods[podId].createdAt != 0 && members[podId][user];
    }

    function isBanned(uint64 podId, address user) external view returns (bool) {
        return bans[podId][user];
    }

    function isMod(uint64 podId, address user) external view returns (bool) {
        return mods[podId][user];
    }
}
