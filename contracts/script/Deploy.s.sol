// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {TreasuryCore} from "../contracts/TreasuryCore.sol";
import {PayrollManager} from "../contracts/PayrollManager.sol";
import {BudgetAllocator} from "../contracts/BudgetAllocator.sol";
import {ComplianceTracker} from "../contracts/ComplianceTracker.sol";
import {RuleEngine} from "../contracts/RuleEngine.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = 0x5f9b16d8121078c8e051b8062073645478809d11639f12938ac0eb594dde8fd9;
        address usdcAddress = vm.envAddress("USDC_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying TreasuryCore...");
        TreasuryCore treasuryCore = new TreasuryCore();
        console.log("TreasuryCore deployed at:", address(treasuryCore));

        console.log("Deploying BudgetAllocator...");
        BudgetAllocator budgetAllocator = new BudgetAllocator();
        console.log("BudgetAllocator deployed at:", address(budgetAllocator));

        console.log("Deploying PayrollManager...");
        PayrollManager payrollManager = new PayrollManager();
        console.log("PayrollManager deployed at:", address(payrollManager));

        console.log("Deploying ComplianceTracker...");
        ComplianceTracker complianceTracker = new ComplianceTracker();
        console.log("ComplianceTracker deployed at:", address(complianceTracker));

        console.log("Deploying RuleEngine...");
        RuleEngine ruleEngine = new RuleEngine();
        console.log("RuleEngine deployed at:", address(ruleEngine));

        // Configure contracts
        console.log("\nConfiguring contracts...");

        // Set ComplianceTracker in TreasuryCore
        treasuryCore.setComplianceTracker(address(complianceTracker));

        // Grant COMPLIANCE_OFFICER_ROLE to TreasuryCore so it can log transactions
        bytes32 COMPLIANCE_OFFICER_ROLE = keccak256("COMPLIANCE_OFFICER_ROLE");
        complianceTracker.grantRole(COMPLIANCE_OFFICER_ROLE, address(treasuryCore));

        // Authorize contracts to submit transactions to TreasuryCore
        console.log("Authorizing contracts...");
        treasuryCore.authorizeContract(address(payrollManager));
        treasuryCore.authorizeContract(address(budgetAllocator));
        treasuryCore.authorizeContract(address(ruleEngine));

        // Configure BudgetAllocator
        budgetAllocator.setTreasury(address(treasuryCore));
        budgetAllocator.setPayrollManager(address(payrollManager));
        budgetAllocator.setUsdc(usdcAddress);

        // Configure PayrollManager
        payrollManager.setTreasury(address(treasuryCore));
        payrollManager.setUsdc(usdcAddress);
        payrollManager.setBudgetAllocator(address(budgetAllocator));

        // Configure RuleEngine
        ruleEngine.setTreasury(address(treasuryCore));
        ruleEngine.setUsdc(usdcAddress);

        vm.stopBroadcast();

        console.log("\n=== Deployment Complete ===");
        console.log("TreasuryCore:", address(treasuryCore));
        console.log("BudgetAllocator:", address(budgetAllocator));
        console.log("PayrollManager:", address(payrollManager));
        console.log("ComplianceTracker:", address(complianceTracker));
        console.log("RuleEngine:", address(ruleEngine));
    }
}

