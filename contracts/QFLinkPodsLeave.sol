// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPodsStorage} from "./IPodsStorage.sol";

contract QFLinkPodsLeave {
    IPodsStorage public immutable storage_;
    
    constructor(address _storage) {
        storage_ = IPodsStorage(_storage);
    }
    
    function leavePod(uint64 podId) external {
        storage_.leaveInternal(podId, msg.sender);
    }
}
