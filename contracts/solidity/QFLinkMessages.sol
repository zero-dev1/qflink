// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IQFLinkPods {
    function checkPodAccess(uint64 podId, address user) external view returns (bool);
}

/// @title QFLinkMessages v1 — optimized for resolc/PolkaVM bytecode size
contract QFLinkMessages {
    error NotPodMember();
    error SelfMessage();
    error EmptyContent();

    struct PodMsg {
        address sender;
        string content;       // only dynamic field kept as string
        uint64 timestamp;
    }

    struct DirectMsg {
        address sender;
        string content;
        uint64 timestamp;
    }

    // Pod messages: podId -> array of messages
    mapping(uint64 => PodMsg[]) private podMsgs;

    // DM storage: sorted key pair -> array of messages
    mapping(address => mapping(address => DirectMsg[])) private dms;

    // Conversation tracking
    mapping(address => mapping(address => bool)) private hasConvo;
    mapping(address => address[]) private convos;

    uint64 public messageCount;
    address public immutable owner;
    IQFLinkPods public immutable pods;

    constructor(address _pods) {
        owner = msg.sender;
        pods = IQFLinkPods(_pods);
    }

    // ── Write ──

    function sendPodMessage(uint64 podId, string calldata content) external {
        if (!pods.checkPodAccess(podId, msg.sender)) revert NotPodMember();
        if (bytes(content).length == 0) revert EmptyContent();
        podMsgs[podId].push(PodMsg(msg.sender, content, uint64(block.timestamp)));
        messageCount++;
    }

    function sendMessage(address to, string calldata content) external {
        if (to == msg.sender) revert SelfMessage();
        if (bytes(content).length == 0) revert EmptyContent();

        // Store under both orderings so either party can query
        DirectMsg memory m = DirectMsg(msg.sender, content, uint64(block.timestamp));
        dms[msg.sender][to].push(m);
        dms[to][msg.sender].push(m);

        if (!hasConvo[msg.sender][to]) {
            hasConvo[msg.sender][to] = true;
            convos[msg.sender].push(to);
        }
        if (!hasConvo[to][msg.sender]) {
            hasConvo[to][msg.sender] = true;
            convos[to].push(msg.sender);
        }
        messageCount++;
    }

    // ── Read ──

    function getPodMessages(uint64 podId, uint64 offset, uint64 limit) external view returns (
        address[] memory senders,
        string[] memory contents,
        uint64[] memory timestamps
    ) {
        PodMsg[] storage arr = podMsgs[podId];
        uint256 total = arr.length;
        if (offset >= total) {
            return (new address[](0), new string[](0), new uint64[](0));
        }
        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 count = end - offset;

        senders = new address[](count);
        contents = new string[](count);
        timestamps = new uint64[](count);

        for (uint256 i = 0; i < count; i++) {
            PodMsg storage pm = arr[offset + i];
            senders[i] = pm.sender;
            contents[i] = pm.content;
            timestamps[i] = pm.timestamp;
        }
    }

    function getMessages(address user1, address user2, uint64 offset, uint64 limit) external view returns (
        address[] memory senders,
        string[] memory contents,
        uint64[] memory timestamps
    ) {
        DirectMsg[] storage arr = dms[user1][user2];
        uint256 total = arr.length;
        if (offset >= total) {
            return (new address[](0), new string[](0), new uint64[](0));
        }
        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 count = end - offset;

        senders = new address[](count);
        contents = new string[](count);
        timestamps = new uint64[](count);

        for (uint256 i = 0; i < count; i++) {
            DirectMsg storage dm = arr[offset + i];
            senders[i] = dm.sender;
            contents[i] = dm.content;
            timestamps[i] = dm.timestamp;
        }
    }

    function getConversations(address user) external view returns (address[] memory) {
        return convos[user];
    }

    function getMessageCount() external view returns (uint64) {
        return messageCount;
    }
}
