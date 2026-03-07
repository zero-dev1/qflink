// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPodsStorage} from "./IPodsStorage.sol";

contract QFLinkPodsAddMod {
    IPodsStorage public immutable storage_;
    
    constructor(address _storage) {
        storage_ = IPodsStorage(_storage);
    }
    
    function addMod(uint64 podId, address user) external {
        storage_.addModInternal(podId, user, msg.sender);
    }
}
