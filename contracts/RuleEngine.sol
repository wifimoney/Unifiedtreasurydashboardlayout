// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TreasuryCore} from "./TreasuryCore.sol";

/**
 * @title RuleEngine
 * @notice Automated rule-based distribution system for treasury management
 * @dev Allows creation of rules that automatically distribute funds based on conditions
 */
contract RuleEngine is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    enum RuleType {
        THRESHOLD,      // Trigger when balance exceeds threshold
        PERCENTAGE,     // Distribute percentage of balance
        SCHEDULED,      // Execute at specific intervals
        HYBRID          // Combination of conditions
    }

    enum RuleStatus {
        ACTIVE,
        PAUSED,
        DISABLED
    }

    struct Rule {
        uint256 id;
        string name;
        string description;
        RuleType ruleType;
        RuleStatus status;

        // Conditions
        uint256 triggerAmount;      // Minimum balance to trigger
        uint256 checkInterval;      // Seconds between checks
        uint256 minExecutionGap;    // Min time between executions

        // Actions
        address[] recipients;       // Where to send funds
        uint256[] amounts;          // Fixed amounts OR
        uint256[] percentages;      // Percentages (in basis points, 100 = 1%)
        bool usePercentages;        // True for percentages, false for fixed amounts
        uint256 maxPerExecution;    // Max to distribute per execution

        // Metadata
        uint256 createdAt;
        uint256 lastExecuted;
        uint256 timesExecuted;
        uint256 totalDistributed;
        address creator;
    }

    TreasuryCore public treasury;
    IERC20 public usdc;

    uint256 public ruleCount;
    mapping(uint256 => Rule) public rules;
    mapping(uint256 => bool) public ruleExists;

    // Events
    event RuleCreated(
        uint256 indexed ruleId,
        string name,
        RuleType ruleType,
        address indexed creator
    );

    event RuleExecuted(
        uint256 indexed ruleId,
        uint256 totalAmount,
        uint256 recipientCount,
        uint256 timestamp
    );

    event RuleStatusChanged(
        uint256 indexed ruleId,
        RuleStatus oldStatus,
        RuleStatus newStatus
    );

    event RuleUpdated(uint256 indexed ruleId);
    event RuleDeleted(uint256 indexed ruleId);

    event DistributionFailed(
        uint256 indexed ruleId,
        address indexed recipient,
        uint256 amount,
        string reason
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }

    /**
     * @notice Set treasury address
     * @param _treasury Treasury contract address
     */
    function setTreasury(address _treasury) external onlyRole(ADMIN_ROLE) {
        require(_treasury != address(0), "Invalid treasury address");
        treasury = TreasuryCore(payable(_treasury));
    }

    /**
     * @notice Set USDC token address
     * @param _usdc USDC token address
     */
    function setUsdc(address _usdc) external onlyRole(ADMIN_ROLE) {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
    }

    /**
     * @notice Create a new distribution rule
     * @param name Rule name
     * @param description Rule description
     * @param ruleType Type of rule (THRESHOLD, PERCENTAGE, etc.)
     * @param triggerAmount Minimum balance to trigger rule
     * @param checkInterval Seconds between rule evaluations
     * @param minExecutionGap Minimum seconds between executions
     * @param recipients Array of recipient addresses
     * @param values Array of amounts or percentages
     * @param usePercentages True if values are percentages, false if fixed amounts
     * @param maxPerExecution Maximum amount to distribute per execution
     */
    function createRule(
        string memory name,
        string memory description,
        RuleType ruleType,
        uint256 triggerAmount,
        uint256 checkInterval,
        uint256 minExecutionGap,
        address[] memory recipients,
        uint256[] memory values,
        bool usePercentages,
        uint256 maxPerExecution
    ) external onlyRole(ADMIN_ROLE) returns (uint256) {
        require(bytes(name).length > 0, "Name required");
        require(recipients.length > 0, "No recipients");
        require(recipients.length == values.length, "Length mismatch");
        require(checkInterval > 0, "Invalid interval");

        // Validate percentages sum to 10000 (100%) if using percentages
        if (usePercentages) {
            uint256 totalPercentage = 0;
            for (uint256 i = 0; i < values.length; i++) {
                totalPercentage += values[i];
            }
            require(totalPercentage <= 10000, "Percentages exceed 100%");
        }

        uint256 ruleId = ruleCount++;

        Rule storage newRule = rules[ruleId];
        newRule.id = ruleId;
        newRule.name = name;
        newRule.description = description;
        newRule.ruleType = ruleType;
        newRule.status = RuleStatus.ACTIVE;
        newRule.triggerAmount = triggerAmount;
        newRule.checkInterval = checkInterval;
        newRule.minExecutionGap = minExecutionGap;
        newRule.recipients = recipients;
        newRule.usePercentages = usePercentages;
        newRule.maxPerExecution = maxPerExecution;
        newRule.createdAt = block.timestamp;
        newRule.creator = msg.sender;

        if (usePercentages) {
            newRule.percentages = values;
        } else {
            newRule.amounts = values;
        }

        ruleExists[ruleId] = true;

        emit RuleCreated(ruleId, name, ruleType, msg.sender);

        return ruleId;
    }

    /**
     * @notice Evaluate if a rule should be executed
     * @param ruleId Rule identifier
     * @return shouldExecute True if rule conditions are met
     * @return reason Human-readable reason
     */
    function evaluateRule(uint256 ruleId) public view returns (bool shouldExecute, string memory reason) {
        require(ruleExists[ruleId], "Rule does not exist");

        Rule storage rule = rules[ruleId];

        // Check if rule is active
        if (rule.status != RuleStatus.ACTIVE) {
            return (false, "Rule is not active");
        }

        // Check minimum execution gap
        if (rule.lastExecuted > 0 && block.timestamp < rule.lastExecuted + rule.minExecutionGap) {
            return (false, "Execution gap not met");
        }

        // Check treasury balance
        uint256 balance = treasury.getBalance();
        if (balance < rule.triggerAmount) {
            return (false, "Balance below trigger amount");
        }

        // Check if enough time has passed since last check
        if (rule.ruleType == RuleType.SCHEDULED) {
            if (rule.lastExecuted > 0 && block.timestamp < rule.lastExecuted + rule.checkInterval) {
                return (false, "Schedule interval not reached");
            }
        }

        return (true, "Rule conditions met");
    }

    /**
     * @notice Execute a rule's distribution
     * @param ruleId Rule identifier
     */
    function executeRule(uint256 ruleId) external nonReentrant whenNotPaused onlyRole(OPERATOR_ROLE) {
        require(ruleExists[ruleId], "Rule does not exist");

        (bool shouldExecute, string memory reason) = evaluateRule(ruleId);
        require(shouldExecute, reason);

        Rule storage rule = rules[ruleId];
        uint256 balance = treasury.getBalance();
        uint256 totalToDistribute = 0;

        // Calculate distribution amounts
        uint256[] memory distributionAmounts = new uint256[](rule.recipients.length);

        if (rule.usePercentages) {
            // Calculate percentage-based distributions
            for (uint256 i = 0; i < rule.recipients.length; i++) {
                uint256 amount = (balance * rule.percentages[i]) / 10000;
                distributionAmounts[i] = amount;
                totalToDistribute += amount;
            }
        } else {
            // Use fixed amounts
            for (uint256 i = 0; i < rule.recipients.length; i++) {
                distributionAmounts[i] = rule.amounts[i];
                totalToDistribute += rule.amounts[i];
            }
        }

        // Apply max per execution limit
        if (rule.maxPerExecution > 0 && totalToDistribute > rule.maxPerExecution) {
            // Scale down proportionally
            for (uint256 i = 0; i < distributionAmounts.length; i++) {
                distributionAmounts[i] = (distributionAmounts[i] * rule.maxPerExecution) / totalToDistribute;
            }
            totalToDistribute = rule.maxPerExecution;
        }

        // Ensure treasury has enough balance
        require(balance >= totalToDistribute, "Insufficient treasury balance");

        // Execute distributions via treasury
        for (uint256 i = 0; i < rule.recipients.length; i++) {
            if (distributionAmounts[i] > 0) {
                try treasury.proposeTransaction(rule.recipients[i], distributionAmounts[i], "") {
                    // Transaction proposed successfully
                    // Note: In production, this would need multi-sig approval
                } catch Error(string memory errorReason) {
                    emit DistributionFailed(ruleId, rule.recipients[i], distributionAmounts[i], errorReason);
                } catch {
                    emit DistributionFailed(ruleId, rule.recipients[i], distributionAmounts[i], "Unknown error");
                }
            }
        }

        // Update rule execution metadata
        rule.lastExecuted = block.timestamp;
        rule.timesExecuted++;
        rule.totalDistributed += totalToDistribute;

        emit RuleExecuted(ruleId, totalToDistribute, rule.recipients.length, block.timestamp);
    }

    /**
     * @notice Update rule status (ACTIVE, PAUSED, DISABLED)
     * @param ruleId Rule identifier
     * @param newStatus New status
     */
    function updateRuleStatus(uint256 ruleId, RuleStatus newStatus) external onlyRole(ADMIN_ROLE) {
        require(ruleExists[ruleId], "Rule does not exist");

        Rule storage rule = rules[ruleId];
        RuleStatus oldStatus = rule.status;
        rule.status = newStatus;

        emit RuleStatusChanged(ruleId, oldStatus, newStatus);
    }

    /**
     * @notice Delete a rule
     * @param ruleId Rule identifier
     */
    function deleteRule(uint256 ruleId) external onlyRole(ADMIN_ROLE) {
        require(ruleExists[ruleId], "Rule does not exist");

        delete rules[ruleId];
        ruleExists[ruleId] = false;

        emit RuleDeleted(ruleId);
    }

    /**
     * @notice Get rule details
     * @param ruleId Rule identifier
     */
    function getRule(uint256 ruleId) external view returns (
        string memory name,
        string memory description,
        RuleType ruleType,
        RuleStatus status,
        uint256 triggerAmount,
        uint256 timesExecuted,
        uint256 totalDistributed,
        uint256 lastExecuted
    ) {
        require(ruleExists[ruleId], "Rule does not exist");

        Rule storage rule = rules[ruleId];
        return (
            rule.name,
            rule.description,
            rule.ruleType,
            rule.status,
            rule.triggerAmount,
            rule.timesExecuted,
            rule.totalDistributed,
            rule.lastExecuted
        );
    }

    /**
     * @notice Get rule recipients and amounts
     * @param ruleId Rule identifier
     */
    function getRuleDistribution(uint256 ruleId) external view returns (
        address[] memory recipients,
        uint256[] memory values,
        bool usePercentages
    ) {
        require(ruleExists[ruleId], "Rule does not exist");

        Rule storage rule = rules[ruleId];
        return (
            rule.recipients,
            rule.usePercentages ? rule.percentages : rule.amounts,
            rule.usePercentages
        );
    }

    /**
     * @notice Get all active rules
     */
    function getActiveRules() external view returns (uint256[] memory) {
        uint256 activeCount = 0;

        // Count active rules
        for (uint256 i = 0; i < ruleCount; i++) {
            if (ruleExists[i] && rules[i].status == RuleStatus.ACTIVE) {
                activeCount++;
            }
        }

        // Collect active rule IDs
        uint256[] memory activeRules = new uint256[](activeCount);
        uint256 index = 0;

        for (uint256 i = 0; i < ruleCount; i++) {
            if (ruleExists[i] && rules[i].status == RuleStatus.ACTIVE) {
                activeRules[index] = i;
                index++;
            }
        }

        return activeRules;
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
}
