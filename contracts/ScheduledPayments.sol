// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC2771Context} from "@openzeppelin/contracts/metatx/ERC2771Context.sol";

/**
 * @title ScheduledPayments
 * @notice Automated scheduled payment system for treasury operations
 * @dev Handles one-time and recurring payments with time-based execution
 */
contract ScheduledPayments is ERC2771Context {
    event TrustedForwarderUpdated(address indexed forwarder, address indexed updater);
    // Enums
    enum PaymentStatus {
        PENDING,
        EXECUTED,
        CANCELLED,
        FAILED
    }

    // Structs
    struct ScheduledPayment {
        uint256 id;
        address recipient;
        uint256 amount;
        uint256 executeAt;
        bool recurring;
        uint256 interval; // For recurring payments (in seconds)
        uint256 executionCount;
        uint256 maxExecutions; // 0 = unlimited
        PaymentStatus status;
        address creator;
        uint256 createdAt;
        uint256 lastExecutedAt;
        string description;
    }

    // State variables
    address public treasury;
    address public admin;
    IERC20 public usdc;
    address private _trustedForwarder;

    mapping(uint256 => ScheduledPayment) public payments;
    uint256 public paymentCount;

    uint256[] public pendingPayments;
    mapping(uint256 => bool) public isPending;

    // Events
    event PaymentScheduled(
        uint256 indexed paymentId,
        address indexed recipient,
        uint256 amount,
        uint256 executeAt,
        bool recurring
    );
    event PaymentExecuted(uint256 indexed paymentId, uint256 amount, uint256 timestamp);
    event PaymentCancelled(uint256 indexed paymentId, address indexed canceller);
    event PaymentFailed(uint256 indexed paymentId, string reason);
    event RecurringPaymentCompleted(uint256 indexed paymentId, uint256 totalExecutions);

    // Modifiers
    modifier onlyAdmin() {
        _onlyAdmin();
        _;
    }

    modifier onlyTreasury() {
        _onlyTreasury();
        _;
    }

    modifier paymentExists(uint256 _paymentId) {
        _paymentExists(_paymentId);
        _;
    }

    // Internal modifier functions
    function _onlyAdmin() internal view {
        require(_msgSender() == admin, "Only admin can call");
    }

    function _onlyTreasury() internal view {
        require(_msgSender() == treasury, "Only treasury can call");
    }

    function _paymentExists(uint256 _paymentId) internal view {
        require(_paymentId < paymentCount, "Payment does not exist");
    }

    /**
     * @notice Initialize scheduled payments
     */
    constructor(address trustedForwarder) ERC2771Context(trustedForwarder) {
        require(trustedForwarder != address(0), "Invalid forwarder");
        _trustedForwarder = trustedForwarder;
        admin = _msgSender();
    }

    function setTrustedForwarder(address newForwarder) external onlyAdmin {
        require(newForwarder != address(0), "Invalid forwarder");
        _trustedForwarder = newForwarder;
        emit TrustedForwarderUpdated(newForwarder, _msgSender());
    }

    function trustedForwarder() external view returns (address) {
        return _trustedForwarder;
    }

    /**
     * @notice Set treasury address
     * @param _treasury Treasury contract address
     */
    function setTreasury(address _treasury) external onlyAdmin {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
    }

    /**
     * @notice Set USDC token address
     * @param _usdc USDC token address
     */
    function setUsdc(address _usdc) external onlyAdmin {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
    }

    /**
     * @notice Schedule a new payment
     * @param _recipient Payment recipient
     * @param _amount Payment amount
     * @param _executeAt Execution timestamp
     * @param _recurring Whether payment is recurring
     * @param _interval Interval for recurring payments (seconds)
     * @param _maxExecutions Maximum executions (0 = unlimited)
     * @param _description Payment description
     * @return paymentId Payment ID
     */
    function schedulePayment(
        address _recipient,
        uint256 _amount,
        uint256 _executeAt,
        bool _recurring,
        uint256 _interval,
        uint256 _maxExecutions,
        string memory _description
    ) external onlyAdmin returns (uint256) {
        require(_recipient != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be greater than 0");
        require(_executeAt > block.timestamp, "Execution time must be in future");

        if (_recurring) {
            require(_interval > 0, "Interval required for recurring payments");
        }

        uint256 paymentId = paymentCount;

        payments[paymentId] = ScheduledPayment({
            id: paymentId,
            recipient: _recipient,
            amount: _amount,
            executeAt: _executeAt,
            recurring: _recurring,
            interval: _interval,
            executionCount: 0,
            maxExecutions: _maxExecutions,
            status: PaymentStatus.PENDING,
            creator: _msgSender(),
            createdAt: block.timestamp,
            lastExecutedAt: 0,
            description: _description
        });

        pendingPayments.push(paymentId);
        isPending[paymentId] = true;

        paymentCount++;

        emit PaymentScheduled(paymentId, _recipient, _amount, _executeAt, _recurring);

        return paymentId;
    }

    /**
     * @notice Execute a scheduled payment
     * @param _paymentId Payment ID
     */
    function executeScheduledPayment(uint256 _paymentId)
        external
        paymentExists(_paymentId)
        returns (bool)
    {
        ScheduledPayment storage payment = payments[_paymentId];

        require(payment.status == PaymentStatus.PENDING, "Payment not pending");
        require(block.timestamp >= payment.executeAt, "Payment not due yet");
        require(address(this).balance >= payment.amount, "Insufficient balance");

        // Check if max executions reached
        if (payment.maxExecutions > 0 && payment.executionCount >= payment.maxExecutions) {
            payment.status = PaymentStatus.EXECUTED;
            _removePendingPayment(_paymentId);
            emit RecurringPaymentCompleted(_paymentId, payment.executionCount);
            return false;
        }

        // Execute payment
        (bool success, ) = payment.recipient.call{value: payment.amount}("");

        if (!success) {
            emit PaymentFailed(_paymentId, "Transfer failed");
            return false;
        }

        payment.executionCount++;
        payment.lastExecutedAt = block.timestamp;

        emit PaymentExecuted(_paymentId, payment.amount, block.timestamp);

        // Handle recurring payment
        if (payment.recurring) {
            payment.executeAt = block.timestamp + payment.interval;

            // Check if max executions reached
            if (payment.maxExecutions > 0 && payment.executionCount >= payment.maxExecutions) {
                payment.status = PaymentStatus.EXECUTED;
                _removePendingPayment(_paymentId);
                emit RecurringPaymentCompleted(_paymentId, payment.executionCount);
            }
        } else {
            payment.status = PaymentStatus.EXECUTED;
            _removePendingPayment(_paymentId);
        }

        return true;
    }

    /**
     * @notice Execute all due payments
     * @return executed Number of payments executed
     */
    function executeAllDuePayments() external returns (uint256 executed) {
        uint256 count = 0;

        for (uint256 i = 0; i < pendingPayments.length; i++) {
            uint256 paymentId = pendingPayments[i];
            ScheduledPayment storage payment = payments[paymentId];

            if (
                payment.status == PaymentStatus.PENDING &&
                block.timestamp >= payment.executeAt &&
                address(this).balance >= payment.amount
            ) {
                if (this.executeScheduledPayment(paymentId)) {
                    count++;
                }
            }
        }

        return count;
    }

    /**
     * @notice Cancel a scheduled payment
     * @param _paymentId Payment ID
     */
    function cancelScheduledPayment(uint256 _paymentId)
        external
        onlyAdmin
        paymentExists(_paymentId)
    {
        ScheduledPayment storage payment = payments[_paymentId];
        require(payment.status == PaymentStatus.PENDING, "Payment not pending");

        payment.status = PaymentStatus.CANCELLED;
        _removePendingPayment(_paymentId);

        emit PaymentCancelled(_paymentId, _msgSender());
    }

    /**
     * @notice Remove payment from pending list
     * @param _paymentId Payment ID
     */
    function _removePendingPayment(uint256 _paymentId) internal {
        if (!isPending[_paymentId]) return;

        isPending[_paymentId] = false;

        // Find and remove from array
        for (uint256 i = 0; i < pendingPayments.length; i++) {
            if (pendingPayments[i] == _paymentId) {
                pendingPayments[i] = pendingPayments[pendingPayments.length - 1];
                pendingPayments.pop();
                break;
            }
        }
    }

    /**
     * @notice Get upcoming payments (next 7 days)
     * @return upcomingIds Array of upcoming payment IDs
     */
    function getUpcomingPayments() external view returns (uint256[] memory) {
        uint256 weekFromNow = block.timestamp + 7 days;
        uint256 upcomingCount = 0;

        // Count upcoming payments
        for (uint256 i = 0; i < pendingPayments.length; i++) {
            uint256 paymentId = pendingPayments[i];
            if (payments[paymentId].executeAt <= weekFromNow) {
                upcomingCount++;
            }
        }

        // Populate array
        uint256[] memory upcoming = new uint256[](upcomingCount);
        uint256 index = 0;

        for (uint256 i = 0; i < pendingPayments.length; i++) {
            uint256 paymentId = pendingPayments[i];
            if (payments[paymentId].executeAt <= weekFromNow) {
                upcoming[index] = paymentId;
                index++;
            }
        }

        return upcoming;
    }

    /**
     * @notice Get due payments
     * @return dueIds Array of due payment IDs
     */
    function getDuePayments() external view returns (uint256[] memory) {
        uint256 dueCount = 0;

        // Count due payments
        for (uint256 i = 0; i < pendingPayments.length; i++) {
            uint256 paymentId = pendingPayments[i];
            if (
                payments[paymentId].status == PaymentStatus.PENDING &&
                block.timestamp >= payments[paymentId].executeAt
            ) {
                dueCount++;
            }
        }

        // Populate array
        uint256[] memory due = new uint256[](dueCount);
        uint256 index = 0;

        for (uint256 i = 0; i < pendingPayments.length; i++) {
            uint256 paymentId = pendingPayments[i];
            if (
                payments[paymentId].status == PaymentStatus.PENDING &&
                block.timestamp >= payments[paymentId].executeAt
            ) {
                due[index] = paymentId;
                index++;
            }
        }

        return due;
    }

    /**
     * @notice Get payment details
     * @param _paymentId Payment ID
     * @return recipient Payment recipient
     * @return amount Payment amount
     * @return executeAt Execution timestamp
     * @return recurring Recurring status
     * @return executionCount Number of executions
     * @return status Payment status
     * @return description Payment description
     */
    function getPaymentDetails(uint256 _paymentId)
        external
        view
        paymentExists(_paymentId)
        returns (
            address recipient,
            uint256 amount,
            uint256 executeAt,
            bool recurring,
            uint256 executionCount,
            PaymentStatus status,
            string memory description
        )
    {
        ScheduledPayment memory payment = payments[_paymentId];
        return (
            payment.recipient,
            payment.amount,
            payment.executeAt,
            payment.recurring,
            payment.executionCount,
            payment.status,
            payment.description
        );
    }

    /**
     * @notice Get all pending payment IDs
     * @return Array of pending payment IDs
     */
    function getPendingPaymentIds() external view returns (uint256[] memory) {
        return pendingPayments;
    }

    /**
     * @notice Check if payment is due
     * @param _paymentId Payment ID
     * @return bool Payment due status
     */
    function isPaymentDue(uint256 _paymentId)
        external
        view
        paymentExists(_paymentId)
        returns (bool)
    {
        ScheduledPayment memory payment = payments[_paymentId];
        return (
            payment.status == PaymentStatus.PENDING &&
            block.timestamp >= payment.executeAt
        );
    }

    /**
     * @notice Get total pending payment amount
     * @return total Total pending amount
     */
    function getTotalPendingAmount() external view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < pendingPayments.length; i++) {
            total += payments[pendingPayments[i]].amount;
        }
        return total;
    }

    /**
     * @notice Receive funds from treasury
     */
    receive() external payable {}

    /**
     * @notice Get USDC balance of this contract
     * @return balance Current USDC balance
     */
    function getBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    function _msgSender() internal view override returns (address sender) {
        return ERC2771Context._msgSender();
    }

    function _msgData() internal view override returns (bytes calldata) {
        return ERC2771Context._msgData();
    }

    function isTrustedForwarder(address forwarder) public view override returns (bool) {
        return forwarder == _trustedForwarder;
    }
}
