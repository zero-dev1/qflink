// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPodsStorage} from "./IPodsStorage.sol";
import {IPayments} from "./IPayments.sol";

// QFLinkPodsCreatePaid — Creates a Pro pod with entry fee in one transaction
// Single function, single signature

// Custom errors
error InvalidName();
error InsufficientCreationFee();

contract QFLinkPodsCreatePaid {
    // ============ Immutable References ============
    
    IPodsStorage public immutable storage_;
    IPayments public immutable payments;
    
    // ============ Fee Configuration ============
    
    uint256 public creationFee;
    address public treasury;
    address public owner;
    
    // Fee split constants
    uint256 constant TREASURY_SHARE = 95;
    uint256 constant BURN_SHARE = 5;
    uint256 constant SHARE_DENOMINATOR = 100;
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // ============ Constructor ============
    
    constructor(address _storage, address _payments, address _treasury, uint256 _creationFee) {
        storage_ = IPodsStorage(_storage);
        payments = IPayments(_payments);
        treasury = _treasury;
        creationFee = _creationFee;
        owner = msg.sender;
    }
    
    // ============ Admin Functions ============
    
    function setCreationFee(uint256 _fee) external onlyOwner {
        creationFee = _fee;
    }
    
    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }
    
    // ============ Create Paid Pod ============
    
    function createPaidPod(
        bytes32 name,
        bool isPublic,
        uint256 threshold,
        uint256 entryFee,
        bytes32 category,
        bytes calldata description
    ) external payable returns (uint64) {
        if (name == bytes32(0)) revert InvalidName();
        if (msg.value < creationFee) revert InsufficientCreationFee();
        
        // Single call to create pod with creator as member and mod, tier set to Pro
        uint64 podId = storage_.createPodFull(name, msg.sender, isPublic, threshold, 1, category, description);
        
        // Set entry fee on Payments contract
        if (entryFee > 0) {
            payments.setEntryFee(podId, entryFee);
        }
        
        // Distribute creation fee
        if (msg.value > 0) {
            uint256 treasuryAmount = (msg.value * TREASURY_SHARE) / SHARE_DENOMINATOR;
            uint256 burnAmount = msg.value - treasuryAmount;
            
            if (treasuryAmount > 0 && treasury != address(0)) {
                (bool sent, ) = payable(treasury).call{value: treasuryAmount}("");
                require(sent, "Treasury transfer failed");
            }
            
            if (burnAmount > 0) {
                (bool sent, ) = payable(address(0xdead)).call{value: burnAmount}("");
                require(sent, "Burn transfer failed");
            }
        }
        
        return podId;
    }
}
