// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPodsStorage} from "./IPodsStorage.sol";
import {IPayments} from "./IPayments.sol";

contract QFLinkPodsJoin {
    IPodsStorage public immutable storage_;
    IPayments public immutable payments;
    uint64 constant FREE_POD_MEMBER_CAP = 50;
    
    constructor(address _storage, address _payments) {
        storage_ = IPodsStorage(_storage);
        payments = IPayments(_payments);
    }
    
    function joinPod(uint64 podId) external payable {
        uint256 entryFee = payments.getEntryFee(podId);
        if (entryFee > 0 && !payments.hasPaid(podId, msg.sender)) {
            payments.processPayment{value: msg.value}(podId, msg.sender);
        }
        storage_.joinInternal(podId, msg.sender, FREE_POD_MEMBER_CAP);
    }
}
