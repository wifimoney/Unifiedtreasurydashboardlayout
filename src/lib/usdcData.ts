// USDC-focused treasury data for ARCBOARD
import { fetchAllChainBalances } from './circleGateway';

export interface NetworkBalance {
  network: string;
  chainId: string;
  usdcBalance: number;
  nativeToken: string;
  transactions24h: number;
  avgGasCostUSDC: number;
  explorerUrl: string;
  status: 'active' | 'syncing' | 'offline';
}

export interface TreasuryData {
  totalUSDC: number;
  networks: NetworkBalance[];
  lastUpdated: Date;
  monthlyChange: number;
  weeklyVolume: number;
}

export interface CostMetrics {
  avgTransactionCost: number;
  totalTransactions: number;
  totalGasPaid: number;
  costSavings: number;
  traditionalGasCost: number;
  efficiency: number;
}

// Mock data for transactions and gas costs (can be replaced with real data later)
// Only for chains supported by Circle Gateway
const MOCK_CHAIN_METRICS: Record<string, { transactions24h: number; avgGasCostUSDC: number }> = {
  'Ethereum Sepolia': { transactions24h: 1247, avgGasCostUSDC: 0.012 },
  'Avalanche Fuji': { transactions24h: 1123, avgGasCostUSDC: 0.011 },
  'Base Sepolia': { transactions24h: 2890, avgGasCostUSDC: 0.007 },
  'ARC Testnet': { transactions24h: 5600, avgGasCostUSDC: 0.001 },
};

export async function fetchUSDCTreasuryData(depositor?: string): Promise<TreasuryData> {
  try {
    // Only fetch real balances if depositor address is provided
    if (!depositor) {
      console.log('No depositor address provided, returning empty treasury data');
      return {
        totalUSDC: 0,
        networks: [],
        lastUpdated: new Date(),
        monthlyChange: 0,
        weeklyVolume: 0,
      };
    }

    // Fetch real balances from Circle Gateway
    const chainBalances = await fetchAllChainBalances(depositor);

    // Enhance with mock metrics (transactions and gas costs)
    const networks: NetworkBalance[] = chainBalances.map(chain => ({
      ...chain,
      transactions24h: MOCK_CHAIN_METRICS[chain.network]?.transactions24h || 0,
      avgGasCostUSDC: MOCK_CHAIN_METRICS[chain.network]?.avgGasCostUSDC || 0,
    }));

    const totalUSDC = networks.reduce((sum, net) => sum + net.usdcBalance, 0);

    return {
      totalUSDC,
      networks,
      lastUpdated: new Date(),
      monthlyChange: 12.4, // Can be calculated from historical data later
      weeklyVolume: 8456234.67, // Can be fetched from on-chain data later
    };
  } catch (error) {
    console.error('Error fetching treasury data:', error);
    // Return empty data on error
    return {
      totalUSDC: 0,
      networks: [],
      lastUpdated: new Date(),
      monthlyChange: 0,
      weeklyVolume: 0,
    };
  }
}

export async function fetchCostMetrics(): Promise<CostMetrics> {
  await new Promise(resolve => setTimeout(resolve, 600));

  return {
    avgTransactionCost: 0.0095,
    totalTransactions: 125678,
    totalGasPaid: 1193.94,
    costSavings: 24567.89,
    traditionalGasCost: 25761.83,
    efficiency: 95.4,
  };
}

export interface Transaction {
  id: string;
  timestamp: Date;
  network: string;
  type: 'send' | 'receive' | 'swap' | 'bridge';
  amount: number;
  gasCost: number;
  from: string;
  to: string;
  status: 'completed' | 'pending' | 'failed';
  txHash: string;
}

export async function fetchTransactionHistory(): Promise<Transaction[]> {
  await new Promise(resolve => setTimeout(resolve, 500));

  return [
    {
      id: '1',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      network: 'Ethereum',
      type: 'send',
      amount: 50000,
      gasCost: 0.012,
      from: '0x1234...5678',
      to: '0x8765...4321',
      status: 'completed',
      txHash: '0xabc123...',
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      network: 'Polygon',
      type: 'receive',
      amount: 125000,
      gasCost: 0.008,
      from: '0x9999...1111',
      to: '0x1234...5678',
      status: 'completed',
      txHash: '0xdef456...',
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      network: 'Arbitrum',
      type: 'bridge',
      amount: 75000,
      gasCost: 0.009,
      from: 'Ethereum',
      to: 'Arbitrum',
      status: 'completed',
      txHash: '0xghi789...',
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 1000 * 60 * 45),
      network: 'Base',
      type: 'send',
      amount: 30000,
      gasCost: 0.007,
      from: '0x1234...5678',
      to: '0x2222...3333',
      status: 'completed',
      txHash: '0xjkl012...',
    },
    {
      id: '5',
      timestamp: new Date(Date.now() - 1000 * 60 * 60),
      network: 'Optimism',
      type: 'send',
      amount: 45000,
      gasCost: 0.010,
      from: '0x1234...5678',
      to: '0x4444...5555',
      status: 'pending',
      txHash: '0xmno345...',
    },
    {
      id: '6',
      timestamp: new Date(Date.now() - 1000 * 60 * 90),
      network: 'Polygon',
      type: 'receive',
      amount: 200000,
      gasCost: 0.008,
      from: '0x6666...7777',
      to: '0x1234...5678',
      status: 'completed',
      txHash: '0xpqr678...',
    },
    {
      id: '7',
      timestamp: new Date(Date.now() - 1000 * 60 * 120),
      network: 'Arbitrum',
      type: 'swap',
      amount: 100000,
      gasCost: 0.009,
      from: 'USDC',
      to: 'USDC',
      status: 'completed',
      txHash: '0xstu901...',
    },
    {
      id: '8',
      timestamp: new Date(Date.now() - 1000 * 60 * 150),
      network: 'Ethereum',
      type: 'send',
      amount: 85000,
      gasCost: 0.012,
      from: '0x1234...5678',
      to: '0x8888...9999',
      status: 'completed',
      txHash: '0xvwx234...',
    },
  ];
}
