// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPodsStorage} from "./IPodsStorage.sol";

contract QFLinkPodsGetPod {
    IPodsStorage public immutable storage_;

    constructor(address _storage) {
        storage_ = IPodsStorage(_storage);
    }

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

    function checkPodAccess(uint64 podId, address user) external view returns (bool) {
        address creator = storage_.getCreator(podId);
        if (user == creator) return true;
        if (storage_.isBanned(podId, user)) return false;
        if (storage_.isMember(podId, user)) return true;
        (,,bool isPublicPod,,,,uint256 threshold,,) = storage_.getPod(podId);
        if (isPublicPod) {
            if (threshold > 0 && user.balance < threshold) return false;
            return true;
        }
        return false;
    }
}
