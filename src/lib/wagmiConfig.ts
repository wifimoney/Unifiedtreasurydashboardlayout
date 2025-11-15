import {
  metaMaskWallet,
  coinbaseWallet,
  rainbowWallet,
  walletConnectWallet,
  trustWallet,
  ledgerWallet,
  rabbyWallet,
  phantomWallet,
  zerionWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { sepolia, avalancheFuji, baseSepolia } from 'viem/chains'
import { http, fallback } from 'viem'
import { arcTestnet } from './chains'
import { http } from 'wagmi';

const projectId = 'YOUR_PROJECT_ID';

const wallets = [
  {
    groupName: 'Suggested',
    wallets: [
      metaMaskWallet,
      coinbaseWallet,
      rainbowWallet,
      rabbyWallet,
    ],
  },
  {
    groupName: 'Other Wallets',
    wallets: [
      trustWallet,
      ledgerWallet,
      phantomWallet,
      zerionWallet,
      walletConnectWallet,
    ],
  },
];

// Create fallback transport with Arc public RPCs (no rate limiting for deployments)
const arcTransport = fallback(
  [
    http('https://arc-testnet.g.alchemy.com/v2/CXvHG0j6A1Fv6mI2y-iIKxGtWbiW7HN4', {
      timeout: 60000, // Longer timeout for deployments
      retryCount: 0, // Don't retry, let fallback handle it
    })
  ],
  { rank: false } // Try in order, don't rank by performance
);

// Explicitly configure transports for each chain
export const config = getDefaultConfig({
  appName: 'Arc Treasury Dashboard',
  projectId: projectId,
  chains: [arcTestnet, sepolia, avalancheFuji, baseSepolia],

  wallets: wallets,
  transports: {
    [arcTestnet.id]: arcTransport,
    [sepolia.id]: http(),
    [avalancheFuji.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: false,
})

// Log chain configuration for debugging
if (typeof window !== 'undefined') {
  console.log('⚙️ Wagmi configured chains:', config.chains.map(c => ({ id: c.id, name: c.name })));
  console.log('⚙️ Arc RPC: Using public RPCs (rpc.testnet.arc.network, blockdaemon, drpc) - No rate limits!');
}