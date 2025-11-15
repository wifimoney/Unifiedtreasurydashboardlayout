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

export const config = getDefaultConfig({
  appName: 'Arc Treasury Dashboard',
  projectId: projectId,
  chains: [arcTestnet, sepolia, avalancheFuji, baseSepolia],
  wallets: wallets,
  ssr: false,
});
