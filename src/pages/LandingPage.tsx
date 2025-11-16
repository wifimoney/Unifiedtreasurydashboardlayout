import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Card, CardContent } from '../components/ui/card';
import { Layers, Wallet, Shield, Zap, GitBranch, Activity } from 'lucide-react';
import { useTheme } from '../lib/ThemeContext';
import { Button } from '../components/ui/button';
import { Moon, Sun } from 'lucide-react';

export function LandingPage() {
  const { isConnected } = useAccount();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  // Redirect to overview when wallet connects
  useEffect(() => {
    if (isConnected) {
      navigate('/overview');
    }
  }, [isConnected, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-blue-950 transition-colors relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400/20 dark:bg-indigo-600/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-400/10 dark:bg-purple-600/5 rounded-full blur-3xl"></div>
      </div>

      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all"
        >
          {theme === "light" ? (
            <Moon className="w-5 h-5" />
          ) : (
            <Sun className="w-5 h-5" />
          )}
        </Button>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
        <div className="max-w-5xl w-full">
          {/* Logo and Header */}
          <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-600 rounded-3xl shadow-2xl mb-8 transform hover:scale-105 transition-transform">
              <Layers className="w-14 h-14 text-white" />
            </div>
            <h1 className="text-6xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-4">
              ARCBOARD
            </h1>
            <p className="text-2xl text-gray-600 dark:text-gray-400 font-light">
              Enterprise Treasury Management System
            </p>
            <div className="flex items-center justify-center gap-4 mt-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-green-700 dark:text-green-400 font-medium">Arc Testnet Live</span>
              </div>
            </div>
          </div>

          {/* Connect Wallet Card */}
          <Card className="dark:bg-gray-800/80 dark:border-gray-700/50 bg-white/80 backdrop-blur-xl border-0 shadow-2xl mb-16 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 dark:from-blue-500/10 dark:to-indigo-500/10"></div>
            <CardContent className="relative py-16 px-8">
              <div className="text-center space-y-8">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-xl mb-4 animate-pulse">
                  <Wallet className="w-10 h-10 text-white" />
                </div>

                <div className="space-y-4">
                  <h2 className="text-3xl font-bold dark:text-white">
                    Connect Your Wallet
                  </h2>
                  <p className="text-lg text-gray-600 dark:text-gray-400 max-w-lg mx-auto leading-relaxed">
                    Connect your wallet to access the treasury management dashboard and manage your on-chain assets
                  </p>
                </div>

                <div className="flex justify-center pt-6 scale-110">
                  <ConnectButton />
                </div>

                <div className="pt-4">
                  <div className="inline-flex items-center gap-3 px-6 py-3 bg-gray-100/80 dark:bg-gray-700/50 backdrop-blur-sm rounded-full">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50" />
                      <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Connected to Arc Testnet</span>
                    </div>
                    <span className="text-gray-400">•</span>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Secure</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features Grid */}
          <div className="grid gap-6 md:grid-cols-3 mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <Card className="dark:bg-gray-800/50 dark:border-gray-700/50 bg-white/80 backdrop-blur-sm border-0 hover:shadow-xl transition-all hover:-translate-y-1 group">
              <CardContent className="pt-8 pb-6 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 shadow-lg mb-6 group-hover:scale-110 transition-transform">
                  <GitBranch className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold dark:text-white mb-3">Smart Allocation Rules</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Automate fund distributions with customizable on-chain allocation rules
                </p>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800/50 dark:border-gray-700/50 bg-white/80 backdrop-blur-sm border-0 hover:shadow-xl transition-all hover:-translate-y-1 group">
              <CardContent className="pt-8 pb-6 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 shadow-lg mb-6 group-hover:scale-110 transition-transform">
                  <Activity className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold dark:text-white mb-3">Live Tracking</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Real-time transaction monitoring and comprehensive compliance tracking
                </p>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800/50 dark:border-gray-700/50 bg-white/80 backdrop-blur-sm border-0 hover:shadow-xl transition-all hover:-translate-y-1 group">
              <CardContent className="pt-8 pb-6 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 shadow-lg mb-6 group-hover:scale-110 transition-transform">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold dark:text-white mb-3">Enterprise Security</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Multi-signature protection with on-chain security guarantees
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Info */}
          <div className="text-center animate-in fade-in duration-700 delay-500">
            <div className="inline-flex items-center gap-6 px-8 py-4 bg-gray-100/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Instant Finality</span>
              </div>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Secure by Design</span>
              </div>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">On-Chain</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
