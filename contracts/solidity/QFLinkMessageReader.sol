// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IQFLinkContentStore {
    function get(uint64 id) external view returns (string memory);
}

interface IQFLinkMessageIndex {
    function getMeta(uint64 id) external view returns (address sender, uint64 timestamp, uint64 podId, address recipient);
    function messageCount() external view returns (uint64);
    function getPodMessageIds(uint64 podId, uint64 offset, uint64 limit) external view returns (uint64[] memory);
    function getPodMessageCount(uint64 podId) external view returns (uint64);
    function getConversations(address user) external view returns (address[] memory);
    function getDirectMessageIds(bytes32 convKey, uint64 offset, uint64 limit) external view returns (uint64[] memory);
}

/// @title QFLinkMessageReader — Read-only message logic (resolc/PolkaVM optimized)
contract QFLinkMessageReader {
    IQFLinkContentStore public immutable contentStore;
    IQFLinkMessageIndex public immutable index;

    constructor(address _contentStore, address _index) {
        contentStore = IQFLinkContentStore(_contentStore);
        index = IQFLinkMessageIndex(_index);
    }

    function _convKey(address a, address b) internal pure returns (bytes32) {
        (address lo, address hi) = a < b ? (a, b) : (b, a);
        return keccak256(abi.encodePacked(lo, hi));
    }

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
