// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title QFLinkContentStore — String-only storage (resolc/PolkaVM optimized)
contract QFLinkContentStore {
    error NotAuthorized();
    error NotOwner();

    mapping(uint64 => string) internal contents;

    address public immutable owner;
    address public authorized;

    constructor(address _auth) {
        owner = msg.sender;
        authorized = _auth;
    }

    function setAuthorized(address _auth) external {
        if (msg.sender != owner) revert NotOwner();
        authorized = _auth;
    }

    function store(uint64 id, string calldata content) external {
        if (msg.sender != authorized) revert NotAuthorized();
        contents[id] = content;
    }

    function get(uint64 id) external view returns (string memory) {
        return contents[id];
    }
}
