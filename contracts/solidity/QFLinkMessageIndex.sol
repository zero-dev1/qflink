// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title QFLinkMessageIndex — Metadata + index mappings, no strings (resolc/PolkaVM optimized)
contract QFLinkMessageIndex {
    error NotAuthorized();
    error NotOwner();

    struct MessageMeta {
        address sender;
        uint64 timestamp;
        uint64 podId;
        address recipient;
    }

    mapping(uint64 => MessageMeta) internal messages;
    uint64 internal nextId;

    mapping(uint64 => uint64[]) internal podMessageIds;
    mapping(bytes32 => uint64[]) internal dmIds;
    mapping(address => address[]) internal conversations;
    mapping(address => mapping(address => bool)) internal hasConversation;

    address public immutable owner;
    address public authorized;

    constructor(address _auth) {
        owner = msg.sender;
        authorized = _auth;
    }

    function setAuthorized(address _auth) external {
        if (msg.sender != owner) revert NotOwner();
        authorized = _auth;
    }

    // ── Message metadata ──

    function storeMeta(uint64 id, address sender, uint64 timestamp, uint64 podId, address recipient) external {
        if (msg.sender != authorized) revert NotAuthorized();
        messages[id] = MessageMeta(sender, timestamp, podId, recipient);
    }

    function getMeta(uint64 id) external view returns (address sender, uint64 timestamp, uint64 podId, address recipient) {
        MessageMeta storage m = messages[id];
        return (m.sender, m.timestamp, m.podId, m.recipient);
    }

    function getNextId() external returns (uint64 id) {
        if (msg.sender != authorized) revert NotAuthorized();
        id = nextId;
        nextId = id + 1;
    }

    function messageCount() external view returns (uint64) {
        return nextId;
    }

    // ── Pod message index ──

    function addPodMessage(uint64 podId, uint64 messageId) external {
        if (msg.sender != authorized) revert NotAuthorized();
        podMessageIds[podId].push(messageId);
    }

    function getPodMessageIds(uint64 podId, uint64 offset, uint64 limit) external view returns (uint64[] memory) {
        uint64[] storage arr = podMessageIds[podId];
        uint256 total = arr.length;
        if (offset >= total) return new uint64[](0);
        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 count = end - offset;
        uint64[] memory ids = new uint64[](count);
        for (uint256 i = 0; i < count; i++) {
            ids[i] = arr[offset + i];
        }
        return ids;
    }

    function getPodMessageCount(uint64 podId) external view returns (uint64) {
        return uint64(podMessageIds[podId].length);
    }

    // ── Direct message index ──

    function addDirectMessage(bytes32 convKey, uint64 messageId) external {
        if (msg.sender != authorized) revert NotAuthorized();
        dmIds[convKey].push(messageId);
    }

    function getDirectMessageIds(bytes32 convKey, uint64 offset, uint64 limit) external view returns (uint64[] memory) {
        uint64[] storage arr = dmIds[convKey];
        uint256 total = arr.length;
        if (offset >= total) return new uint64[](0);
        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 count = end - offset;
        uint64[] memory ids = new uint64[](count);
        for (uint256 i = 0; i < count; i++) {
            ids[i] = arr[offset + i];
        }
        return ids;
    }

    function getDirectMessageCount(bytes32 convKey) external view returns (uint64) {
        return uint64(dmIds[convKey].length);
    }

    // ── Conversation tracking ──

    function addConversation(address user, address other) external {
        if (msg.sender != authorized) revert NotAuthorized();
        if (!hasConversation[user][other]) {
            hasConversation[user][other] = true;
            conversations[user].push(other);
        }
    }

    function getConversations(address user) external view returns (address[] memory) {
        return conversations[user];
    }
}
