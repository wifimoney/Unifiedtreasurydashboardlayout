import { defineChain } from 'viem'

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
      http: [
        'https://arc-testnet.g.alchemy.com/v2/x9KWnxVYhNfjC0Yr8llKf',
        'https://rpc-testnet.arc.xyz', // Fallback RPC (if available)
      ],
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
