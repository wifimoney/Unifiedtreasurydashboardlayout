import { useTreasury } from '../contexts/TreasuryContext';

// Import compiled ABIs (these are the same for all treasuries)
import TreasuryCoreCompiled from '../../../backend/out/TreasuryCore.sol/TreasuryCore.json';
import BudgetAllocatorCompiled from '../../../backend/out/BudgetAllocator.sol/BudgetAllocator.json';
import PayrollManagerCompiled from '../../../backend/out/PayrollManager.sol/PayrollManager.json';
import ComplianceTrackerCompiled from '../../../backend/out/ComplianceTracker.sol/ComplianceTracker.json';
import RuleEngineCompiled from '../../../backend/out/RuleEngine.sol/RuleEngine.json';

export interface ContractConfig {
  address: `0x${string}`;
  abi: any;
}

/**
 * Hook to get contracts for the active treasury
 * Returns null if no active treasury
 */
export function useContracts() {
  const { activeTreasury } = useTreasury();

  if (!activeTreasury) {
    return null;
  }

  return {
    TreasuryCore: {
      address: activeTreasury.contracts.treasuryCore as `0x${string}`,
      abi: TreasuryCoreCompiled.abi,
    },
    BudgetAllocator: {
      address: activeTreasury.contracts.budgetAllocator as `0x${string}`,
      abi: BudgetAllocatorCompiled.abi,
    },
    PayrollManager: {
      address: activeTreasury.contracts.payrollManager as `0x${string}`,
      abi: PayrollManagerCompiled.abi,
    },
    ComplianceTracker: {
      address: activeTreasury.contracts.complianceTracker as `0x${string}`,
      abi: ComplianceTrackerCompiled.abi,
    },
    RuleEngine: {
      address: activeTreasury.contracts.ruleEngine as `0x${string}`,
      abi: RuleEngineCompiled.abi,
    },
  };
}

/**
 * Get the active treasury address (TreasuryCore)
 */
export function useTreasuryAddress(): `0x${string}` | null {
  const { activeTreasury } = useTreasury();
  return activeTreasury?.contracts.treasuryCore as `0x${string}` || null;
}

