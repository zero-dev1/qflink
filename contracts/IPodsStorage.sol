// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Interface for QFLinkPodsStorage
interface IPodsStorage {
    // Write functions (authorized only)
    function createPod(bytes32 name, address creator, bool isPublic, uint256 threshold, bytes32 category, bytes calldata description) external returns (uint64);
    function setPodTier(uint64 podId, uint8 tier) external;
    function addMember(uint64 podId, address user) external;
    function removeMember(uint64 podId, address user) external;
    function setBanned(uint64 podId, address user, bool status) external;
    function banAndRemove(uint64 podId, address user, address caller) external;
    function unbanUser(uint64 podId, address user, address caller) external;
    function addModInternal(uint64 podId, address user, address caller) external;
    function removeModInternal(uint64 podId, address user, address caller) external;
    function joinInternal(uint64 podId, address user, uint64 freeCap) external;
    function leaveInternal(uint64 podId, address user) external;
    function createPodFull(bytes32 name, address creator, bool isPublic, uint256 threshold, uint8 tier, bytes32 category, bytes calldata description) external returns (uint64);
    function setMod(uint64 podId, address user, bool status) external;
    function incrementModCount(uint64 podId) external;
    function decrementModCount(uint64 podId) external;
    
    // View functions
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
    );
    function isMember(uint64 podId, address user) external view returns (bool);
    function isBanned(uint64 podId, address user) external view returns (bool);
    function isMod(uint64 podId, address user) external view returns (bool);
    function getPodCount() external view returns (uint64);
    function getCreator(uint64 podId) external view returns (address);
    function getPodTier(uint64 podId) external view returns (uint8);
    function getMemberCount(uint64 podId) external view returns (uint64);
    function getModCount(uint64 podId) external view returns (uint64);
    function getThreshold(uint64 podId) external view returns (uint256);
    function getPodName(uint64 podId) external view returns (bytes32);
    function isPublic(uint64 podId) external view returns (bool);
    
    // Admin
    function owner() external view returns (address);
    function authorized() external view returns (address);
    function setAuthorized(address _auth) external;
}
