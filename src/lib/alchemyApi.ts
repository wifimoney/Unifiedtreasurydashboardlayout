import { contracts } from './contracts';

const ALCHEMY_API_KEY = 'x9KWnxVYhNfjC0Yr8llKf'; // Your Alchemy API key

export interface TokenBalance {
  address: string;
  network: string;
  tokenAddress: string;
  tokenBalance: string;
  tokenMetadata?: {
    decimals: number;
    logo?: string;
    name: string;
    symbol: string;
  };
  tokenPrices?: Array<{
    currency: string;
    value: string;
    lastUpdatedAt: string;
  }>;
}

export interface TreasuryBalanceData {
  totalUSD: number;
  tokens: TokenBalance[];
  byNetwork: Record<string, {
    network: string;
    balance: number;
    tokens: TokenBalance[];
  }>;
}

// Supported networks for Alchemy API (Arc Testnet fetched directly via RPC)
const SUPPORTED_NETWORKS = [
  'eth-sepolia',
  'base-sepolia',
  'arb-sepolia',
  'opt-sepolia',
];

export async function fetchTreasuryBalances(): Promise<TreasuryBalanceData> {
  const treasuryAddress = contracts.TreasuryCore.address;

  try {
    const response = await fetch(
      `https://api.g.alchemy.com/data/v1/${ALCHEMY_API_KEY}/assets/tokens/by-address`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addresses: [
            {
              address: treasuryAddress,
              networks: SUPPORTED_NETWORKS,
            },
          ],
          withMetadata: true,
          withPrices: true,
          includeNativeTokens: true,
          includeErc20Tokens: true,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Alchemy API error: ${response.status}`);
    }

    const data = await response.json();
    const allTokens: TokenBalance[] = data.data?.tokens || [];

    // Filter out tokens with zero balance
    const tokens = allTokens.filter((token) => {
      const balance = BigInt(token.tokenBalance);
      return balance > 0n;
    });

    console.log('Alchemy API Response:', {
      total: allTokens.length,
      withBalance: tokens.length,
      tokens: tokens.map(t => ({
        network: t.network,
        symbol: t.tokenMetadata?.symbol,
        balance: t.tokenBalance,
      }))
    });

    // Calculate total USD value
    let totalUSD = 0;
    const byNetwork: Record<string, any> = {};

    tokens.forEach((token) => {
      // Calculate USD value for this token
      const balance = BigInt(token.tokenBalance);
      const decimals = token.tokenMetadata?.decimals || 18;
      const actualBalance = Number(balance) / Math.pow(10, decimals);

      const price = token.tokenPrices?.find((p) => p.currency === 'usd');
      const usdValue = price ? actualBalance * parseFloat(price.value) : 0;

      totalUSD += usdValue;

      // Group by network
      if (!byNetwork[token.network]) {
        byNetwork[token.network] = {
          network: token.network,
          balance: 0,
          tokens: [],
        };
      }

      byNetwork[token.network].balance += usdValue;
      byNetwork[token.network].tokens.push(token);
    });

    return {
      totalUSD,
      tokens,
      byNetwork,
    };
  } catch (error) {
    console.error('Error fetching treasury balances from Alchemy:', error);
    // Return empty data on error
    return {
      totalUSD: 0,
      tokens: [],
      byNetwork: {},
    };
  }
}

export function formatTokenBalance(balance: string, decimals: number): string {
  // Handle hex string from API
  const balanceBigInt = BigInt(balance);
  const actualBalance = Number(balanceBigInt) / Math.pow(10, decimals);

  if (actualBalance < 0.0001) return '< 0.0001';
  if (actualBalance < 1) return actualBalance.toFixed(4);
  if (actualBalance < 1000) return actualBalance.toFixed(2);
  return actualBalance.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function getNetworkDisplayName(network: string): string {
  const networkNames: Record<string, string> = {
    'eth-sepolia': 'Ethereum Sepolia',
    'base-sepolia': 'Base Sepolia',
    'arb-sepolia': 'Arbitrum Sepolia',
    'opt-sepolia': 'Optimism Sepolia',
  };
  return networkNames[network] || network;
}

