// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {TreasuryCore} from "./TreasuryCore.sol";
import {PayrollManager} from "./PayrollManager.sol";
import {BudgetAllocator} from "./BudgetAllocator.sol";
import {ScheduledPayments} from "./ScheduledPayments.sol";

/**
 * @title TreasuryAggregatorSimple
 * @notice Simplified unified view for MVP
 */
contract TreasuryAggregatorSimple {
    TreasuryCore public treasuryCore;
    PayrollManager public payrollManager;
    BudgetAllocator public budgetAllocator;
    ScheduledPayments public scheduledPayments;

    struct TreasurySnapshot {
        uint256 totalBalance;
        uint256 treasuryBalance;
        uint256 payrollBalance;
        uint256 budgetBalance;
        uint256 scheduledBalance;
        uint256 timestamp;
    }

    constructor() {}

    /**
     * @notice Set TreasuryCore address
     */
    function setTreasuryCore(address _treasuryCore) external {
        require(_treasuryCore != address(0), "Invalid address");
        treasuryCore = TreasuryCore(payable(_treasuryCore));
    }

    /**
     * @notice Set PayrollManager address
     */
    function setPayrollManager(address _payrollManager) external {
        require(_payrollManager != address(0), "Invalid address");
        payrollManager = PayrollManager(payable(_payrollManager));
    }

    /**
     * @notice Set BudgetAllocator address
     */
    function setBudgetAllocator(address _budgetAllocator) external {
        require(_budgetAllocator != address(0), "Invalid address");
        budgetAllocator = BudgetAllocator(payable(_budgetAllocator));
    }

    /**
     * @notice Set ScheduledPayments address
     */
    function setScheduledPayments(address _scheduledPayments) external {
        require(_scheduledPayments != address(0), "Invalid address");
        scheduledPayments = ScheduledPayments(payable(_scheduledPayments));
    }

    function getTreasurySnapshot() external view returns (TreasurySnapshot memory) {
        uint256 treasuryBal = treasuryCore.getBalance();
        uint256 payrollBal = payrollManager.getBalance();
        uint256 budgetBal = budgetAllocator.getBalance();
        uint256 scheduledBal = scheduledPayments.getBalance();

        return TreasurySnapshot({
            totalBalance: treasuryBal + payrollBal + budgetBal + scheduledBal,
            treasuryBalance: treasuryBal,
            payrollBalance: payrollBal,
            budgetBalance: budgetBal,
            scheduledBalance: scheduledBal,
            timestamp: block.timestamp
        });
    }

    function getBasicStats() external view returns (
        uint256 totalEmployees,
        uint256 totalDepartments,
        uint256 totalScheduledPayments,
        uint256 totalTransactions
    ) {
        return (
            payrollManager.totalEmployees(),
            budgetAllocator.departmentCount(),
            scheduledPayments.paymentCount(),
            treasuryCore.transactionCount()
        );
    }
}
