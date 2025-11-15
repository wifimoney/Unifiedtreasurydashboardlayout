import axios from 'axios';

const CIRCLE_GATEWAY_API = 'https://gateway-api-testnet.circle.com/v1/balances';

// Circle Gateway testnet domain mappings (only supported chains)
const CHAIN_DOMAINS = {
  'Ethereum Sepolia': 0,
  'Avalanche Fuji': 1,
  'Base Sepolia': 6,
  'ARC Testnet': 26,
} as const;

const CHAIN_INFO = {
  'Ethereum Sepolia': { chainId: '11155111', nativeToken: 'ETH', explorerUrl: 'https://sepolia.etherscan.io' },
  'Avalanche Fuji': { chainId: '43113', nativeToken: 'AVAX', explorerUrl: 'https://testnet.snowtrace.io' },
  'Base Sepolia': { chainId: '84532', nativeToken: 'ETH', explorerUrl: 'https://sepolia.basescan.org' },
  'ARC Testnet': { chainId: '5042002', nativeToken: 'USDC', explorerUrl: 'https://testnet.arcscan.app' },
} as const;

interface CircleBalanceResponse {
  token: string;
  balances: Array<{
    domain: number;
    depositor: string;
    balance: string;
  }>;
}

export interface ChainBalance {
  network: string;
  chainId: string;
  usdcBalance: number;
  nativeToken: string;
  explorerUrl: string;
  status: 'active' | 'syncing' | 'offline';
}

export async function fetchChainBalance(
  chain: keyof typeof CHAIN_DOMAINS,
  depositor: string
): Promise<ChainBalance> {
  try {
    console.log(`Fetching balance for ${chain} (domain: ${CHAIN_DOMAINS[chain]}, depositor: ${depositor})...`);

    const response = await axios.post<CircleBalanceResponse>(
      CIRCLE_GATEWAY_API,
      {
        token: 'USDC',
        sources: [{ domain: CHAIN_DOMAINS[chain], depositor }],
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    console.log(`Response for ${chain}:`, response.data);

    const balanceData = response.data.balances[0];
    const amount = balanceData ? parseFloat(balanceData.balance) : 0;
    const info = CHAIN_INFO[chain];

    console.log(`${chain} balance: ${amount} USDC`);

    return {
      network: chain,
      chainId: info.chainId,
      usdcBalance: amount,
      nativeToken: info.nativeToken,
      explorerUrl: info.explorerUrl,
      status: 'active',
    };
  } catch (error) {
    console.error(`Error fetching balance for ${chain}:`, error);
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
    }
    const info = CHAIN_INFO[chain];
    return {
      network: chain,
      chainId: info.chainId,
      usdcBalance: 0,
      nativeToken: info.nativeToken,
      explorerUrl: info.explorerUrl,
      status: 'offline',
    };
  }
}

export async function fetchAllChainBalances(depositor: string): Promise<ChainBalance[]> {
  const chains = Object.keys(CHAIN_DOMAINS) as Array<keyof typeof CHAIN_DOMAINS>;

  console.log('Fetching balances for all chains:', chains);
  console.log('Depositor address:', depositor);

  // Fetch all balances in parallel
  const balancePromises = chains.map(chain => fetchChainBalance(chain, depositor));
  const balances = await Promise.all(balancePromises);

  const totalBalance = balances.reduce((sum, b) => sum + b.usdcBalance, 0);
  console.log('Total balance across all chains:', totalBalance);
  console.log('All chain balances:', balances);

  return balances;
}
