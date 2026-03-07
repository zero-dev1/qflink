// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPodsStorage} from "./IPodsStorage.sol";

// QFLinkPodsCreate — Single function: createPod
// Requires 500 QF creation fee, split 95% treasury / 5% burn

// Custom errors
error InvalidName();
error InsufficientCreationFee();

contract QFLinkPodsCreate {
    // ============ Immutable Reference ============
    
    IPodsStorage public immutable storage_;
    
    // ============ Fee Configuration ============
    
    uint256 public constant CREATION_FEE = 500 ether; // 500 QF
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
    
    constructor(address _storage, address _treasury) {
        storage_ = IPodsStorage(_storage);
        treasury = _treasury;
        owner = msg.sender;
    }
    
    // ============ Admin Functions ============
    
    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }
    
    // ============ Create Function ============
    
    function createPod(
        bytes32 name,
        bool isPublic,
        uint256 threshold,
        bytes32 category,
        bytes calldata description
    ) external payable returns (uint64) {
        if (name == bytes32(0)) revert InvalidName();
        if (msg.value != CREATION_FEE) revert InsufficientCreationFee();
        
        // 1. Create pod in storage (tier 1 = Pro equivalent, supports 3 mods)
        uint64 podId = storage_.createPodFull(name, msg.sender, isPublic, threshold, 1, category, description);
        
        // 2. Auto-add creator as member and mod
        storage_.addMember(podId, msg.sender);
        storage_.setMod(podId, msg.sender, true);
        storage_.incrementModCount(podId);
        
        // 3. Distribute creation fee: 95% to treasury, 5% to burn address
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
        
        return podId;
    }
}
