import React, { useState, useEffect } from "react";
import { WagmiProvider, useAccount, useChainId } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { config } from './lib/wagmiConfig';
import { arcTestnet } from './lib/chains';
import { USDCTreasuryOverview } from "./components/USDCTreasuryOverview";
import { CostEfficiencyPanel } from "./components/CostEfficiencyPanel";
import { NetworkBalances } from "./components/NetworkBalances";
import { TransactionHistory } from "./components/TransactionHistory";
import { AllocationRules } from "./components/AllocationRules";
import { ComplianceSuite } from "./components/ComplianceSuite";
import { ArcboardSettings } from "./components/ArcboardSettings";
import { WalletBalances } from "./components/WalletBalances";
import { Onboarding } from "./components/Onboarding";
import { ContractDeploymentService } from "./lib/contractDeploymentService";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./components/ui/tabs";
import {
  Layers,
  TrendingDown,
  Activity,
  Settings,
  Moon,
  Sun,
  GitBranch,
  Shield,
  Wallet,
  Zap,
} from "lucide-react";
import { ThemeProvider, useTheme } from "./lib/ThemeContext";
import { Button } from "./components/ui/button";
import { ConnectButton } from '@rainbow-me/rainbowkit';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

const DEMO_WALLET = '0x499Be1Fc64bF3adCfD9619e0dF92BaA459DFe2DA'; // Hackathon demo wallet

function DashboardContent() {
  const { theme, toggleTheme } = useTheme();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [refreshKey, setRefreshKey] = useState(0);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check if user needs onboarding
  useEffect(() => {
    if (isConnected && address && chainId) {
      // HACKATHON POC: Skip onboarding for all wallets, use existing contracts for demo
      console.log('🎯 HACKATHON POC: Using existing contracts for demo');

      // Use existing deployed contracts for ALL wallets (hackathon demo mode)
      const existingTreasury = "0xcee3Bb02aE95E1Dbc2e5C51a502Ac6eC5deEFa81";
      const existingRuleEngine = "0x69AF02435EfE7Ed08f8f5Fe411831e84e5eA89a8";

      ContractDeploymentService.updateContractAddress(address, chainId, 'treasuryCore', existingTreasury);
      ContractDeploymentService.updateContractAddress(address, chainId, 'ruleEngine', existingRuleEngine);

      setNeedsOnboarding(false);
      setShowOnboarding(false);
    } else {
      setNeedsOnboarding(false);
      setShowOnboarding(false);
    }
  }, [isConnected, address, chainId]);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setNeedsOnboarding(false);
    setRefreshKey((prev) => prev + 1); // Refresh data
  };

  // Show landing page if wallet not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 dark:from-gray-900 dark:via-blue-950 dark:to-gray-950 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full text-center space-y-8">
          {/* Logo and Title */}
          <div className="space-y-4">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl">
              <Layers className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              ARCBOARD
            </h1>
            <p className="text-2xl text-gray-600 dark:text-gray-400">
              Enterprise Treasury Management Platform
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="p-6 bg-white/50 dark:bg-gray-800/50 backdrop-blur rounded-2xl border border-gray-200 dark:border-gray-700">
              <Shield className="w-12 h-12 mx-auto mb-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-lg mb-2 dark:text-white">Own Your Contracts</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Deploy your own RuleEngine with full ownership and control
              </p>
            </div>
            <div className="p-6 bg-white/50 dark:bg-gray-800/50 backdrop-blur rounded-2xl border border-gray-200 dark:border-gray-700">
              <GitBranch className="w-12 h-12 mx-auto mb-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-lg mb-2 dark:text-white">Automated Rules</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Set allocation rules with threshold, percentage, and scheduled triggers
              </p>
            </div>
            <div className="p-6 bg-white/50 dark:bg-gray-800/50 backdrop-blur rounded-2xl border border-gray-200 dark:border-gray-700">
              <Zap className="w-12 h-12 mx-auto mb-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-lg mb-2 dark:text-white">Near-Instant Finality</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Powered by Arc Testnet with ~2-3 second transaction finality
              </p>
            </div>
          </div>

          {/* Connect Button */}
          <div className="pt-8">
            <div className="flex justify-center">
              <ConnectButton showBalance={false} />
            </div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Connect your wallet to deploy contracts and manage your treasury
            </p>
          </div>

          {/* Powered By */}
          <div className="pt-12 flex items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 text-blue-600 dark:text-blue-400"
              fill="currentColor"
            >
              <circle cx="12" cy="12" r="10" />
            </svg>
            <span>Powered by Circle Gateway & Arc Testnet</span>
          </div>

          {/* Theme Toggle */}
          <div className="fixed top-6 right-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="dark:border-gray-700 dark:hover:bg-gray-800 rounded-xl"
            >
              {theme === "light" ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show onboarding if needed
  if (showOnboarding && isConnected) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 transition-colors">
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Layers className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl tracking-tight dark:text-white">
                    ARCBOARD
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Enterprise Treasury Platform
                  </p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2 ml-8 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg">
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 text-blue-600 dark:text-blue-400"
                  fill="currentColor"
                >
                  <circle cx="12" cy="12" r="10" />
                </svg>
                <span className="text-xs text-blue-700 dark:text-blue-300">
                  Powered by Circle Gateway
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Live Data
              </div>
              <ConnectButton />
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="dark:border-gray-700 dark:hover:bg-gray-800 rounded-xl"
              >
                {theme === "light" ? (
                  <Moon className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="dark:bg-gray-800/50 dark:border-gray-700 bg-white/80 backdrop-blur-sm border shadow-sm">
            <TabsTrigger
              value="overview"
              className="flex items-center gap-2 dark:data-[state=active]:bg-gray-700 data-[state=active]:bg-blue-50"
            >
              <Layers className="w-4 h-4" />
              Treasury Overview
            </TabsTrigger>
            <TabsTrigger
              value="wallet"
              className="flex items-center gap-2 dark:data-[state=active]:bg-gray-700 data-[state=active]:bg-blue-50"
            >
              <Wallet className="w-4 h-4" />
              My Wallet
            </TabsTrigger>
            <TabsTrigger
              value="efficiency"
              className="flex items-center gap-2 dark:data-[state=active]:bg-gray-700 data-[state=active]:bg-blue-50"
            >
              <TrendingDown className="w-4 h-4" />
              Cost Efficiency
            </TabsTrigger>
            <TabsTrigger
              value="rules"
              className="flex items-center gap-2 dark:data-[state=active]:bg-gray-700 data-[state=active]:bg-blue-50"
            >
              <GitBranch className="w-4 h-4" />
              Allocation Rules
            </TabsTrigger>
            <TabsTrigger
              value="compliance"
              className="flex items-center gap-2 dark:data-[state=active]:bg-gray-700 data-[state=active]:bg-blue-50"
            >
              <Shield className="w-4 h-4" />
              Compliance & Reporting
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="flex items-center gap-2 dark:data-[state=active]:bg-gray-700 data-[state=active]:bg-blue-50"
            >
              <Activity className="w-4 h-4" />
              Transaction History
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="flex items-center gap-2 dark:data-[state=active]:bg-gray-700 data-[state=active]:bg-blue-50"
            >
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <USDCTreasuryOverview
              key={`treasury-${refreshKey}`}
            />
            <NetworkBalances key={`networks-${refreshKey}`} />
          </TabsContent>

          <TabsContent value="wallet">
            <WalletBalances />
          </TabsContent>

          <TabsContent value="efficiency">
            <CostEfficiencyPanel />
          </TabsContent>

          <TabsContent value="rules">
            <AllocationRules />
          </TabsContent>

          <TabsContent value="compliance">
            <ComplianceSuite />
          </TabsContent>

          <TabsContent value="activity">
            <TransactionHistory />
          </TabsContent>

          <TabsContent value="settings">
            <ArcboardSettings onSave={handleRefresh} />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-800 mt-16">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div>
              © 2024 ARCBOARD. Enterprise Treasury Platform.
            </div>
            <div className="flex items-center gap-2">
              <span>Data provided by</span>
              <span className="text-blue-600 dark:text-blue-400">
                Circle Gateway
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider initialChain={arcTestnet}>
          <ThemeProvider>
            <DashboardContent />
          </ThemeProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}