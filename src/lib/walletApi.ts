import { TokenBalance, TreasuryBalanceData } from './alchemyApi';

const ALCHEMY_API_KEY = 'x9KWnxVYhNfjC0Yr8llKf';

// Supported networks for Alchemy API
const SUPPORTED_NETWORKS = [
  'eth-sepolia',
  'base-sepolia',
  'arb-sepolia',
  'opt-sepolia',
];

/**
 * Fetch token balances for a specific wallet address across multiple networks
 */
export async function fetchWalletBalances(walletAddress: string): Promise<TreasuryBalanceData> {
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
              address: walletAddress,
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
    console.error('Error fetching wallet balances from Alchemy:', error);
    return {
      totalUSD: 0,
      tokens: [],
      byNetwork: {},
    };
  }
}

/**
 * Get network configuration for sending transactions
 */
export interface NetworkConfig {
  id: number;
  name: string;
  displayName: string;
  alchemyKey: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export const NETWORK_CONFIGS: Record<string, NetworkConfig> = {
  'eth-sepolia': {
    id: 11155111,
    name: 'eth-sepolia',
    displayName: 'Ethereum Sepolia',
    alchemyKey: 'eth-sepolia',
    explorerUrl: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'Sepolia ETH',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  'base-sepolia': {
    id: 84532,
    name: 'base-sepolia',
    displayName: 'Base Sepolia',
    alchemyKey: 'base-sepolia',
    explorerUrl: 'https://sepolia.basescan.org',
    nativeCurrency: {
      name: 'Sepolia ETH',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  'arb-sepolia': {
    id: 421614,
    name: 'arb-sepolia',
    displayName: 'Arbitrum Sepolia',
    alchemyKey: 'arb-sepolia',
    explorerUrl: 'https://sepolia.arbiscan.io',
    nativeCurrency: {
      name: 'Sepolia ETH',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  'opt-sepolia': {
    id: 11155420,
    name: 'opt-sepolia',
    displayName: 'Optimism Sepolia',
    alchemyKey: 'opt-sepolia',
    explorerUrl: 'https://sepolia-optimism.etherscan.io',
    nativeCurrency: {
      name: 'Sepolia ETH',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  'arc': {
    id: 5042002,
    name: 'arc',
    displayName: 'Arc Testnet',
    alchemyKey: 'arc',
    explorerUrl: 'https://testnet.arcscan.app',
    nativeCurrency: {
      name: 'USDC',
      symbol: 'USDC',
      decimals: 18,
    },
  },
};

/**
 * Get network config by chain ID
 */
export function getNetworkByChainId(chainId: number): NetworkConfig | undefined {
  return Object.values(NETWORK_CONFIGS).find((config) => config.id === chainId);
}

/**
 * Get network display name
 */
export function getNetworkDisplayName(networkKey: string): string {
  return NETWORK_CONFIGS[networkKey]?.displayName || networkKey;
}
