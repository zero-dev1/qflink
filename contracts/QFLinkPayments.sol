// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPodsStorage} from "./IPodsStorage.sol";

// QFLinkPayments — Handles entry fees and payment tracking
// Distributes: 95% to pod creator, 5% to treasury

// Custom errors
error NotAuthorized();
error NotOwner();
error PaymentNotRequired();
error AlreadyPaid();
error InsufficientPayment();

contract QFLinkPayments {
    // ============ State ============
    
    mapping(uint64 => uint256) internal entryFees;
    mapping(uint64 => mapping(address => bool)) internal payments;
    mapping(uint64 => uint256) public creatorRevenue;
    
    address public owner;
    mapping(address => bool) public authorized;
    address public treasury;
    IPodsStorage public immutable storage_;
    
    uint256 constant CREATOR_SHARE = 95;
    uint256 constant TREASURY_SHARE = 5;
    uint256 constant SHARE_DENOMINATOR = 100;
    
    // ============ Events ============
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event PaymentProcessed(
        uint64 indexed podId,
        address indexed user,
        uint256 fee,
        uint256 creatorAmount,
        uint256 treasuryAmount
    );
    
    // ============ Modifiers ============
    
    modifier onlyAuthorized() {
        if (!authorized[msg.sender]) revert NotAuthorized();
        _;
    }
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }
    
    // ============ Constructor ============
    
    constructor(address _treasury, address _storage) {
        owner = msg.sender;
        treasury = _treasury;
        storage_ = IPodsStorage(_storage);
    }
    
    // ============ Admin Functions ============
    
    function setAuthorized(address _auth, bool _status) external onlyOwner {
        authorized[_auth] = _status;
    }
    
    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    function setEntryFee(uint64 podId, uint256 fee) external onlyAuthorized {
        entryFees[podId] = fee;
    }
    
    // ============ Internal Distribution ============
    
    function _distribute(uint64 podId, address user, uint256 amount) internal {
        if (amount == 0) return;
        
        address creator = storage_.getCreator(podId);
        uint256 creatorAmount = (amount * CREATOR_SHARE) / SHARE_DENOMINATOR;
        uint256 treasuryAmount = amount - creatorAmount;
        
        // Accumulate creator revenue for tracking
        creatorRevenue[podId] += creatorAmount;
        
        if (creatorAmount > 0 && creator != address(0)) {
            (bool sent, ) = payable(creator).call{value: creatorAmount}("");
            require(sent, "Creator transfer failed");
        }
        
        if (treasuryAmount > 0 && treasury != address(0)) {
            (bool sent, ) = payable(treasury).call{value: treasuryAmount}("");
            require(sent, "Treasury transfer failed");
        }
        
        emit PaymentProcessed(podId, user, amount, creatorAmount, treasuryAmount);
    }
    
    // ============ Payment Functions ============
    
    function payEntryFee(uint64 podId) external payable {
        uint256 fee = entryFees[podId];
        if (fee == 0) revert PaymentNotRequired();
        if (payments[podId][msg.sender]) revert AlreadyPaid();
        if (msg.value < fee) revert InsufficientPayment();
        
        payments[podId][msg.sender] = true;
        _distribute(podId, msg.sender, msg.value);
    }
    
    function processPayment(uint64 podId, address user) external payable onlyAuthorized {
        uint256 fee = entryFees[podId];
        if (fee == 0) return;
        if (payments[podId][user]) return;
        if (msg.value < fee) revert InsufficientPayment();
        
        payments[podId][user] = true;
        _distribute(podId, user, msg.value);
    }
    
    // ============ Withdrawal Functions ============
    
    function withdraw(uint256 amount) external onlyOwner {
        payable(owner).transfer(amount);
    }
    
    function withdrawToTreasury(uint256 amount) external onlyOwner {
        if (treasury != address(0)) {
            payable(treasury).transfer(amount);
        }
    }
    
    // ============ View Functions ============
    
    function getEntryFee(uint64 podId) external view returns (uint256) {
        return entryFees[podId];
    }
    
    function hasPaid(uint64 podId, address user) external view returns (bool) {
        return payments[podId][user];
    }
    
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    function getCreatorRevenue(uint64 podId) external view returns (uint256) {
        return creatorRevenue[podId];
    }
}
