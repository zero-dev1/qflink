// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPodsStorage} from "./IPodsStorage.sol";

error InvalidName();
error InsufficientCreationFee();
error InvalidSplit();

contract QFLinkPodsCreate {
    IPodsStorage public immutable storage_;

    uint256 public creationFee;
    address public treasury;
    address public burnAddress;
    address public owner;

    uint256 public treasuryShare;
    uint256 public burnShare;
    uint256 constant SHARE_DENOMINATOR = 100;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event CreationFeeUpdated(uint256 oldFee, uint256 newFee);
    event SplitUpdated(uint256 treasuryShare, uint256 burnShare);
    event BurnAddressUpdated(address oldBurn, address newBurn);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _storage, address _treasury) {
        storage_ = IPodsStorage(_storage);
        treasury = _treasury;
        owner = msg.sender;
        creationFee = 500 ether;
        treasuryShare = 95;
        burnShare = 5;
        burnAddress = address(0xdead);
    }

    function setCreationFee(uint256 _fee) external onlyOwner {
        uint256 oldFee = creationFee;
        creationFee = _fee;
        emit CreationFeeUpdated(oldFee, _fee);
    }

    function setSplit(uint256 _treasuryShare, uint256 _burnShare) external onlyOwner {
        if (_treasuryShare + _burnShare != SHARE_DENOMINATOR) revert InvalidSplit();
        treasuryShare = _treasuryShare;
        burnShare = _burnShare;
        emit SplitUpdated(_treasuryShare, _burnShare);
    }

    function setBurnAddress(address _burnAddress) external onlyOwner {
        address oldBurn = burnAddress;
        burnAddress = _burnAddress;
        emit BurnAddressUpdated(oldBurn, _burnAddress);
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function createPod(
        bytes32 name,
        bool isPublic,
        uint256 threshold,
        bytes32 category,
        bytes calldata description
    ) external payable returns (uint64) {
        if (name == bytes32(0)) revert InvalidName();
        if (msg.value != creationFee) revert InsufficientCreationFee();

        uint64 podId = storage_.createPodFull(name, msg.sender, isPublic, threshold, 1, category, description);

        uint256 treasuryAmount = (msg.value * treasuryShare) / SHARE_DENOMINATOR;
        uint256 burnAmount = msg.value - treasuryAmount;

        if (treasuryAmount > 0 && treasury != address(0)) {
            (bool sent, ) = payable(treasury).call{value: treasuryAmount}("");
            require(sent, "Treasury transfer failed");
        }

        if (burnAmount > 0 && burnAddress != address(0)) {
            (bool sent, ) = payable(burnAddress).call{value: burnAmount}("");
            require(sent, "Burn transfer failed");
        }

        return podId;
    }
}
