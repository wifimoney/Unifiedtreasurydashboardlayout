import { defineChain } from 'viem'

// Using Arc public RPCs to avoid rate limiting issues
console.log('🌐 Arc Testnet RPC configured: Public RPCs (no rate limits)');

export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18, // Native token uses 18 decimals in EVM
  },
  rpcUrls: {
    default: {
      http: ['https://arc-testnet.g.alchemy.com/v2/CXvHG0j6A1Fv6mI2y-iIKxGtWbiW7HN4'],
    },
  },
  blockExplorers: {
    default: {
      name: 'ArcScan',
      url: 'https://testnet.arcscan.app',
    },
  },
  testnet: true,
})
