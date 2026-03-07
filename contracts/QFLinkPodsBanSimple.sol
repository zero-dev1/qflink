// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPodsStorage} from "./IPodsStorage.sol";

contract QFLinkPodsBanSimple {
    IPodsStorage public immutable storage_;
    
    constructor(address _storage) {
        storage_ = IPodsStorage(_storage);
    }
    
    function banMember(uint64 podId, address user) external {
        storage_.banAndRemove(podId, user, msg.sender);
    }
    
    function unbanMember(uint64 podId, address user) external {
        storage_.unbanUser(podId, user, msg.sender);
    }
}
