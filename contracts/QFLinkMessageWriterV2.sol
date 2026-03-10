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

interface ISessionKeys {
    function getOwner(address sessionKey) external view returns (address);
}

/// @title QFLinkMessageWriterV2 — Write-only message logic with session key support
/// @notice Supports both direct wallet calls AND session key calls.
///         If msg.sender is a registered session key, the message is attributed to the owner.
///         If msg.sender is a regular wallet, it works as before.
contract QFLinkMessageWriterV2 {
    error NotPodMember();
    error SelfMessage();
    error EmptyContent();

    IQFLinkContentStore public immutable contentStore;
    IQFLinkMessageIndex public immutable index;
    IQFLinkPodsReader public immutable podsReader;
    ISessionKeys public sessionKeys;
    address public admin;

    constructor(address _contentStore, address _index, address _podsReader, address _sessionKeys) {
        contentStore = IQFLinkContentStore(_contentStore);
        index = IQFLinkMessageIndex(_index);
        podsReader = IQFLinkPodsReader(_podsReader);
        sessionKeys = ISessionKeys(_sessionKeys);
        admin = msg.sender;
    }

    function _convKey(address a, address b) internal pure returns (bytes32) {
        (address lo, address hi) = a < b ? (a, b) : (b, a);
        return keccak256(abi.encodePacked(lo, hi));
    }

    /// @notice Resolve msg.sender to the actual user.
    ///         If msg.sender is a valid session key, return its owner.
    ///         Otherwise return msg.sender directly.
    function _resolveSender() internal view returns (address) {
        address owner = sessionKeys.getOwner(msg.sender);
        if (owner != address(0)) {
            return owner;
        }
        return msg.sender;
    }

    function sendPodMessage(uint64 podId, string calldata content) external {
        address sender = _resolveSender();
        if (!podsReader.checkPodAccess(podId, sender)) revert NotPodMember();
        if (bytes(content).length == 0) revert EmptyContent();

        uint64 id = index.getNextId();
        index.storeMeta(id, sender, uint64(block.timestamp), podId, address(0));
        contentStore.store(id, content);
        index.addPodMessage(podId, id);
    }

    function sendMessage(address recipient, string calldata content) external {
        address sender = _resolveSender();
        if (recipient == sender) revert SelfMessage();
        if (bytes(content).length == 0) revert EmptyContent();

        uint64 id = index.getNextId();
        index.storeMeta(id, sender, uint64(block.timestamp), 0, recipient);
        contentStore.store(id, content);

        bytes32 key = _convKey(sender, recipient);
        index.addDirectMessage(key, id);
        index.addConversation(sender, recipient);
        index.addConversation(recipient, sender);
    }

    function updateSessionKeys(address _sessionKeys) external {
        require(msg.sender == admin, "Not admin");
        sessionKeys = ISessionKeys(_sessionKeys);
    }
}
