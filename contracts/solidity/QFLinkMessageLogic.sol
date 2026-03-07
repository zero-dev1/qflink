// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IQFLinkPods {
    function checkPodAccess(uint64 podId, address user) external view returns (bool);
}

interface IQFLinkContentStore {
    function store(uint64 id, string calldata content) external;
    function get(uint64 id) external view returns (string memory);
}

interface IQFLinkMessageIndex {
    function storeMeta(uint64 id, address sender, uint64 timestamp, uint64 podId, address recipient) external;
    function getMeta(uint64 id) external view returns (address sender, uint64 timestamp, uint64 podId, address recipient);
    function getNextId() external returns (uint64);
    function messageCount() external view returns (uint64);
    function addPodMessage(uint64 podId, uint64 messageId) external;
    function getPodMessageIds(uint64 podId, uint64 offset, uint64 limit) external view returns (uint64[] memory);
    function getPodMessageCount(uint64 podId) external view returns (uint64);
    function addConversation(address user, address other) external;
    function getConversations(address user) external view returns (address[] memory);
    function addDirectMessage(bytes32 convKey, uint64 messageId) external;
    function getDirectMessageIds(bytes32 convKey, uint64 offset, uint64 limit) external view returns (uint64[] memory);
}

/// @title QFLinkMessageLogic — Business logic, zero own storage (resolc/PolkaVM optimized)
/// Returns ID arrays only — frontend fetches individual messages via getMessage()
contract QFLinkMessageLogic {
    error NotPodMember();
    error SelfMessage();
    error EmptyContent();

    IQFLinkContentStore public immutable contentStore;
    IQFLinkMessageIndex public immutable index;
    IQFLinkPods public immutable pods;

    constructor(address _contentStore, address _index, address _pods) {
        contentStore = IQFLinkContentStore(_contentStore);
        index = IQFLinkMessageIndex(_index);
        pods = IQFLinkPods(_pods);
    }

    function _convKey(address a, address b) internal pure returns (bytes32) {
        (address lo, address hi) = a < b ? (a, b) : (b, a);
        return keccak256(abi.encodePacked(lo, hi));
    }

    // ── Write ──

    function sendPodMessage(uint64 podId, string calldata content) external {
        if (!pods.checkPodAccess(podId, msg.sender)) revert NotPodMember();
        if (bytes(content).length == 0) revert EmptyContent();

        uint64 id = index.getNextId();
        index.storeMeta(id, msg.sender, uint64(block.timestamp), podId, address(0));
        contentStore.store(id, content);
        index.addPodMessage(podId, id);
    }

    function sendMessage(address recipient, string calldata content) external {
        if (recipient == msg.sender) revert SelfMessage();
        if (bytes(content).length == 0) revert EmptyContent();

        uint64 id = index.getNextId();
        index.storeMeta(id, msg.sender, uint64(block.timestamp), 0, recipient);
        contentStore.store(id, content);

        bytes32 key = _convKey(msg.sender, recipient);
        index.addDirectMessage(key, id);
        index.addConversation(msg.sender, recipient);
        index.addConversation(recipient, msg.sender);
    }

    // ── Read ──

    function getMessage(uint64 id) external view returns (
        address sender,
        uint64 timestamp,
        string memory content,
        uint64 podId,
        address recipient
    ) {
        (sender, timestamp, podId, recipient) = index.getMeta(id);
        content = contentStore.get(id);
    }

    function getPodMessageIds(uint64 podId, uint64 offset, uint64 limit) external view returns (uint64[] memory) {
        return index.getPodMessageIds(podId, offset, limit);
    }

    function getPodMessageCount(uint64 podId) external view returns (uint64) {
        return index.getPodMessageCount(podId);
    }

    function getDirectMessageIds(address user1, address user2, uint64 offset, uint64 limit) external view returns (uint64[] memory) {
        return index.getDirectMessageIds(_convKey(user1, user2), offset, limit);
    }

    function getConversations(address user) external view returns (address[] memory) {
        return index.getConversations(user);
    }

    function getMessageCount() external view returns (uint64) {
        return index.messageCount();
    }
}
