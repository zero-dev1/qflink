// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPodsStorage} from "./IPodsStorage.sol";
import {IPayments} from "./IPayments.sol";

contract QFLinkPodsJoin {
    IPodsStorage public immutable storage_;
    IPayments public immutable payments;
    address public owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _storage, address _payments) {
        storage_ = IPodsStorage(_storage);
        payments = IPayments(_payments);
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function joinPod(uint64 podId) external payable {
        uint256 entryFee = payments.getEntryFee(podId);
        if (entryFee > 0 && !payments.hasPaid(podId, msg.sender)) {
            payments.processPayment{value: msg.value}(podId, msg.sender);
        }
        storage_.joinInternal(podId, msg.sender, type(uint64).max);
    }
}
