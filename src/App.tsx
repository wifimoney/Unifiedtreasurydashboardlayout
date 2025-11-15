import { useState } from "react";
import { WagmiProvider } from 'wagmi';
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

function DashboardContent() {
  const { theme, toggleTheme } = useTheme();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#9CCDEE_0%,#B4F8DC_100%)] pb-10 transition-colors dark:bg-[linear-gradient(135deg,#030A1F_0%,#050B16_100%)]">
      <header className="sticky top-0 z-50 border-b border-white/40 bg-white/80 backdrop-blur-2xl dark:border-white/10 dark:bg-gray-900/80">
        <div className="mx-auto w-full max-w-[1440px] px-5 py-6 sm:px-10 lg:px-20">
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
              <div className="ml-8 hidden items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 dark:border-blue-900 dark:bg-blue-950/30 md:flex">
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
              <div className="hidden items-center gap-2 rounded-full bg-gray-100 px-3 py-2 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400 sm:flex">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Live Data
              </div>
              <ConnectButton />
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-full border border-transparent bg-white/80 p-3 shadow-sm transition hover:border-blue-200 hover:bg-white dark:border-gray-700 dark:bg-gray-800/70 dark:hover:bg-gray-800"
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

      <main className="mx-auto w-full max-w-[1440px] px-5 py-10 sm:px-10 lg:px-20">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12">
            <Tabs defaultValue="overview" className="space-y-10">
              <TabsList className="grid w-full grid-cols-2 gap-4 rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-gray-900/70 lg:grid-cols-4 2xl:flex 2xl:flex-wrap">
                <TabsTrigger
                  value="overview"
                  className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-transparent px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-white data-[state=active]:border-blue-500 data-[state=active]:bg-white data-[state=active]:text-blue-600 dark:text-slate-200 dark:hover:border-white/10 dark:hover:bg-gray-800/60 dark:data-[state=active]:border-white/30 dark:data-[state=active]:bg-gray-800"
                >
                  <Layers className="w-4 h-4" />
                  Treasury Overview
                </TabsTrigger>
                <TabsTrigger
                  value="wallet"
                  className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-transparent px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-white data-[state=active]:border-blue-500 data-[state=active]:bg-white data-[state=active]:text-blue-600 dark:text-slate-200 dark:hover:border-white/10 dark:hover:bg-gray-800/60 dark:data-[state=active]:border-white/30 dark:data-[state=active]:bg-gray-800"
                >
                  <Wallet className="w-4 h-4" />
                  My Wallet
                </TabsTrigger>
                <TabsTrigger
                  value="efficiency"
                  className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-transparent px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-white data-[state=active]:border-blue-500 data-[state=active]:bg-white data-[state=active]:text-blue-600 dark:text-slate-200 dark:hover:border-white/10 dark:hover:bg-gray-800/60 dark:data-[state=active]:border-white/30 dark:data-[state=active]:bg-gray-800"
                >
                  <TrendingDown className="w-4 h-4" />
                  Cost Efficiency
                </TabsTrigger>
                <TabsTrigger
                  value="rules"
                  className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-transparent px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-white data-[state=active]:border-blue-500 data-[state=active]:bg-white data-[state=active]:text-blue-600 dark:text-slate-200 dark:hover:border-white/10 dark:hover:bg-gray-800/60 dark:data-[state=active]:border-white/30 dark:data-[state=active]:bg-gray-800"
                >
                  <GitBranch className="w-4 h-4" />
                  Allocation Rules
                </TabsTrigger>
                <TabsTrigger
                  value="compliance"
                  className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-transparent px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-white data-[state=active]:border-blue-500 data-[state=active]:bg-white data-[state=active]:text-blue-600 dark:text-slate-200 dark:hover:border-white/10 dark:hover:bg-gray-800/60 dark:data-[state=active]:border-white/30 dark:data-[state=active]:bg-gray-800"
                >
                  <Shield className="w-4 h-4" />
                  Compliance & Reporting
                </TabsTrigger>
                <TabsTrigger
                  value="activity"
                  className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-transparent px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-white data-[state=active]:border-blue-500 data-[state=active]:bg-white data-[state=active]:text-blue-600 dark:text-slate-200 dark:hover:border-white/10 dark:hover:bg-gray-800/60 dark:data-[state=active]:border-white/30 dark:data-[state=active]:bg-gray-800"
                >
                  <Activity className="w-4 h-4" />
                  Transaction History
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-transparent px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-white data-[state=active]:border-blue-500 data-[state=active]:bg-white data-[state=active]:text-blue-600 dark:text-slate-200 dark:hover:border-white/10 dark:hover:bg-gray-800/60 dark:data-[state=active]:border-white/30 dark:data-[state=active]:bg-gray-800"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="grid grid-cols-12 gap-4">
                <div className="col-span-12">
                  <USDCTreasuryOverview
                    key={`treasury-${refreshKey}`}
                  />
                </div>
                <div className="col-span-12">
                  <NetworkBalances key={`networks-${refreshKey}`} />
                </div>
              </TabsContent>

              <TabsContent value="wallet" className="grid grid-cols-12 gap-4">
                <div className="col-span-12">
                  <WalletBalances />
                </div>
              </TabsContent>

              <TabsContent value="efficiency" className="grid grid-cols-12 gap-4">
                <div className="col-span-12">
                  <CostEfficiencyPanel />
                </div>
              </TabsContent>

              <TabsContent value="rules" className="grid grid-cols-12 gap-4">
                <div className="col-span-12">
                  <AllocationRules />
                </div>
              </TabsContent>

              <TabsContent value="compliance" className="grid grid-cols-12 gap-4">
                <div className="col-span-12">
                  <ComplianceSuite />
                </div>
              </TabsContent>

              <TabsContent value="activity" className="grid grid-cols-12 gap-4">
                <div className="col-span-12">
                  <TransactionHistory />
                </div>
              </TabsContent>

              <TabsContent value="settings" className="grid grid-cols-12 gap-4">
                <div className="col-span-12">
                  <ArcboardSettings onSave={handleRefresh} />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <footer className="mt-16 border-t border-white/40 dark:border-white/10">
        <div className="mx-auto w-full max-w-[1440px] px-5 py-6 sm:px-10 lg:px-20">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-gray-600 dark:text-gray-400">
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