// Mock API data for multi-chain treasury balances
export interface ChainBalance {
  chainId: string;
  chainName: string;
  nativeToken: string;
  balances: {
    token: string;
    symbol: string;
    amount: number;
    valueUSD: number;
  }[];
  totalValueUSD: number;
  rpcUrl: string;
  explorerUrl: string;
}

export interface TreasuryData {
  totalValueUSD: number;
  chains: ChainBalance[];
  lastUpdated: Date;
}

// Simulated API call - would be replaced with real API integration
export async function fetchTreasuryData(): Promise<TreasuryData> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  const chains: ChainBalance[] = [
    {
      chainId: '1',
      chainName: 'Ethereum',
      nativeToken: 'ETH',
      rpcUrl: 'https://eth-mainnet.example.com',
      explorerUrl: 'https://etherscan.io',
      balances: [
        { token: 'ETH', symbol: 'ETH', amount: 245.67, valueUSD: 542478.90 },
        { token: 'USDC', symbol: 'USDC', amount: 1250000, valueUSD: 1250000 },
        { token: 'DAI', symbol: 'DAI', amount: 500000, valueUSD: 500000 },
        { token: 'WETH', symbol: 'WETH', amount: 120.5, valueUSD: 266190.00 },
      ],
      totalValueUSD: 2558668.90,
    },
    {
      chainId: '137',
      chainName: 'Polygon',
      nativeToken: 'MATIC',
      rpcUrl: 'https://polygon-mainnet.example.com',
      explorerUrl: 'https://polygonscan.com',
      balances: [
        { token: 'MATIC', symbol: 'MATIC', amount: 850000, valueUSD: 765000 },
        { token: 'USDC', symbol: 'USDC', amount: 750000, valueUSD: 750000 },
        { token: 'USDT', symbol: 'USDT', amount: 400000, valueUSD: 400000 },
      ],
      totalValueUSD: 1915000,
    },
    {
      chainId: '42161',
      chainName: 'Arbitrum',
      nativeToken: 'ETH',
      rpcUrl: 'https://arb-mainnet.example.com',
      explorerUrl: 'https://arbiscan.io',
      balances: [
        { token: 'ETH', symbol: 'ETH', amount: 180.3, valueUSD: 398262.00 },
        { token: 'USDC', symbol: 'USDC', amount: 900000, valueUSD: 900000 },
        { token: 'ARB', symbol: 'ARB', amount: 500000, valueUSD: 450000 },
      ],
      totalValueUSD: 1748262.00,
    },
    {
      chainId: '10',
      chainName: 'Optimism',
      nativeToken: 'ETH',
      rpcUrl: 'https://opt-mainnet.example.com',
      explorerUrl: 'https://optimistic.etherscan.io',
      balances: [
        { token: 'ETH', symbol: 'ETH', amount: 95.2, valueUSD: 210192.00 },
        { token: 'USDC', symbol: 'USDC', amount: 600000, valueUSD: 600000 },
        { token: 'OP', symbol: 'OP', amount: 300000, valueUSD: 480000 },
      ],
      totalValueUSD: 1290192.00,
    },
    {
      chainId: '8453',
      chainName: 'Base',
      nativeToken: 'ETH',
      rpcUrl: 'https://base-mainnet.example.com',
      explorerUrl: 'https://basescan.org',
      balances: [
        { token: 'ETH', symbol: 'ETH', amount: 67.5, valueUSD: 149175.00 },
        { token: 'USDC', symbol: 'USDC', amount: 450000, valueUSD: 450000 },
      ],
      totalValueUSD: 599175.00,
    },
    {
      chainId: '43114',
      chainName: 'Avalanche',
      nativeToken: 'AVAX',
      rpcUrl: 'https://avax-mainnet.example.com',
      explorerUrl: 'https://snowtrace.io',
      balances: [
        { token: 'AVAX', symbol: 'AVAX', amount: 25000, valueUSD: 875000 },
        { token: 'USDC', symbol: 'USDC', amount: 300000, valueUSD: 300000 },
      ],
      totalValueUSD: 1175000,
    },
  ];

  const totalValueUSD = chains.reduce((sum, chain) => sum + chain.totalValueUSD, 0);

  return {
    totalValueUSD,
    chains,
    lastUpdated: new Date(),
  };
}

export interface Transaction {
  id: string;
  chainName: string;
  type: 'transfer' | 'swap' | 'bridge' | 'deposit' | 'withdrawal';
  from: string;
  to: string;
  amount: number;
  token: string;
  valueUSD: number;
  timestamp: Date;
  txHash: string;
  status: 'completed' | 'pending' | 'failed';
}

export async function fetchRecentActivity(): Promise<Transaction[]> {
  await new Promise(resolve => setTimeout(resolve, 500));

  return [
    {
      id: '1',
      chainName: 'Ethereum',
      type: 'transfer',
      from: '0x1234...5678',
      to: '0x8765...4321',
      amount: 1000,
      token: 'USDC',
      valueUSD: 1000,
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      txHash: '0xabc...def',
      status: 'completed',
    },
    {
      id: '2',
      chainName: 'Polygon',
      type: 'bridge',
      from: '0x1234...5678',
      to: 'Arbitrum',
      amount: 50000,
      token: 'USDC',
      valueUSD: 50000,
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      txHash: '0x123...456',
      status: 'completed',
    },
    {
      id: '3',
      chainName: 'Arbitrum',
      type: 'swap',
      from: 'USDC',
      to: 'ARB',
      amount: 10000,
      token: 'USDC',
      valueUSD: 10000,
      timestamp: new Date(Date.now() - 1000 * 60 * 60),
      txHash: '0x789...012',
      status: 'completed',
    },
    {
      id: '4',
      chainName: 'Optimism',
      type: 'deposit',
      from: '0x9999...8888',
      to: '0x1234...5678',
      amount: 25,
      token: 'ETH',
      valueUSD: 55250,
      timestamp: new Date(Date.now() - 1000 * 60 * 120),
      txHash: '0xdef...ghi',
      status: 'completed',
    },
    {
      id: '5',
      chainName: 'Base',
      type: 'transfer',
      from: '0x1234...5678',
      to: '0x2222...3333',
      amount: 5000,
      token: 'USDC',
      valueUSD: 5000,
      timestamp: new Date(Date.now() - 1000 * 60 * 180),
      txHash: '0xjkl...mno',
      status: 'pending',
    },
  ];
}
