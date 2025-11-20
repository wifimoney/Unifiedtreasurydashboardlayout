import { getDefaultConfig, connectorsForWallets } from '@rainbow-me/rainbowkit'
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
} from '@rainbow-me/rainbowkit/wallets'
import { sepolia, avalancheFuji, baseSepolia } from 'viem/chains'
import { arcTestnet } from './chains'

const projectId = '964d07e70bdef961f9601b4645cb2799'

const connectors = connectorsForWallets(
[{
groupName: 'Suggested',
wallets: [
metaMaskWallet,
coinbaseWallet,
rainbowWallet,
phantomWallet,
],},
{
groupName: 'Other Wallets',
wallets: [
trustWallet,
ledgerWallet,
rabbyWallet,
zerionWallet,
walletConnectWallet,
],},],
{
appName: 'ARCBOARD',
projectId: projectId,
},)

export const config = getDefaultConfig({
appName: 'Arc Treasury Dashboard',
projectId: projectId,
chains: [arcTestnet, sepolia, avalancheFuji, baseSepolia],
connectors,
ssr: false,
})
