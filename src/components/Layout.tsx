import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from './ui/button';
import { useTheme } from '../lib/ThemeContext';
import {
  Layers,
  Activity,
  Settings,
  Moon,
  Sun,
  GitBranch,
  Wallet,
  Wrench,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/overview', label: 'Treasury Overview', icon: Layers },
  { path: '/wallet', label: 'My Wallet', icon: Wallet },
  { path: '/rules', label: 'Allocation Rules', icon: GitBranch },
  { path: '/transactions', label: 'Transactions', icon: Activity },
  { path: '/setup', label: 'System Setup', icon: Wrench },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function Layout({ children }: LayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

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
                  <h1 className="text-2xl font-bold tracking-tight dark:text-white">
                    ARCBOARD
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Treasury Management System
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Arc Testnet
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

          {/* Navigation */}
          <nav className="mt-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      className={`flex items-center gap-2 ${
                        isActive
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-800 mt-16">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div>
              © 2024 ARCBOARD. Treasury Management System.
            </div>
            <div className="flex items-center gap-2">
              <span>Built on</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                Arc Testnet
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

