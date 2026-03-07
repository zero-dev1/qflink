// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPodsStorage} from "./IPodsStorage.sol";

// QFLinkPodsMod — Moderation: ban, unban, addMod, removeMod
// 4 functions only, minimal cross-contract calls

// Custom errors
error NotCreator();
error NotMember();
error NotModOrCreator();
error CannotBanCreator();
error NotMod();
error AlreadyMod();
error ModCapReached();
error PodNotFound();

contract QFLinkPodsMod {
    // ============ Immutable Reference ============
    
    IPodsStorage public immutable storage_;
    
    // ============ Constants ============
    
    uint64 constant FREE_POD_MOD_CAP = 1;
    uint64 constant PRO_POD_MOD_CAP = 3;
    
    // ============ Constructor ============
    
    constructor(address _storage) {
        storage_ = IPodsStorage(_storage);
    }
    
    // ============ Internal Helpers ============
    
    function _isCreator(uint64 podId, address user) internal view returns (bool) {
        return storage_.getCreator(podId) == user;
    }
    
    // ============ Ban/Unban ============
    
    function banMember(uint64 podId, address user) external {
        // Check caller is creator or mod
        bool isCallerMod = storage_.isMod(podId, msg.sender);
        bool isCallerCreator = _isCreator(podId, msg.sender);
        if (!isCallerCreator && !isCallerMod) revert NotModOrCreator();
        
        // Cannot ban creator
        if (_isCreator(podId, user)) revert CannotBanCreator();
        
        // Set banned
        storage_.setBanned(podId, user, true);
        
        // Remove from members if they are a member
        if (storage_.isMember(podId, user)) {
            // If mod, remove mod status
            if (storage_.isMod(podId, user)) {
                storage_.setMod(podId, user, false);
                storage_.decrementModCount(podId);
            }
            storage_.removeMember(podId, user);
        }
    }
    
    function unbanMember(uint64 podId, address user) external {
        // Check caller is creator or mod
        bool isCallerMod = storage_.isMod(podId, msg.sender);
        bool isCallerCreator = _isCreator(podId, msg.sender);
        if (!isCallerCreator && !isCallerMod) revert NotModOrCreator();
        
        storage_.setBanned(podId, user, false);
    }
    
    // ============ Mod Management ============
    
    function addMod(uint64 podId, address user) external {
        // Check caller is creator
        if (!_isCreator(podId, msg.sender)) revert NotCreator();
        
        // Check user is member
        if (!storage_.isMember(podId, user)) revert NotMember();
        
        // Check not already mod
        if (storage_.isMod(podId, user)) revert AlreadyMod();
        
        // Check mod cap based on tier
        uint8 tier = storage_.getPodTier(podId);
        uint64 modCount = storage_.getModCount(podId);
        uint64 maxMods = tier == 0 ? FREE_POD_MOD_CAP : PRO_POD_MOD_CAP;
        
        if (modCount >= maxMods) revert ModCapReached();
        
        // Set mod
        storage_.setMod(podId, user, true);
        storage_.incrementModCount(podId);
    }
    
    function removeMod(uint64 podId, address user) external {
        // Check caller is creator
        if (!_isCreator(podId, msg.sender)) revert NotCreator();
        
        // Check target not creator
        if (_isCreator(podId, user)) revert CannotBanCreator();
        
        // Check target is mod
        if (!storage_.isMod(podId, user)) revert NotMod();
        
        // Remove mod
        storage_.setMod(podId, user, false);
        storage_.decrementModCount(podId);
    }
    
    // ============ View Functions ============
    
    function isBanned(uint64 podId, address user) external view returns (bool) {
        return storage_.isBanned(podId, user);
    }
    
    function isMod(uint64 podId, address user) external view returns (bool) {
        return storage_.isMod(podId, user);
    }
}
