// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPodsStorage} from "./IPodsStorage.sol";

contract QFLinkPodsRemoveMod {
    IPodsStorage public immutable storage_;
    
    constructor(address _storage) {
        storage_ = IPodsStorage(_storage);
    }
    
    function removeMod(uint64 podId, address user) external {
        storage_.removeModInternal(podId, user, msg.sender);
    }
}
