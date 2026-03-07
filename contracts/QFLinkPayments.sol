// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// QFLinkPayments — Handles entry fees and payment tracking
// Updated: uses authorized mapping instead of single pods address

// Custom errors
error NotAuthorized();
error NotOwner();
error InvalidFee();
error PaymentNotRequired();
error AlreadyPaid();
error InsufficientPayment();

contract QFLinkPayments {
    // ============ State ============
    
    // Entry fee per pod (0 = free)
    mapping(uint64 => uint256) internal entryFees;
    
    // Payment tracking: podId => user => paid
    mapping(uint64 => mapping(address => bool)) internal payments;
    
    // Access control
    address public owner;
    mapping(address => bool) public authorized;
    
    // Treasury for fee collection
    address public treasury;
    
    // Fee split: 95% to creator, 5% to treasury
    uint256 constant CREATOR_SHARE = 95;
    uint256 constant TREASURY_SHARE = 5;
    uint256 constant SHARE_DENOMINATOR = 100;
    
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
    
    constructor(address _treasury) {
        owner = msg.sender;
        treasury = _treasury;
    }
    
    // ============ Admin Functions ============
    
    function setAuthorized(address _auth, bool _status) external onlyOwner {
        authorized[_auth] = _status;
    }
    
    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }
    
    function setEntryFee(uint64 podId, uint256 fee) external onlyAuthorized {
        entryFees[podId] = fee;
    }
    
    // ============ Payment Functions ============
    
    function payEntryFee(uint64 podId) external payable {
        uint256 fee = entryFees[podId];
        
        if (fee == 0) revert PaymentNotRequired();
        if (payments[podId][msg.sender]) revert AlreadyPaid();
        if (msg.value < fee) revert InsufficientPayment();
        
        // Mark as paid
        payments[podId][msg.sender] = true;
    }
    
    function processPayment(uint64 podId, address user) external payable onlyAuthorized {
        uint256 fee = entryFees[podId];
        
        if (fee == 0) return;
        if (payments[podId][user]) return;
        if (msg.value < fee) revert InsufficientPayment();
        
        // Mark as paid
        payments[podId][user] = true;
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
}