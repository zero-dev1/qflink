// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPodsStorage} from "./IPodsStorage.sol";

error NotAuthorized();

contract QFLinkPodsBanSimple {
    IPodsStorage public immutable storage_;
    
    constructor(address _storage) {
        storage_ = IPodsStorage(_storage);
    }
    
    function banMember(uint64 podId, address user) external {
        // Only creator can ban
        address creator = storage_.getCreator(podId);
        require(msg.sender == creator, "Not creator");
        
        // Just set banned - that's it
        storage_.setBanned(podId, user, true);
    }
    
    function unbanMember(uint64 podId, address user) external {
        address creator = storage_.getCreator(podId);
        require(msg.sender == creator, "Not creator");
        
        storage_.setBanned(podId, user, false);
    }
}
