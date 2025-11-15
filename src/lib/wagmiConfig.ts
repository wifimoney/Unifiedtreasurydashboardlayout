import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { sepolia, avalancheFuji, baseSepolia } from 'viem/chains'
import { arcTestnet } from './chains'

export const config = getDefaultConfig({
  appName: 'Arc Treasury Dashboard',
  projectId: 'YOUR_PROJECT_ID',
  chains: [arcTestnet, sepolia, avalancheFuji, baseSepolia],
  ssr: false,
})
