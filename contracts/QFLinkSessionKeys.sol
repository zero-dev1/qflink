// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title QFLinkSessionKeys
/// @notice Manages ephemeral session keys for gasless-popup messaging.
///         A user's main wallet (owner) registers a temporary session key address.
///         That session key can then call messaging contracts as msg.sender,
///         and the messaging contract looks up the owner via this registry.
///
/// Security model:
/// - Session keys can ONLY send messages (no fund transfers, no pod management)
/// - Session keys expire after a user-chosen duration (30m, 1h, 24h)
/// - Owner can revoke at any time
/// - Only one active session key per owner at a time
/// - Session key private key lives in sessionStorage (cleared on tab close)
/// - Session key needs a tiny amount of native token for gas (sent during registration tx)
contract QFLinkSessionKeys {
    struct Session {
        address owner;
        uint64  expiry;
        bool    revoked;
    }

    // sessionKeyAddress => Session
    mapping(address => Session) public sessions;

    // ownerAddress => current active sessionKeyAddress
    mapping(address => address) public activeSessionKey;

    event SessionRegistered(address indexed owner, address indexed sessionKey, uint64 expiry);
    event SessionRevoked(address indexed owner, address indexed sessionKey);

    /// @notice Register a session key. Called by the OWNER wallet (MetaMask popup).
    /// @param sessionKey The address of the ephemeral key generated in the browser.
    /// @param durationSeconds How long the session is valid (e.g., 1800, 3600, 86400).
    function registerSessionKey(address sessionKey, uint256 durationSeconds) external payable {
        require(sessionKey != address(0), "Invalid session key");
        require(sessionKey != msg.sender, "Cannot register self");
        require(durationSeconds >= 300 && durationSeconds <= 86400, "Duration: 5min to 24h");

        // Invalidate previous session key if exists
        address previousKey = activeSessionKey[msg.sender];
        if (previousKey != address(0)) {
            sessions[previousKey].revoked = true;
        }

        uint64 expiry = uint64(block.timestamp) + uint64(durationSeconds);

        sessions[sessionKey] = Session({
            owner: msg.sender,
            expiry: expiry,
            revoked: false
        });
        activeSessionKey[msg.sender] = sessionKey;

        // Fund session key for gas
        if (msg.value > 0) {
            (bool sent, ) = sessionKey.call{value: msg.value}("");
            require(sent, "Gas funding failed");
        }

        emit SessionRegistered(msg.sender, sessionKey, expiry);
    }

    /// @notice Revoke the active session key. Called by the OWNER wallet.
    function revokeSession() external {
        address key = activeSessionKey[msg.sender];
        require(key != address(0), "No active session");

        sessions[key].revoked = true;
        activeSessionKey[msg.sender] = address(0);

        emit SessionRevoked(msg.sender, key);
    }

    /// @notice Check if a session key is currently valid.
    function validateSession(address sessionKey) external view returns (bool valid, address owner) {
        Session memory s = sessions[sessionKey];
        if (s.owner != address(0) && !s.revoked && block.timestamp <= s.expiry) {
            return (true, s.owner);
        }
        return (false, address(0));
    }

    /// @notice Get the owner of a session key (used by messaging contracts).
    function getOwner(address sessionKey) external view returns (address) {
        Session memory s = sessions[sessionKey];
        if (s.owner != address(0) && !s.revoked && block.timestamp <= s.expiry) {
            return s.owner;
        }
        return address(0);
    }

    /// @notice Get session info for an owner's active key.
    function getActiveSession(address owner) external view returns (
        address sessionKey,
        uint64 expiry,
        bool revoked,
        bool isActive
    ) {
        sessionKey = activeSessionKey[owner];
        if (sessionKey == address(0)) {
            return (address(0), 0, false, false);
        }
        Session memory s = sessions[sessionKey];
        return (sessionKey, s.expiry, s.revoked, !s.revoked && block.timestamp <= s.expiry);
    }
}
