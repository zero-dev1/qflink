QFLink Solidity Contracts — Complete Specification & Implementation Prompt
Context: QFLink is a sovereign on-chain messaging dApp on QF Network (a Polkadot SDK solochain using pallet-revive). The app previously used Rust contracts (qf-polkavm-sdk) but is migrating to Solidity for full viem/MetaMask compatibility. The frontend is already migrated to viem + MetaMask + React/Vite/TypeScript. The contracts need to be rewritten in Solidity with identical functionality and deployed via Remix (https://remix.polkadot.io/) to QF Network (Chain ID 42, ETH-RPC at http://localhost:8545 for local dev, https://archive.mainnet.qfnode.net/eth for mainnet).

Deployment target: pallet-revive via resolc compiler (Polkadot's Remix fork). Solidity ^0.8.20. No OpenZeppelin imports (keeps bytecode small). Each contract must stay under 48KB compiled bytecode.

Three contracts to create:

Contract 1: QFLinkRegistry.sol
Purpose: User profile registration, display names, encryption public keys, wallet linking.

Storage:

struct Profile {
    string displayName;
    bytes32 encryptionPubkey;
    uint64 registeredAt;
    bool exists;
}

mapping(address => Profile) profiles;
mapping(address => address[]) linkedWallets;  // primary -> linked addresses
mapping(address => address) linkedTo;          // linked -> primary
uint64 userCount;
address owner;
mapping(address => bool) globalBans;
Functions:

// Write
function register(string calldata displayName, bytes32 encryptionPubkey) external
function updateProfile(string calldata displayName, bytes32 encryptionPubkey) external
function linkWallet(address wallet) external
function confirmLink(address primary) external
function unlinkWallet(address wallet) external
function globalBan(address user) external          // owner only
function globalUnban(address user) external        // owner only

// Read
function getProfile(address addr) external view returns (string memory displayName, bytes32 encryptionPubkey, uint64 registeredAt)
function getUserCount() external view returns (uint64)
function getLinkedWallets(address addr) external view returns (address[] memory)
function isGloballyBanned(address addr) external view returns (bool)
Rules:

register reverts if profile already exists
getProfile reverts with "User" if profile doesn't exist (frontend handles this as "not registered")
globalBan/globalUnban restricted to owner (deployer)
displayName max 32 bytes
registeredAt is block.timestamp
Contract 2: QFLinkPods.sol
Purpose: Group chat rooms (pods) — create, join, leave, moderate, tiered access.

Storage:

struct Pod {
    uint64 id;
    string name;
    address creator;
    bool isPublic;
    uint8 tier;           // 0=free, 1=basic, 2=pro
    uint128 fee;          // join fee in wei
    uint64 createdAt;
    uint64 memberCount;
    bool exists;
}

mapping(uint64 => Pod) pods;
mapping(uint64 => mapping(address => bool)) members;
mapping(uint64 => address[]) memberList;
mapping(uint64 => mapping(address => bool)) mods;
mapping(uint64 => address[]) modList;
mapping(uint64 => mapping(address => bool)) bans;
mapping(address => uint64[]) userPods;
uint64 podCount;
address owner;
uint128 proFee;
address treasury;
mapping(address => bool) hasPaidPro;
Functions:

// Write
function createPod(string calldata name, bool isPublic, uint128 fee) external returns (uint64)
function joinPod(uint64 podId) external payable
function leavePod(uint64 podId) external
function upgradePod(uint64 podId, uint8 tier) external payable
function banMember(uint64 podId, address member) external
function unbanMember(uint64 podId, address member) external
function addMod(uint64 podId, address member) external
function removeMod(uint64 podId, address member) external
function setProFee(uint128 fee) external             // owner only
function setTreasury(address addr) external           // owner only

// Read
function getPodCount() external view returns (uint64)
function getPod(uint64 podId) external view returns (
    uint64 id, string memory name, address creator, bool isPublic,
    uint8 tier, uint128 fee, uint64 createdAt, uint64 memberCount
)
function getUserPods(address user) external view returns (uint64[] memory)
function getPodMembers(uint64 podId) external view returns (address[] memory)
function getPodMemberCount(uint64 podId) external view returns (uint64)
function checkPodAccess(uint64 podId, address user) external view returns (bool)
function getPodTier(uint64 podId) external view returns (uint8)
function getPodFee(uint64 podId) external view returns (uint128)
function getProFee() external view returns (uint128)
function getTreasury() external view returns (address)
function hasPaid(address user) external view returns (bool)
function isBanned(uint64 podId, address user) external view returns (bool)
function isMod(uint64 podId, address user) external view returns (bool)
function getMods(uint64 podId) external view returns (address[] memory)
Rules:

createPod increments podCount, adds creator as member and mod
joinPod requires msg.value >= fee if pod has a fee, reverts if banned
banMember/unbanMember only by pod creator or mods
addMod/removeMod only by pod creator
upgradePod to tier 2 (pro) requires msg.value >= proFee, sends to treasury
setProFee/setTreasury owner only
Contract 3: QFLinkMessages.sol
Purpose: On-chain messaging — pod messages and direct messages.

Storage:

struct Message {
    uint64 id;
    address sender;
    string content;        // encrypted or plaintext
    uint64 timestamp;
    uint64 podId;          // 0 = direct message
    address recipient;     // for DMs only
}

Message[] messages;
mapping(uint64 => uint64[]) podMessages;     // podId -> message indices
mapping(address => mapping(address => uint64[])) directMessages; // sender -> recipient -> message indices
mapping(address => address[]) conversations;  // user -> list of DM partners
mapping(address => mapping(address => bool)) hasConversation;
uint64 messageCount;
Functions:

// Write
function sendPodMessage(uint64 podId, string calldata content) external
function sendMessage(address recipient, string calldata content) external

// Read
function getMessageCount() external view returns (uint64)
function getPodMessages(uint64 podId, uint64 offset, uint64 limit) external view returns (
    uint64[] memory ids,
    address[] memory senders,
    string[] memory contents,
    uint64[] memory timestamps
)
function getMessages(address user1, address user2, uint64 offset, uint64 limit) external view returns (
    uint64[] memory ids,
    address[] memory senders,
    string[] memory contents,
    uint64[] memory timestamps
)
function getConversations(address user) external view returns (address[] memory)
Rules:

sendPodMessage reverts if sender is not a pod member (requires QFLinkPods address for access check, pass as constructor arg or set via owner)
sendMessage creates conversation entries for both parties
Pagination via offset/limit to avoid gas issues on large histories
content is stored as-is (frontend handles encryption)