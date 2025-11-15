// USDC-focused treasury data for ARCBOARD

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

export async function fetchUSDCTreasuryData(): Promise<TreasuryData> {
  await new Promise(resolve => setTimeout(resolve, 700));

  const networks: NetworkBalance[] = [
    {
      network: 'Ethereum',
      chainId: '1',
      usdcBalance: 4567890.45,
      nativeToken: 'ETH',
      transactions24h: 1247,
      avgGasCostUSDC: 0.012,
      explorerUrl: 'https://etherscan.io',
      status: 'active',
    },
    {
      network: 'Polygon',
      chainId: '137',
      usdcBalance: 2890123.78,
      nativeToken: 'MATIC',
      transactions24h: 3456,
      avgGasCostUSDC: 0.008,
      explorerUrl: 'https://polygonscan.com',
      status: 'active',
    },
    {
      network: 'Arbitrum',
      chainId: '42161',
      usdcBalance: 3456789.12,
      nativeToken: 'ETH',
      transactions24h: 2134,
      avgGasCostUSDC: 0.009,
      explorerUrl: 'https://arbiscan.io',
      status: 'active',
    },
    {
      network: 'Optimism',
      chainId: '10',
      usdcBalance: 1987654.32,
      nativeToken: 'ETH',
      transactions24h: 1678,
      avgGasCostUSDC: 0.010,
      explorerUrl: 'https://optimistic.etherscan.io',
      status: 'active',
    },
    {
      network: 'Base',
      chainId: '8453',
      usdcBalance: 1234567.89,
      nativeToken: 'ETH',
      transactions24h: 2890,
      avgGasCostUSDC: 0.007,
      explorerUrl: 'https://basescan.org',
      status: 'active',
    },
    {
      network: 'Avalanche',
      chainId: '43114',
      usdcBalance: 987654.21,
      nativeToken: 'AVAX',
      transactions24h: 1123,
      avgGasCostUSDC: 0.011,
      explorerUrl: 'https://snowtrace.io',
      status: 'active',
    },
  ];

  const totalUSDC = networks.reduce((sum, net) => sum + net.usdcBalance, 0);

  return {
    totalUSDC,
    networks,
    lastUpdated: new Date(),
    monthlyChange: 12.4,
    weeklyVolume: 8456234.67,
  };
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
