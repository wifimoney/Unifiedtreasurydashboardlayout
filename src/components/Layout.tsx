import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from './ui/button';
import { useTheme } from '../lib/ThemeContext';
import { TreasurySwitcher } from './TreasurySwitcher';
import {
  Layers,
  Activity,
  Moon,
  Sun,
  GitBranch,
  Wallet,
  Building2,
  ArrowLeftRight,
  Users,
  Lock,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/overview', label: 'Overview', icon: Layers },
  { path: '/vault', label: 'Treasury Vault', icon: Lock },
  { path: '/gateway', label: 'Gateway', icon: ArrowLeftRight },
  { path: '/budgets', label: 'Budgets', icon: Building2 },
  { path: '/payroll', label: 'Payroll', icon: Users },
  { path: '/rules', label: 'Rules', icon: GitBranch },
  { path: '/transactions', label: 'Transactions', icon: Activity },
];

export function Layout({ children }: LayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Left Sidebar - Fixed */}
      <aside className="w-64 bg-white dark:bg-gray-900 flex flex-col border-r border-gray-200 dark:border-gray-800 flex-shrink-0">
        {/* Sidebar Header */}
        <Link to="/overview" className="h-20 flex items-center gap-3 px-6 border-b border-gray-200 dark:border-gray-800 cursor-pointer flex-shrink-0">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md">
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white" fillOpacity="0.95"/>
              <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight dark:text-white bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent dark:from-blue-400 dark:to-blue-500">
              ARCBOARD
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Treasury</p>
          </div>
        </Link>

        {/* Navigation Icons - Scrollable if needed */}
        <nav className="flex flex-col gap-1 w-full px-3 py-4 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link key={item.path} to={item.path} className="cursor-pointer">
                <button
                  className={`w-full h-12 rounded-lg flex items-center gap-3 px-4 transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={2} />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions - Fixed at bottom */}
        <div className="flex flex-col gap-1 w-full px-3 pb-4 pt-4 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div className="w-full h-12 rounded-lg bg-green-50 dark:bg-green-950/20 flex items-center gap-3 px-4">
            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
            <span className="text-sm font-medium text-green-700 dark:text-green-400">Arc Testnet</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area - Flex column */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-20 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0">
          <div className="h-full px-8 flex items-center justify-between">
            {/* Empty left side */}
            <div></div>

            {/* Right side content */}
            <div className="flex items-center gap-3 pr-4">
              {/* Treasury Switcher */}
              <TreasurySwitcher />

              {/* Wallet Button */}
              <Link to="/my-wallet" className="cursor-pointer">
                <Button
                  variant="outline"
                  className="h-10 px-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center gap-2 transition-all"
                  title="Wallet"
                >
                  <Wallet className="w-4 h-4" strokeWidth={2} />
                  <span className="text-sm font-medium">Wallet</span>
                </Button>
              </Link>

              {/* Wallet Connect Button */}
              <div className="[&_button]:!h-10 [&_button]:!rounded-lg [&_button]:!px-4 [&_button]:!text-sm [&_button]:!font-medium [&_button]:!cursor-pointer">
                <ConnectButton />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content - Scrollable */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0">
          <div className="px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <div>© 2024 ARCBOARD</div>
              <div>Powered by Arc Testnet</div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
