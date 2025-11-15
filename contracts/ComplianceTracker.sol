// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ERC2771Context} from "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";

/**
 * @title ComplianceTracker
 * @notice Tracks compliance metadata for all treasury transactions
 * @dev Provides categorization, tagging, and reporting for regulatory compliance
 */
contract ComplianceTracker is AccessControl, Pausable, ERC2771Context {
    event TrustedForwarderUpdated(address indexed forwarder, address indexed updater);
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant COMPLIANCE_OFFICER_ROLE = keccak256("COMPLIANCE_OFFICER_ROLE");

    enum TransactionCategory {
        PAYROLL,
        VENDOR_PAYMENT,
        BUDGET_ALLOCATION,
        INTERNAL_TRANSFER,
        REFUND,
        EXPENSE_REIMBURSEMENT,
        TAX_PAYMENT,
        LOAN,
        INVESTMENT,
        OTHER
    }

    enum RiskLevel {
        LOW,
        MEDIUM,
        HIGH,
        CRITICAL
    }

    struct ComplianceEntry {
        uint256 id;
        bytes32 transactionHash;      // Hash of the original transaction
        address contractAddress;       // Which contract executed the transaction
        address from;                  // Sender
        address to;                    // Recipient
        uint256 amount;                // Transaction amount

        TransactionCategory category;
        RiskLevel riskLevel;

        string description;            // Human-readable description
        string purpose;                // Business purpose
        string jurisdiction;           // Legal jurisdiction (e.g., "US", "EU")

        bytes32[] tags;                // Custom tags for filtering
        string[] attachments;          // IPFS hashes of supporting documents

        uint256 timestamp;
        address recordedBy;            // Who added this entry
        bool flagged;                  // Flagged for review
        string flagReason;             // Reason for flagging

        bool reviewed;                 // Has been reviewed by compliance
        address reviewedBy;            // Who reviewed it
        uint256 reviewedAt;            // When reviewed
        string reviewNotes;            // Compliance officer notes
    }

    uint256 public entryCount;
    mapping(uint256 => ComplianceEntry) public entries;
    mapping(bytes32 => uint256) public transactionHashToEntry;  // Quick lookup by tx hash
    mapping(address => uint256[]) public entriesByContract;     // Entries by contract
    mapping(TransactionCategory => uint256[]) public entriesByCategory;  // Entries by category
    address private _trustedForwarder;

    // Policy configuration
    uint256 public highRiskThreshold = 50000 * 10**6;  // $50k in USDC (6 decimals)
    mapping(address => bool) public blacklistedAddresses;
    mapping(string => bool) public restrictedJurisdictions;

    // Events
    event EntryRecorded(
        uint256 indexed entryId,
        bytes32 indexed transactionHash,
        address indexed contractAddress,
        TransactionCategory category,
        uint256 amount
    );

    event EntryFlagged(
        uint256 indexed entryId,
        string reason,
        address flaggedBy
    );

    event EntryReviewed(
        uint256 indexed entryId,
        address indexed reviewer,
        bool approved
    );

    event EntryUpdated(uint256 indexed entryId);
    event PolicyUpdated(string policyType, string details);
    event AddressBlacklisted(address indexed account, string reason);
    event AddressWhitelisted(address indexed account);

    constructor(address trustedForwarder) ERC2771Context(trustedForwarder) {
        require(trustedForwarder != address(0), "Invalid forwarder");
        _trustedForwarder = trustedForwarder;
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _grantRole(ADMIN_ROLE, _msgSender());
        _grantRole(COMPLIANCE_OFFICER_ROLE, _msgSender());
    }

    function setTrustedForwarder(address newForwarder) external onlyRole(ADMIN_ROLE) {
        require(newForwarder != address(0), "Invalid forwarder");
        _trustedForwarder = newForwarder;
        emit TrustedForwarderUpdated(newForwarder, _msgSender());
    }

    function trustedForwarder() external view returns (address) {
        return _trustedForwarder;
    }

    /**
     * @notice Record a new compliance entry for a transaction
     */
    function recordEntry(
        bytes32 transactionHash,
        address contractAddress,
        address from,
        address to,
        uint256 amount,
        TransactionCategory category,
        string memory description,
        string memory purpose,
        string memory jurisdiction
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) returns (uint256) {
        require(transactionHash != bytes32(0), "Invalid transaction hash");
        // Store entryId + 1 to differentiate from unset (0)
        require(transactionHashToEntry[transactionHash] == 0, "Entry already exists");

        uint256 entryId = entryCount++;

        ComplianceEntry storage entry = entries[entryId];
        entry.id = entryId;
        entry.transactionHash = transactionHash;
        entry.contractAddress = contractAddress;
        entry.from = from;
        entry.to = to;
        entry.amount = amount;
        entry.category = category;
        entry.description = description;
        entry.purpose = purpose;
        entry.jurisdiction = jurisdiction;
        entry.timestamp = block.timestamp;
        entry.recordedBy = _msgSender();

        // Auto-calculate risk level
        entry.riskLevel = calculateRiskLevel(amount, to, jurisdiction);

        // Auto-flag if necessary
        if (entry.riskLevel == RiskLevel.HIGH || entry.riskLevel == RiskLevel.CRITICAL) {
            entry.flagged = true;
            entry.flagReason = "Auto-flagged: High risk transaction";
        }

        if (blacklistedAddresses[to]) {
            entry.flagged = true;
            entry.flagReason = "Recipient is blacklisted";
        }

        if (restrictedJurisdictions[jurisdiction]) {
            entry.flagged = true;
            entry.flagReason = "Restricted jurisdiction";
        }

        // Index the entry (store entryId + 1 to avoid confusion with unset value 0)
        transactionHashToEntry[transactionHash] = entryId + 1;
        entriesByContract[contractAddress].push(entryId);
        entriesByCategory[category].push(entryId);

        emit EntryRecorded(entryId, transactionHash, contractAddress, category, amount);

        if (entry.flagged) {
            emit EntryFlagged(entryId, entry.flagReason, _msgSender());
        }

        return entryId;
    }

    /**
     * @notice Calculate risk level based on transaction parameters
     */
    function calculateRiskLevel(
        uint256 amount,
        address recipient,
        string memory jurisdiction
    ) internal view returns (RiskLevel) {
        // Check amount threshold
        if (amount >= highRiskThreshold) {
            return RiskLevel.HIGH;
        }

        // Check blacklist
        if (blacklistedAddresses[recipient]) {
            return RiskLevel.CRITICAL;
        }

        // Check restricted jurisdictions
        if (restrictedJurisdictions[jurisdiction]) {
            return RiskLevel.HIGH;
        }

        // Medium risk for amounts between $10k and $50k
        if (amount >= 10000 * 10**6) {
            return RiskLevel.MEDIUM;
        }

        return RiskLevel.LOW;
    }

    /**
     * @notice Update compliance entry with additional information
     */
    function updateEntry(
        uint256 entryId,
        string memory description,
        string memory purpose,
        bytes32[] memory tags,
        string[] memory attachments
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) {
        require(entryId < entryCount, "Entry does not exist");

        ComplianceEntry storage entry = entries[entryId];

        if (bytes(description).length > 0) {
            entry.description = description;
        }

        if (bytes(purpose).length > 0) {
            entry.purpose = purpose;
        }

        if (tags.length > 0) {
            entry.tags = tags;
        }

        if (attachments.length > 0) {
            entry.attachments = attachments;
        }

        emit EntryUpdated(entryId);
    }

    /**
     * @notice Flag an entry for review
     */
    function flagEntry(uint256 entryId, string memory reason) external onlyRole(COMPLIANCE_OFFICER_ROLE) {
        require(entryId < entryCount, "Entry does not exist");

        ComplianceEntry storage entry = entries[entryId];
        entry.flagged = true;
        entry.flagReason = reason;

        emit EntryFlagged(entryId, reason, _msgSender());
    }

    /**
     * @notice Review a flagged entry
     */
    function reviewEntry(
        uint256 entryId,
        bool approved,
        string memory notes
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) {
        require(entryId < entryCount, "Entry does not exist");

        ComplianceEntry storage entry = entries[entryId];
        entry.reviewed = true;
        entry.reviewedBy = _msgSender();
        entry.reviewedAt = block.timestamp;
        entry.reviewNotes = notes;

        if (approved) {
            entry.flagged = false;
        }

        emit EntryReviewed(entryId, _msgSender(), approved);
    }

    /**
     * @notice Get entries by date range
     */
    function getEntriesByDateRange(
        uint256 startTime,
        uint256 endTime
    ) external view returns (uint256[] memory) {
        require(startTime < endTime, "Invalid date range");

        uint256 matchCount = 0;

        // Count matches
        for (uint256 i = 0; i < entryCount; i++) {
            if (entries[i].timestamp >= startTime && entries[i].timestamp <= endTime) {
                matchCount++;
            }
        }

        // Collect matching IDs
        uint256[] memory matchingEntries = new uint256[](matchCount);
        uint256 index = 0;

        for (uint256 i = 0; i < entryCount; i++) {
            if (entries[i].timestamp >= startTime && entries[i].timestamp <= endTime) {
                matchingEntries[index] = i;
                index++;
            }
        }

        return matchingEntries;
    }

    /**
     * @notice Get entries by category
     */
    function getEntriesByCategory(TransactionCategory category) external view returns (uint256[] memory) {
        return entriesByCategory[category];
    }

    /**
     * @notice Get entries by contract
     */
    function getEntriesByContract(address contractAddress) external view returns (uint256[] memory) {
        return entriesByContract[contractAddress];
    }

    /**
     * @notice Get entries by amount range
     */
    function getEntriesByAmountRange(
        uint256 minAmount,
        uint256 maxAmount
    ) external view returns (uint256[] memory) {
        require(minAmount < maxAmount, "Invalid amount range");

        uint256 matchCount = 0;

        // Count matches
        for (uint256 i = 0; i < entryCount; i++) {
            if (entries[i].amount >= minAmount && entries[i].amount <= maxAmount) {
                matchCount++;
            }
        }

        // Collect matching IDs
        uint256[] memory matchingEntries = new uint256[](matchCount);
        uint256 index = 0;

        for (uint256 i = 0; i < entryCount; i++) {
            if (entries[i].amount >= minAmount && entries[i].amount <= maxAmount) {
                matchingEntries[index] = i;
                index++;
            }
        }

        return matchingEntries;
    }

    /**
     * @notice Get all flagged entries
     */
    function getFlaggedEntries() external view returns (uint256[] memory) {
        uint256 flaggedCount = 0;

        // Count flagged
        for (uint256 i = 0; i < entryCount; i++) {
            if (entries[i].flagged && !entries[i].reviewed) {
                flaggedCount++;
            }
        }

        // Collect flagged IDs
        uint256[] memory flaggedEntries = new uint256[](flaggedCount);
        uint256 index = 0;

        for (uint256 i = 0; i < entryCount; i++) {
            if (entries[i].flagged && !entries[i].reviewed) {
                flaggedEntries[index] = i;
                index++;
            }
        }

        return flaggedEntries;
    }

    /**
     * @notice Get entry details
     */
    function getEntry(uint256 entryId) external view returns (
        bytes32 transactionHash,
        address contractAddress,
        address from,
        address to,
        uint256 amount,
        TransactionCategory category,
        RiskLevel riskLevel,
        string memory description,
        bool flagged,
        bool reviewed
    ) {
        require(entryId < entryCount, "Entry does not exist");

        ComplianceEntry storage entry = entries[entryId];
        return (
            entry.transactionHash,
            entry.contractAddress,
            entry.from,
            entry.to,
            entry.amount,
            entry.category,
            entry.riskLevel,
            entry.description,
            entry.flagged,
            entry.reviewed
        );
    }

    /**
     * @notice Generate compliance report summary
     */
    function getComplianceReport(
        uint256 startTime,
        uint256 endTime
    ) external view returns (
        uint256 totalTransactions,
        uint256 totalAmount,
        uint256 flaggedCount,
        uint256 highRiskCount,
        uint256[10] memory categoryBreakdown
    ) {
        require(startTime < endTime, "Invalid date range");

        for (uint256 i = 0; i < entryCount; i++) {
            ComplianceEntry storage entry = entries[i];

            if (entry.timestamp >= startTime && entry.timestamp <= endTime) {
                totalTransactions++;
                totalAmount += entry.amount;

                if (entry.flagged) {
                    flaggedCount++;
                }

                if (entry.riskLevel == RiskLevel.HIGH || entry.riskLevel == RiskLevel.CRITICAL) {
                    highRiskCount++;
                }

                categoryBreakdown[uint256(entry.category)]++;
            }
        }

        return (totalTransactions, totalAmount, flaggedCount, highRiskCount, categoryBreakdown);
    }

    /**
     * @notice Update high risk threshold
     */
    function setHighRiskThreshold(uint256 newThreshold) external onlyRole(ADMIN_ROLE) {
        highRiskThreshold = newThreshold;
        emit PolicyUpdated("HIGH_RISK_THRESHOLD", "Threshold updated");
    }

    /**
     * @notice Blacklist an address
     */
    function blacklistAddress(address account, string memory reason) external onlyRole(ADMIN_ROLE) {
        blacklistedAddresses[account] = true;
        emit AddressBlacklisted(account, reason);
    }

    /**
     * @notice Whitelist an address (remove from blacklist)
     */
    function whitelistAddress(address account) external onlyRole(ADMIN_ROLE) {
        blacklistedAddresses[account] = false;
        emit AddressWhitelisted(account);
    }

    /**
     * @notice Restrict a jurisdiction
     */
    function restrictJurisdiction(string memory jurisdiction) external onlyRole(ADMIN_ROLE) {
        restrictedJurisdictions[jurisdiction] = true;
        emit PolicyUpdated("JURISDICTION_RESTRICTED", jurisdiction);
    }

    /**
     * @notice Unrestrict a jurisdiction
     */
    function unrestrictJurisdiction(string memory jurisdiction) external onlyRole(ADMIN_ROLE) {
        restrictedJurisdictions[jurisdiction] = false;
        emit PolicyUpdated("JURISDICTION_UNRESTRICTED", jurisdiction);
    }

    /**
     * @notice Pause contract (emergency)
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function _msgSender()
        internal
        view
        override(Context, ERC2771Context)
        returns (address sender)
    {
        return ERC2771Context._msgSender();
    }

    function _msgData()
        internal
        view
        override(Context, ERC2771Context)
        returns (bytes calldata)
    {
        return ERC2771Context._msgData();
    }

    function isTrustedForwarder(address forwarder)
        public
        view
        override
        returns (bool)
    {
        return forwarder == _trustedForwarder;
    }
}
