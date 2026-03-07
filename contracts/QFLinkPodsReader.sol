// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPodsStorage} from "./IPodsStorage.sol";

// QFLinkPodsReader — All view functions (no auth needed)
// Read passthroughs only, no writes
// ~42 KB total

contract QFLinkPodsReader {
    // ============ Immutable Reference ============
    
    IPodsStorage public immutable storage_;
    
    // ============ Constructor ============
    
    constructor(address _storage) {
        storage_ = IPodsStorage(_storage);
    }
    
    // ============ Pod Info ============
    
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
        return storage_.getPod(podId);
    }
    
    function getCreator(uint64 podId) external view returns (address) {
        return storage_.getCreator(podId);
    }
    
    function getPodTier(uint64 podId) external view returns (uint8) {
        return storage_.getPodTier(podId);
    }
    
    function getPodCount() external view returns (uint64) {
        return storage_.getPodCount();
    }
    
    function getMemberCount(uint64 podId) external view returns (uint64) {
        return storage_.getMemberCount(podId);
    }
    
    function getModCount(uint64 podId) external view returns (uint64) {
        return storage_.getModCount(podId);
    }
    
    function getThreshold(uint64 podId) external view returns (uint256) {
        return storage_.getThreshold(podId);
    }
    
    function getPodName(uint64 podId) external view returns (bytes32) {
        return storage_.getPodName(podId);
    }
    
    function isPublic(uint64 podId) external view returns (bool) {
        return storage_.isPublic(podId);
    }
    
    // ============ Membership ============
    
    function isMember(uint64 podId, address user) external view returns (bool) {
        return storage_.isMember(podId, user);
    }
    
    function isBanned(uint64 podId, address user) external view returns (bool) {
        return storage_.isBanned(podId, user);
    }
    
    function isMod(uint64 podId, address user) external view returns (bool) {
        return storage_.isMod(podId, user);
    }
    
    // ============ Access Check ============
    
    function checkPodAccess(uint64 podId, address user) external view returns (bool) {
        // Creator always has access
        address creator = storage_.getCreator(podId);
        if (user == creator) return true;
        
        // Check if banned
        if (storage_.isBanned(podId, user)) return false;
        
        // Check if member
        if (storage_.isMember(podId, user)) return true;
        
        // For public pods, check threshold
        (,,bool isPublicPod,,,,uint256 threshold,,) = storage_.getPod(podId);
        if (isPublicPod) {
            if (threshold > 0 && user.balance < threshold) return false;
            return true;
        }
        
        return false;
    }
}
