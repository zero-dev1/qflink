// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPodsStorage} from "./IPodsStorage.sol";
import {IPayments} from "./IPayments.sol";

// QFLinkPodsAdmin — Pod admin functions: upgradePod, setEntryFee
// Max 3 external calls: ~22 KB

// Custom errors
error NotCreator();
error AlreadyPro();

contract QFLinkPodsAdmin {
    // ============ Immutable References ============
    
    IPodsStorage public immutable storage_;
    IPayments public immutable payments;
    
    // ============ Events ============
    
    event EntryFeeUpdated(uint64 indexed podId, uint256 newFee, address indexed creator);
    
    // ============ Constructor ============
    
    constructor(address _storage, address _payments) {
        storage_ = IPodsStorage(_storage);
        payments = IPayments(_payments);
    }
    
    // ============ Upgrade Function ============
    
    function upgradePod(uint64 podId) external payable {
        // Check is creator (1)
        address creator = storage_.getCreator(podId);
        if (msg.sender != creator) revert NotCreator();
        
        // Check tier is Free (1)
        uint8 tier = storage_.getPodTier(podId);
        if (tier != 0) revert AlreadyPro();
        
        // Payment handling is done via msg.value to this contract
        // In production, you'd forward to treasury or burn
        
        // Upgrade to Pro (1)
        storage_.setPodTier(podId, 1);
    }
    
    // ============ Entry Fee Function ============
    
    function setEntryFee(uint64 podId, uint256 fee) external {
        // Check is creator
        address creator = storage_.getCreator(podId);
        if (msg.sender != creator) revert NotCreator();
        
        // Call payments contract to set the fee
        payments.setEntryFee(podId, fee);
        
        // Emit event
        emit EntryFeeUpdated(podId, fee, msg.sender);
    }
}
