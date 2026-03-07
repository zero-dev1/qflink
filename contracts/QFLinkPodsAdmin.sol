// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPodsStorage} from "./IPodsStorage.sol";

// QFLinkPodsAdmin — Single function: upgradePod
// Max 3 external calls: ~22 KB

// Custom errors
error NotCreator();
error AlreadyPro();

contract QFLinkPodsAdmin {
    // ============ Immutable Reference ============
    
    IPodsStorage public immutable storage_;
    
    // ============ Constructor ============
    
    constructor(address _storage) {
        storage_ = IPodsStorage(_storage);
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
}
