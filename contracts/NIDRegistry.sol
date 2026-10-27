// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title NIDRegistry
 * @dev Decentralized Public Key Infrastructure (DPKI), Revocation Registry,
 *      and Guardian Social Recovery system for Bangladesh NID Self-Sovereign Identity.
 * @author Md. Tanvir Islam (Thesis PoC)
 */
contract NIDRegistry {
    // ==========================================
    // STATE VARIABLES
    // ==========================================

    // Trust Anchor (DPKI)
    address public issuer;
    bytes public issuerPublicKey;

    // Revocation Registry: Root Identity Commitment Hash => status
    mapping(bytes32 => bool) public registeredCredentials;
    mapping(bytes32 => bool) public isRevoked;

    // Social Recovery Registry
    mapping(address => address[3]) private citizenGuardiansMap;
    mapping(address => bool) public hasGuardians;
    mapping(address => address) public citizenActiveKey;

    struct RecoveryVote {
        address proposedKey;
        uint8 voteCount;
        bool executed;
        mapping(address => bool) votes;
    }

    // citizen address => active recovery proposal
    mapping(address => RecoveryVote) private recoveryProposals;

    // ==========================================
    // EVENTS (GAS INSTRUMENTATION)
    // ==========================================
    event IssuerPublicKeyUpdated(bytes publicKey);
    event IssuerTransferred(address indexed oldIssuer, address indexed newIssuer);
    event CredentialRegistered(bytes32 indexed credentialHash, uint256 timestamp);
    event CredentialRevoked(bytes32 indexed credentialHash, uint256 timestamp);
    event GuardiansRegistered(address indexed citizen, address[3] guardians);
    event RecoveryInitiated(address indexed citizen, address indexed proposedKey, address indexed guardian);
    event RecoverySupported(address indexed citizen, address indexed proposedKey, address indexed guardian, uint8 currentVotes);
    event RecoveryExecuted(address indexed citizen, address indexed oldKey, address indexed newKey);

    // ==========================================
    // MODIFIERS & CONSTRUCTOR
    // ==========================================
    modifier onlyIssuer() {
        require(msg.sender == issuer, "NIDRegistry: Only authorized Government Issuer can call");
        _;
    }

    constructor(bytes memory _initialIssuerPublicKey) {
        require(_initialIssuerPublicKey.length > 0, "NIDRegistry: Issuer public key required");
        issuer = msg.sender;
        issuerPublicKey = _initialIssuerPublicKey;
        emit IssuerPublicKeyUpdated(_initialIssuerPublicKey);
    }

    // ==========================================
    // 1. TRUST ANCHOR FUNCTIONS (DPKI)
    // ==========================================

    /**
     * @dev Updates the authorized Government Issuer public signing key.
     * @param _newPublicKey Raw public key bytes of the Government Issuer.
     */
    function updateIssuerPublicKey(bytes calldata _newPublicKey) external onlyIssuer {
        require(_newPublicKey.length > 0, "NIDRegistry: Invalid public key length");
        issuerPublicKey = _newPublicKey;
        emit IssuerPublicKeyUpdated(_newPublicKey);
    }

    /**
     * @dev Transfers the Issuer role to a new address.
     * @param _newIssuer Address of the new issuer.
     */
    function transferIssuer(address _newIssuer) external onlyIssuer {
        require(_newIssuer != address(0), "NIDRegistry: Invalid new issuer address");
        address oldIssuer = issuer;
        issuer = _newIssuer;
        emit IssuerTransferred(oldIssuer, _newIssuer);
    }

    // ==========================================
    // 2. REVOCATION REGISTRY FUNCTIONS
    // ==========================================

    /**
     * @dev Registers an authentic Root Identity Commitment hash on-chain.
     * @param credentialHash SHA-256 / Keccak-256 digest of the authenticated Root Identity Commitment.
     */
    function registerCredential(bytes32 credentialHash) external onlyIssuer {
        require(credentialHash != bytes32(0), "NIDRegistry: Invalid credential hash");
        require(!registeredCredentials[credentialHash], "NIDRegistry: Credential already registered");

        registeredCredentials[credentialHash] = true;
        emit CredentialRegistered(credentialHash, block.timestamp);
    }

    /**
     * @dev Revokes a credential commitment (e.g., deceased citizen, canceled NID, key compromise).
     * @param credentialHash SHA-256 / Keccak-256 digest of the credential commitment to revoke.
     */
    function revokeCredential(bytes32 credentialHash) external onlyIssuer {
        require(registeredCredentials[credentialHash], "NIDRegistry: Credential does not exist");
        require(!isRevoked[credentialHash], "NIDRegistry: Credential already revoked");

        isRevoked[credentialHash] = true;
        emit CredentialRevoked(credentialHash, block.timestamp);
    }

    /**
     * @dev Public verification function to check credential validity without exposing citizen identity.
     * @param credentialHash SHA-256 / Keccak-256 digest of the credential commitment.
     * @return bool True if credential exists and is NOT revoked.
     */
    function isCredentialValid(bytes32 credentialHash) external view returns (bool) {
        return registeredCredentials[credentialHash] && !isRevoked[credentialHash];
    }

    // ==========================================
    // 3. SOCIAL RECOVERY FUNCTIONS (EDGE DEVICE LOSS)
    // ==========================================

    /**
     * @dev Allows a citizen to register 3 trusted guardian wallet addresses.
     * @param _guardians Array of 3 distinct guardian addresses.
     */
    function registerGuardians(address[3] calldata _guardians) external {
        require(_guardians[0] != address(0) && _guardians[1] != address(0) && _guardians[2] != address(0), "NIDRegistry: Guardians cannot be zero address");
        require(_guardians[0] != _guardians[1] && _guardians[1] != _guardians[2] && _guardians[0] != _guardians[2], "NIDRegistry: Guardians must be distinct");
        require(_guardians[0] != msg.sender && _guardians[1] != msg.sender && _guardians[2] != msg.sender, "NIDRegistry: Citizen cannot be their own guardian");

        citizenGuardiansMap[msg.sender] = _guardians;
        hasGuardians[msg.sender] = true;
        if (citizenActiveKey[msg.sender] == address(0)) {
            citizenActiveKey[msg.sender] = msg.sender;
        }

        emit GuardiansRegistered(msg.sender, _guardians);
    }

    /**
     * @dev Returns the 3 guardians registered for a citizen.
     */
    function getCitizenGuardians(address citizen) external view returns (address[3] memory) {
        require(hasGuardians[citizen], "NIDRegistry: No guardians registered for citizen");
        return citizenGuardiansMap[citizen];
    }

    /**
     * @dev Helper to check if an address is a guardian for a citizen.
     */
    function isGuardian(address citizen, address account) public view returns (bool) {
        if (!hasGuardians[citizen]) return false;
        address[3] memory guardians = citizenGuardiansMap[citizen];
        return (guardians[0] == account || guardians[1] == account || guardians[2] == account);
    }

    /**
     * @dev Initiates a key recovery process when a citizen loses their device.
     * @param citizen Address of the citizen whose key needs recovery.
     * @param proposedNewKey New device public key/address for the citizen.
     */
    function initiateRecovery(address citizen, address proposedNewKey) external {
        require(hasGuardians[citizen], "NIDRegistry: Citizen has no guardians registered");
        require(isGuardian(citizen, msg.sender), "NIDRegistry: Caller is not a registered guardian");
        require(proposedNewKey != address(0), "NIDRegistry: Invalid proposed new key");

        RecoveryVote storage proposal = recoveryProposals[citizen];

        // Reset proposal if proposing a different new key or previous recovery was executed
        if (proposal.proposedKey != proposedNewKey || proposal.executed) {
            proposal.proposedKey = proposedNewKey;
            proposal.voteCount = 0;
            proposal.executed = false;
            // Clear prior votes
            address[3] memory g = citizenGuardiansMap[citizen];
            proposal.votes[g[0]] = false;
            proposal.votes[g[1]] = false;
            proposal.votes[g[2]] = false;
        }

        require(!proposal.votes[msg.sender], "NIDRegistry: Guardian already voted");

        proposal.votes[msg.sender] = true;
        proposal.voteCount += 1; // BUG FIX: was `= 1` (assignment), must be `+= 1` (increment)

        emit RecoveryInitiated(citizen, proposedNewKey, msg.sender);
    }

    /**
     * @dev Supports an existing key recovery proposal (2nd guardian vote).
     * @param citizen Address of the citizen whose key is being recovered.
     * @param proposedNewKey The new key matching the active proposal.
     */
    function supportRecovery(address citizen, address proposedNewKey) external {
        require(hasGuardians[citizen], "NIDRegistry: Citizen has no guardians registered");
        require(isGuardian(citizen, msg.sender), "NIDRegistry: Caller is not a registered guardian");

        RecoveryVote storage proposal = recoveryProposals[citizen];
        require(!proposal.executed, "NIDRegistry: Recovery already executed");
        require(proposal.proposedKey == proposedNewKey, "NIDRegistry: Proposed key mismatch");
        require(!proposal.votes[msg.sender], "NIDRegistry: Guardian already voted for this recovery");

        proposal.votes[msg.sender] = true;
        proposal.voteCount += 1;

        emit RecoverySupported(citizen, proposedNewKey, msg.sender, proposal.voteCount);

        // Consensus threshold: 2 of 3 guardians
        if (proposal.voteCount >= 2) {
            address oldKey = citizenActiveKey[citizen] == address(0) ? citizen : citizenActiveKey[citizen];
            citizenActiveKey[citizen] = proposedNewKey;
            proposal.executed = true;

            emit RecoveryExecuted(citizen, oldKey, proposedNewKey);
        }
    }

    /**
     * @dev Returns details of an active recovery proposal.
     */
    function getRecoveryStatus(address citizen) external view returns (address proposedKey, uint8 voteCount, bool executed) {
        RecoveryVote storage proposal = recoveryProposals[citizen];
        return (proposal.proposedKey, proposal.voteCount, proposal.executed);
    }
}
