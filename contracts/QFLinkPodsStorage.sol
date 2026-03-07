// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// QFLinkPodsStorage — Pure storage, no business logic
// All write functions gated by authorized address (PodsLogic contract)

// Custom errors
error NotAuthorized();
error NotOwner();

contract QFLinkPodsStorage {
    // ============ State ============
    
    struct Pod {
        bytes32 name;
        address creator;
        bool isPublic;
        uint8 tier;        // 0=Free, 1=Pro
        uint64 memberCount;
        uint64 modCount;
        uint256 threshold; // Token gate threshold
        bytes32 category;  // Pod category (e.g., "trading", "gaming")
        bytes description; // Pod description (max 256 bytes)
    }
    
    // Core pod storage
    mapping(uint64 => Pod) internal pods;
    uint64 internal nextPodId;
    
    // Membership mappings
    mapping(uint64 => mapping(address => bool)) internal members;
    mapping(uint64 => mapping(address => bool)) internal banned;
    mapping(uint64 => mapping(address => bool)) internal mods;
    
    // Access control
    address public owner;
    mapping(address => bool) internal authorized;
    
    // ============ Modifiers ============
    
    modifier onlyAuthorized() {
        if (!authorized[msg.sender]) revert NotAuthorized();
        _;
    }
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    // ============ Constructor ============
    
    constructor(address _auth) {
        owner = msg.sender;
        authorized[_auth] = true;
        nextPodId = 1; // Start from 1 (0 reserved)
    }
    
    // ============ Admin Functions ============
    
    function setAuthorized(address _auth, bool _status) external onlyOwner {
        authorized[_auth] = _status;
    }
    
    // ============ Write Functions (Authorized Only) ============
    
    function createPod(
        bytes32 name,
        address creator,
        bool isPublic,
        uint256 threshold,
        bytes32 category,
        bytes calldata description
    ) external onlyAuthorized returns (uint64) {
        uint64 podId = nextPodId;
        nextPodId++;
        
        // Enforce max 256 bytes for description
        require(description.length <= 256, "Description too long");
        
        pods[podId] = Pod({
            name: name,
            creator: creator,
            isPublic: isPublic,
            tier: 0, // Default to Free
            memberCount: 0,
            modCount: 0,
            threshold: threshold,
            category: category,
            description: description
        });
        
        return podId;
    }
    
    function setPodTier(uint64 podId, uint8 tier) external onlyAuthorized {
        pods[podId].tier = tier;
    }
    
    function addMember(uint64 podId, address user) external onlyAuthorized {
        members[podId][user] = true;
        pods[podId].memberCount++;
    }
    
    function removeMember(uint64 podId, address user) external onlyAuthorized {
        members[podId][user] = false;
        if (pods[podId].memberCount > 0) {
            pods[podId].memberCount--;
        }
    }
    
    function setBanned(uint64 podId, address user, bool status) external onlyAuthorized {
        banned[podId][user] = status;
    }
    
    function banAndRemove(uint64 podId, address user, address caller) external onlyAuthorized {
        // Verify caller is creator or mod
        require(pods[podId].creator == caller || mods[podId][caller], "Not authorized");
        
        // Cannot ban creator
        require(pods[podId].creator != user, "Cannot ban creator");
        
        // Set banned
        banned[podId][user] = true;
        
        // Remove from members if they are a member
        if (members[podId][user]) {
            // If mod, remove mod status and decrement count
            if (mods[podId][user]) {
                mods[podId][user] = false;
                if (pods[podId].modCount > 0) {
                    pods[podId].modCount--;
                }
            }
            
            members[podId][user] = false;
            if (pods[podId].memberCount > 0) {
                pods[podId].memberCount--;
            }
        }
    }
    
    function unbanUser(uint64 podId, address user, address caller) external onlyAuthorized {
        require(pods[podId].creator == caller || mods[podId][caller], "Not authorized");
        banned[podId][user] = false;
    }
    
    function setMod(uint64 podId, address user, bool status) external onlyAuthorized {
        mods[podId][user] = status;
    }
    
    function incrementModCount(uint64 podId) external onlyAuthorized {
        pods[podId].modCount++;
    }
    
    function decrementModCount(uint64 podId) external onlyAuthorized {
        if (pods[podId].modCount > 0) {
            pods[podId].modCount--;
        }
    }
    
    function addModInternal(uint64 podId, address user, address caller) external onlyAuthorized {
        require(pods[podId].creator == caller, "Not creator");
        require(members[podId][user], "Not member");
        require(!mods[podId][user], "Already mod");
        
        uint64 maxMods = 3;
        require(pods[podId].modCount < maxMods, "Mod cap reached");
        
        mods[podId][user] = true;
        pods[podId].modCount++;
    }
    
    function removeModInternal(uint64 podId, address user, address caller) external onlyAuthorized {
        require(pods[podId].creator == caller, "Not creator");
        require(pods[podId].creator != user, "Cannot remove creator");
        require(mods[podId][user], "Not mod");
        
        mods[podId][user] = false;
        if (pods[podId].modCount > 0) {
            pods[podId].modCount--;
        }
    }
    
    function joinInternal(uint64 podId, address user, uint64 freeCap) external onlyAuthorized {
        require(pods[podId].creator != address(0), "Pod not found");
        require(!banned[podId][user], "Banned");
        require(!members[podId][user], "Already member");
        
        if (pods[podId].tier == 0) {
            require(pods[podId].memberCount < freeCap, "Pod full");
        }
        
        if (pods[podId].threshold > 0) {
            require(user.balance >= pods[podId].threshold, "Insufficient balance");
        }
        
        members[podId][user] = true;
        pods[podId].memberCount++;
    }
    
    function leaveInternal(uint64 podId, address user) external onlyAuthorized {
        require(pods[podId].creator != user, "Creator cant leave");
        require(members[podId][user], "Not member");
        
        // If mod, remove mod status
        if (mods[podId][user]) {
            mods[podId][user] = false;
            if (pods[podId].modCount > 0) {
                pods[podId].modCount--;
            }
        }
        
        members[podId][user] = false;
        if (pods[podId].memberCount > 0) {
            pods[podId].memberCount--;
        }
    }
    
    function createPodFull(
        bytes32 name,
        address creator,
        bool isPublic,
        uint256 threshold,
        uint8 tier,
        bytes32 category,
        bytes calldata description
    ) external onlyAuthorized returns (uint64) {
        uint64 podId = nextPodId;
        nextPodId++;
        
        // Enforce max 256 bytes for description
        require(description.length <= 256, "Description too long");
        
        pods[podId] = Pod({
            name: name,
            creator: creator,
            isPublic: isPublic,
            tier: tier,
            memberCount: 1,
            modCount: 1,
            threshold: threshold,
            category: category,
            description: description
        });
        
        members[podId][creator] = true;
        mods[podId][creator] = true;
        
        return podId;
    }
    
    // ============ View Functions ============
    
    function getPod(uint64 podId) external view returns (
        bytes32 name,
        address creator,
        bool isPublic,
        uint8 tier,
        uint64 memberCount,
        uint64 modCount,
        uint256 threshold,
        bytes32 category,
        bytes memory description
    ) {
        Pod storage p = pods[podId];
        return (
            p.name,
            p.creator,
            p.isPublic,
            p.tier,
            p.memberCount,
            p.modCount,
            p.threshold,
            p.category,
            p.description
        );
    }
    
    function isMember(uint64 podId, address user) external view returns (bool) {
        return members[podId][user];
    }
    
    function isBanned(uint64 podId, address user) external view returns (bool) {
        return banned[podId][user];
    }
    
    function isMod(uint64 podId, address user) external view returns (bool) {
        return mods[podId][user];
    }
    
    function getPodCount() external view returns (uint64) {
        return nextPodId - 1; // Subtract 1 since we start from 1
    }
    
    function getCreator(uint64 podId) external view returns (address) {
        return pods[podId].creator;
    }
    
    function getPodTier(uint64 podId) external view returns (uint8) {
        return pods[podId].tier;
    }
    
    function getMemberCount(uint64 podId) external view returns (uint64) {
        return pods[podId].memberCount;
    }
    
    function getModCount(uint64 podId) external view returns (uint64) {
        return pods[podId].modCount;
    }
    
    function getThreshold(uint64 podId) external view returns (uint256) {
        return pods[podId].threshold;
    }
    
    function getPodName(uint64 podId) external view returns (bytes32) {
        return pods[podId].name;
    }
    
    function isPublic(uint64 podId) external view returns (bool) {
        return pods[podId].isPublic;
    }
}
