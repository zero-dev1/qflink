// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPayments {
    function setEntryFee(uint64 podId, uint256 fee) external;
    function getEntryFee(uint64 podId) external view returns (uint256);
    function hasPaid(uint64 podId, address user) external view returns (bool);
    function processPayment(uint64 podId, address user) external payable;
}
