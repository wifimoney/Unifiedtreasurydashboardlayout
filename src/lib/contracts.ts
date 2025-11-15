import TreasuryCoreDeployment from './deployments/arcTestnet/TreasuryCore.json'
import PayrollManagerDeployment from './deployments/arcTestnet/PayrollManager.json'
import BudgetAllocatorDeployment from './deployments/arcTestnet/BudgetAllocator.json'
import ScheduledPaymentsDeployment from './deployments/arcTestnet/ScheduledPayments.json'
import RuleEngineDeployment from './deployments/arcTestnet/RuleEngine.json'
import ComplianceTrackerDeployment from './deployments/arcTestnet/ComplianceTracker.json'
import TreasuryAggregatorDeployment from './deployments/arcTestnet/TreasuryAggregator.json'

export const contracts = {
  TreasuryCore: {
    address: TreasuryCoreDeployment.address as `0x${string}`,
    abi: TreasuryCoreDeployment.abi,
  },
  PayrollManager: {
    address: PayrollManagerDeployment.address as `0x${string}`,
    abi: PayrollManagerDeployment.abi,
  },
  BudgetAllocator: {
    address: BudgetAllocatorDeployment.address as `0x${string}`,
    abi: BudgetAllocatorDeployment.abi,
  },
  ScheduledPayments: {
    address: ScheduledPaymentsDeployment.address as `0x${string}`,
    abi: ScheduledPaymentsDeployment.abi,
  },
  RuleEngine: {
    address: RuleEngineDeployment.address as `0x${string}`,
    abi: RuleEngineDeployment.abi,
  },
  ComplianceTracker: {
    address: ComplianceTrackerDeployment.address as `0x${string}`,
    abi: ComplianceTrackerDeployment.abi,
  },
  TreasuryAggregator: {
    address: TreasuryAggregatorDeployment.address as `0x${string}`,
    abi: TreasuryAggregatorDeployment.abi,
  },
} as const

export const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as `0x${string}`
