// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPodsStorage} from "./IPodsStorage.sol";
import {IPayments} from "./IPayments.sol";

// QFLinkPodsLogic — Business logic, zero own storage
// All state changes go through Storage contract
// Payment checks go through Payments contract

// Custom errors
error NotCreator();
error NotMember();
error AlreadyMember();
error PodFull();
error InsufficientBalance();
error PaymentRequired();
error ModCapReached();
error AlreadyPro();
error Banned();
error NotModOrCreator();
error CannotBanCreator();
error NotMod();
error AlreadyMod();
error PodNotFound();
error CreatorCantLeave();
error InvalidName();

contract QFLinkPodsLogic {
    // ============ Immutable References ============
    
    IPodsStorage public immutable storage_;
    IPayments public immutable payments;
    
    // ============ Constants ============
    
    uint64 constant FREE_POD_MEMBER_CAP = 50;
    uint64 constant FREE_POD_MOD_CAP = 1;
    uint64 constant PRO_POD_MOD_CAP = 3;
    
    // ============ Constructor ============
    
    constructor(address _storage, address _payments) {
        storage_ = IPodsStorage(_storage);
        payments = IPayments(_payments);
    }
    
    // ============ Internal Helpers ============
    
    function _isCreator(uint64 podId, address user) internal view returns (bool) {
        return storage_.getCreator(podId) == user;
    }
    
    function _isMember(uint64 podId, address user) internal view returns (bool) {
        return storage_.isMember(podId, user);
    }
    
    function _isBanned(uint64 podId, address user) internal view returns (bool) {
        return storage_.isBanned(podId, user);
    }
    
    function _isMod(uint64 podId, address user) internal view returns (bool) {
        return storage_.isMod(podId, user);
    }
    
    function _podExists(uint64 podId) internal view returns (bool) {
        // Pod exists if creator is not zero address
        return storage_.getCreator(podId) != address(0);
    }
    
    // ============ Pod Management ============
    
    function createPod(
        bytes32 name,
        bool isPublic,
        uint256 threshold
    ) external returns (uint64) {
        if (name == bytes32(0)) revert InvalidName();
        
        // Create pod in storage
        uint64 podId = storage_.createPod(name, msg.sender, isPublic, threshold, bytes32(0), "");
        
        // Auto-add creator as member and mod
        storage_.addMember(podId, msg.sender);
        storage_.setMod(podId, msg.sender, true);
        storage_.incrementModCount(podId);
        
        return podId;
    }
    
    function joinPod(uint64 podId) external payable {
        if (!_podExists(podId)) revert PodNotFound();
        
        // Check not banned
        if (_isBanned(podId, msg.sender)) revert Banned();
        
        // Check not already member
        if (_isMember(podId, msg.sender)) revert AlreadyMember();
        
        // Get pod tier for member cap check
        uint8 tier = storage_.getPodTier(podId);
        
        // Check member cap for Free pods
        if (tier == 0) {
            uint64 memberCount = storage_.getMemberCount(podId);
            if (memberCount >= FREE_POD_MEMBER_CAP) revert PodFull();
        }
        
        // Check token gate (threshold)
        uint256 threshold = storage_.getThreshold(podId);
        if (threshold > 0) {
            if (address(msg.sender).balance < threshold) revert InsufficientBalance();
        }
        
        // Check payment if entry fee exists
        uint256 entryFee = payments.getEntryFee(podId);
        if (entryFee > 0) {
            if (!payments.hasPaid(podId, msg.sender)) {
                // Process payment through Payments contract
                payments.processPayment{value: msg.value}(podId, msg.sender);
            }
        }
        
        // Add member
        storage_.addMember(podId, msg.sender);
    }
    
    function leavePod(uint64 podId) external {
        if (!_podExists(podId)) revert PodNotFound();
        
        // Check is member
        if (!_isMember(podId, msg.sender)) revert NotMember();
        
        // Check not creator
        if (_isCreator(podId, msg.sender)) revert CreatorCantLeave();
        
        // If mod, remove mod status and decrement count
        if (_isMod(podId, msg.sender)) {
            storage_.setMod(podId, msg.sender, false);
            storage_.decrementModCount(podId);
        }
        
        // Remove member
        storage_.removeMember(podId, msg.sender);
    }
    
    function upgradePod(uint64 podId) external payable {
        if (!_podExists(podId)) revert PodNotFound();
        
        // Check is creator
        if (!_isCreator(podId, msg.sender)) revert NotCreator();
        
        // Check tier is Free
        uint8 tier = storage_.getPodTier(podId);
        if (tier != 0) revert AlreadyPro();
        
        // Payment is handled by Payments contract via msg.value
        // Payments contract handles the fee distribution
        
        // Upgrade to Pro
        storage_.setPodTier(podId, 1);
    }
    
    // ============ Moderation ============
    
    function banMember(uint64 podId, address user) external {
        if (!_podExists(podId)) revert PodNotFound();
        
        // Check caller is creator or mod
        if (!_isCreator(podId, msg.sender) && !_isMod(podId, msg.sender)) {
            revert NotModOrCreator();
        }
        
        // Cannot ban creator
        if (_isCreator(podId, user)) revert CannotBanCreator();
        
        // Set banned
        storage_.setBanned(podId, user, true);
        
        // Remove from members if they are a member
        if (_isMember(podId, user)) {
            // If mod, remove mod status
            if (_isMod(podId, user)) {
                storage_.setMod(podId, user, false);
                storage_.decrementModCount(podId);
            }
            storage_.removeMember(podId, user);
        }
    }
    
    function unbanMember(uint64 podId, address user) external {
        if (!_podExists(podId)) revert PodNotFound();
        
        // Check caller is creator or mod
        if (!_isCreator(podId, msg.sender) && !_isMod(podId, msg.sender)) {
            revert NotModOrCreator();
        }
        
        storage_.setBanned(podId, user, false);
    }
    
    function addMod(uint64 podId, address user) external {
        if (!_podExists(podId)) revert PodNotFound();
        
        // Check caller is creator
        if (!_isCreator(podId, msg.sender)) revert NotCreator();
        
        // Check user is member
        if (!_isMember(podId, user)) revert NotMember();
        
        // Check mod cap based on tier
        uint8 tier = storage_.getPodTier(podId);
        uint64 modCount = storage_.getModCount(podId);
        uint64 maxMods = tier == 0 ? FREE_POD_MOD_CAP : PRO_POD_MOD_CAP;
        
        if (modCount >= maxMods) revert ModCapReached();
        
        // Check not already mod
        if (_isMod(podId, user)) revert AlreadyMod();
        
        // Set mod
        storage_.setMod(podId, user, true);
        storage_.incrementModCount(podId);
    }
    
    function removeMod(uint64 podId, address user) external {
        if (!_podExists(podId)) revert PodNotFound();
        
        // Check caller is creator
        if (!_isCreator(podId, msg.sender)) revert NotCreator();
        
        // Check target not creator
        if (_isCreator(podId, user)) revert CannotBanCreator();
        
        // Check target is mod
        if (!_isMod(podId, user)) revert NotMod();
        
        // Remove mod
        storage_.setMod(podId, user, false);
        storage_.decrementModCount(podId);
    }
    
    // ============ View Functions (Passthrough) ============
    
    function getPod(uint64 podId) external view returns (
        bytes32 name,
        address creator,
        bool isPublic,
        uint8 tier,
        uint64 memberCount,
        uint64 modCount,
        uint256 threshold
    ) {
        (name, creator, isPublic, tier, memberCount, modCount, threshold,,) = storage_.getPod(podId);
    }
    
    function isMember(uint64 podId, address user) external view returns (bool) {
        return storage_.isMember(podId, user);
    }
    
    function isBanned(uint64 podId, address user) external view returns (bool) {
        return storage_.isBanned(podId, user);
    }
    
    function isMod(uint64 podId, address user) external view returns (bool) {
        return storage_.isMod(podId, user);
    }
    
    function getPodCount() external view returns (uint64) {
        return storage_.getPodCount();
    }
    
    function getCreator(uint64 podId) external view returns (address) {
        return storage_.getCreator(podId);
    }
    
    function checkPodAccess(uint64 podId, address user) external view returns (bool) {
        // Check if user has access to pod
        
        // 1. Creator always has access
        if (_isCreator(podId, user)) return true;
        
        // 2. Check if banned
        if (_isBanned(podId, user)) return false;
        
        // 3. Check if member
        if (_isMember(podId, user)) return true;
        
        // 4. For public pods, check threshold and payment
        if (storage_.isPublic(podId)) {
            // Check threshold
            uint256 threshold = storage_.getThreshold(podId);
            if (threshold > 0 && user.balance < threshold) return false;
            
            // Check payment if entry fee exists
            uint256 entryFee = payments.getEntryFee(podId);
            if (entryFee > 0 && !payments.hasPaid(podId, user)) return false;
            
            return true;
        }
        
        return false;
    }
}
