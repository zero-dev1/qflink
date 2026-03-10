// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IQFLinkPodsReader {
    function checkPodAccess(uint64 podId, address user) external view returns (bool);
    function isMember(uint64 podId, address user) external view returns (bool);
}

interface IQFLinkContentStore {
    function store(uint64 id, string calldata content) external;
}

interface IQFLinkMessageIndex {
    function storeMeta(uint64 id, address sender, uint64 timestamp, uint64 podId, address recipient) external;
    function getNextId() external returns (uint64);
    function addPodMessage(uint64 podId, uint64 messageId) external;
    function addConversation(address user, address other) external;
    function addDirectMessage(bytes32 convKey, uint64 messageId) external;
}

/// @title QFLinkMessageWriter — Write-only message logic (resolc/PolkaVM optimized)
contract QFLinkMessageWriter {
    error NotPodMember();
    error SelfMessage();
    error EmptyContent();

    IQFLinkContentStore public immutable contentStore;
    IQFLinkMessageIndex public immutable index;
    IQFLinkPodsReader public immutable podsReader;

    constructor(address _contentStore, address _index, address _podsReader) {
        contentStore = IQFLinkContentStore(_contentStore);
        index = IQFLinkMessageIndex(_index);
        podsReader = IQFLinkPodsReader(_podsReader);
    }

    function _convKey(address a, address b) internal pure returns (bytes32) {
        (address lo, address hi) = a < b ? (a, b) : (b, a);
        return keccak256(abi.encodePacked(lo, hi));
    }

    function sendPodMessage(uint64 podId, string calldata content) external {
        if (!podsReader.checkPodAccess(podId, msg.sender)) revert NotPodMember();
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
}
