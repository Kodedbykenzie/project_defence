// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Imari micro-credential registry
/// @notice Stores ONLY a credential id hash, its content hash, and status.
///         No names, scores or answers are ever written on-chain.
contract ImariCredentialRegistry {
    enum Status { None, Valid, Revoked }

    struct Record {
        bytes32 contentHash;   // keccak256/sha256 of the canonical credential payload
        uint64 issuedAt;
        uint64 revokedAt;
        Status status;
    }

    address public owner;
    bool public paused;
    mapping(address => bool) public issuers;
    mapping(bytes32 => Record) private records; // key = keccak256(bytes(credentialId))

    event IssuerSet(address indexed issuer, bool allowed);
    event CredentialIssued(bytes32 indexed idHash, bytes32 contentHash, uint64 issuedAt);
    event CredentialRevoked(bytes32 indexed idHash, uint64 revokedAt);
    event CredentialReinstated(bytes32 indexed idHash);

    error NotOwner();
    error NotIssuer();
    error AlreadyIssued();
    error UnknownCredential();
    error InvalidStatus();
    error ContractPaused();

    event Paused(bool paused);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyIssuer() {
        if (!issuers[msg.sender]) revert NotIssuer();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    constructor() {
        owner = msg.sender;
        issuers[msg.sender] = true;
        emit IssuerSet(msg.sender, true);
    }

    function setIssuer(address issuer, bool allowed) external onlyOwner {
        issuers[issuer] = allowed;
        emit IssuerSet(issuer, allowed);
    }

    function transferOwnership(address next) external onlyOwner {
        owner = next;
    }

    /// @notice Emergency freeze/unfreeze of all issuance and status changes.
    function setPaused(bool isPaused) external onlyOwner {
        paused = isPaused;
        emit Paused(isPaused);
    }

    /// @param idHash keccak256(bytes("IMR-XXXX-XXXX"))
    function issue(bytes32 idHash, bytes32 contentHash) external onlyIssuer whenNotPaused {
        if (records[idHash].status != Status.None) revert AlreadyIssued();
        records[idHash] = Record(contentHash, uint64(block.timestamp), 0, Status.Valid);
        emit CredentialIssued(idHash, contentHash, uint64(block.timestamp));
    }

    function revoke(bytes32 idHash) external onlyIssuer whenNotPaused {
        Record storage r = records[idHash];
        if (r.status != Status.Valid) revert InvalidStatus();
        r.status = Status.Revoked;
        r.revokedAt = uint64(block.timestamp);
        emit CredentialRevoked(idHash, r.revokedAt);
    }

    function reinstate(bytes32 idHash) external onlyIssuer whenNotPaused {
        Record storage r = records[idHash];
        if (r.status != Status.Revoked) revert InvalidStatus();
        r.status = Status.Valid;
        r.revokedAt = 0;
        emit CredentialReinstated(idHash);
    }

    function get(bytes32 idHash) external view returns (Record memory) {
        return records[idHash];
    }

    /// @return status 0 none · 1 valid · 2 revoked
    /// @return matches true only when the credential is currently Valid AND the
    ///         presented hash equals the anchored hash. A revoked credential never matches.
    function verify(bytes32 idHash, bytes32 presentedHash) external view returns (Status status, bool matches) {
        Record memory r = records[idHash];
        return (r.status, r.status == Status.Valid && r.contentHash == presentedHash);
    }
}
