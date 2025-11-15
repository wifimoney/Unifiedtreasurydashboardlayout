import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { arcTestnet } from './chains'

export const config = getDefaultConfig({
  appName: 'Arc Treasury Dashboard',
  projectId: 'YOUR_PROJECT_ID',
  chains: [arcTestnet],
  ssr: false,
})
