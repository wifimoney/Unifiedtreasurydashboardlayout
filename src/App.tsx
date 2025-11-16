import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import '@rainbow-me/rainbowkit/styles.css';
import { config } from './lib/wagmiConfig';
import { arcTestnet } from './lib/chains';
import { ThemeProvider } from "./lib/ThemeContext";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";

// Pages
import { LandingPage } from "./pages/LandingPage";
import { OverviewPage } from "./pages/OverviewPage";
import { VaultPage } from "./pages/VaultPage";
import { WalletPage } from "./pages/WalletPage";
import { WalletModalPage } from "./pages/WalletModalPage";
import { BudgetsPage } from "./pages/BudgetsPage";
import { PayrollPage } from "./pages/PayrollPage";
import { RulesPage } from "./pages/RulesPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { SetupPage } from "./pages/SetupPage";
import { SettingsPage } from "./pages/SettingsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

function DashboardContent() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public route - Landing page */}
        <Route path="/" element={<LandingPage />} />

        {/* Protected routes - Require wallet connection */}
        <Route path="/overview" element={
          <ProtectedRoute>
            <Layout>
              <OverviewPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/vault" element={
          <ProtectedRoute>
            <Layout>
              <VaultPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/wallet" element={
          <ProtectedRoute>
            <Layout>
              <WalletPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/my-wallet" element={
          <ProtectedRoute>
            <Layout>
              <WalletModalPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/budgets" element={
          <ProtectedRoute>
            <Layout>
              <BudgetsPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/payroll" element={
          <ProtectedRoute>
            <Layout>
              <PayrollPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/rules" element={
          <ProtectedRoute>
            <Layout>
              <RulesPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/transactions" element={
          <ProtectedRoute>
            <Layout>
              <TransactionsPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/setup" element={
          <ProtectedRoute>
            <Layout>
              <SetupPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Layout>
              <SettingsPage />
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
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
