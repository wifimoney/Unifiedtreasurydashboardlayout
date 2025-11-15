import TreasuryCoreDeployment from './deployments/arcTestnet/TreasuryCore.json'
import PayrollManagerDeployment from './deployments/arcTestnet/PayrollManager.json'
import BudgetAllocatorDeployment from './deployments/arcTestnet/BudgetAllocator.json'
import ScheduledPaymentsDeployment from './deployments/arcTestnet/ScheduledPayments.json'
import RuleEngineDeployment from './deployments/arcTestnet/RuleEngine.json'
import ComplianceTrackerDeployment from './deployments/arcTestnet/ComplianceTracker.json'
import TreasuryAggregatorDeployment from './deployments/arcTestnet/TreasuryAggregatorSimple.json'
import { ContractDeploymentService } from './contractDeploymentService'

// Contract configuration type
export interface ContractConfig {
  address: `0x${string}`;
  abi: any;
}

/**
 * Get user's deployed contracts or fallback to default
 * @param walletAddress - The connected wallet address
 * @param chainId - The current chain ID
 */
export function getUserContracts(walletAddress?: string, chainId?: number) {
  // TEMPORARILY DISABLED: Just use default contracts for everyone
  // This avoids issues with wallet-specific contract storage
  console.log('ℹ️ Using default contracts for all users');
  return contracts;

  /* ORIGINAL CODE - COMMENTED OUT FOR NOW
  // If wallet is connected and has deployed contracts, use those
  if (walletAddress && chainId) {
    const userContracts = ContractDeploymentService.getUserContracts(walletAddress, chainId);

    if (userContracts?.ruleEngine) {
      console.log('✅ Using user\'s deployed contracts:', userContracts);
      return {
        TreasuryCore: {
          address: (userContracts.treasuryCore || "0xcee3Bb02aE95E1Dbc2e5C51a502Ac6eC5deEFa81") as `0x${string}`,
          abi: TreasuryCoreDeployment.abi,
        },
        PayrollManager: {
          address: PayrollManagerDeployment.address as `0x${string}`,
          abi: PayrollManagerDeployment.abi,
        },
        BudgetAllocator: {
          address: (userContracts.budgetAllocator || BudgetAllocatorDeployment.address) as `0x${string}`,
          abi: BudgetAllocatorDeployment.abi,
        },
        ScheduledPayments: {
          address: (userContracts.scheduledPayments || ScheduledPaymentsDeployment.address) as `0x${string}`,
          abi: ScheduledPaymentsDeployment.abi,
        },
        RuleEngine: {
          address: userContracts.ruleEngine as `0x${string}`,
          abi: RuleEngineDeployment.abi,
        },
        ComplianceTracker: {
          address: (userContracts.complianceTracker || ComplianceTrackerDeployment.address) as `0x${string}`,
          abi: ComplianceTrackerDeployment.abi,
        },
        TreasuryAggregator: {
          address: TreasuryAggregatorDeployment.address as `0x${string}`,
          abi: TreasuryAggregatorDeployment.abi,
        },
      };
    }
  }

  // Fallback to default deployed contracts
  console.log('ℹ️ Using default contracts');
  return contracts;
  */
}

// Main contract exports - Using addresses from deployment JSONs
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

// Gateway Wallet (Circle Gateway - same address on all chains)
export const GATEWAY_WALLET_ADDRESS = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9' as const;

// Arc Testnet chain ID
export const ARC_TESTNET_CHAIN_ID = 5042002;

// Explorer URLs
export const EXPLORER_URLS = {
  arc: 'https://testnet.arcscan.app',
  ethereumSepolia: 'https://sepolia.etherscan.io',
  avalancheFuji: 'https://testnet.snowtrace.io',
  baseSepolia: 'https://sepolia.basescan.org',
} as const;

// Helper to get explorer URL for transaction
export function getExplorerUrl(txHash: string, chain: 'arc' | 'ethereumSepolia' | 'avalancheFuji' | 'baseSepolia' = 'arc'): string {
  return `${EXPLORER_URLS[chain]}/tx/${txHash}`;
}

// Helper to get explorer URL for address
export function getAddressExplorerUrl(address: string, chain: 'arc' | 'ethereumSepolia' | 'avalancheFuji' | 'baseSepolia' = 'arc'): string {
  return `${EXPLORER_URLS[chain]}/address/${address}`;
}

// Rule types (matching RuleEngine contract)
export enum RuleType {
  THRESHOLD = 0,
  PERCENTAGE = 1,
  SCHEDULED = 2,
  HYBRID = 3,
}

export enum RuleStatus {
  ACTIVE = 0,
  PAUSED = 1,
  DISABLED = 2,
}

// Payment status (matching ScheduledPayments contract)
export enum PaymentStatus {
  PENDING = 0,
  EXECUTED = 1,
  CANCELLED = 2,
  FAILED = 3,
}

// Type exports
export type ContractName = keyof typeof contracts;

// Log deployed addresses (helpful for debugging)
if (typeof window !== 'undefined') {
  console.log('📝 Contract Addresses:');
  console.log('TreasuryCore:', contracts.TreasuryCore.address);
  console.log('RuleEngine:', contracts.RuleEngine.address);
  console.log('BudgetAllocator:', contracts.BudgetAllocator.address);
}
