import { useTreasury } from '../contexts/TreasuryContext';

// Import compiled ABIs (these are the same for all treasuries)
import TreasuryCoreCompiled from './compiled/TreasuryCore.json';
import BudgetAllocatorCompiled from './compiled/BudgetAllocator.json';
import PayrollManagerCompiled from './compiled/PayrollManager.json';
import ComplianceTrackerCompiled from './compiled/ComplianceTracker.json';
import RuleEngineCompiled from './compiled/RuleEngine.json';

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

