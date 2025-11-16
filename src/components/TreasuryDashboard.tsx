import { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { formatEther } from 'viem';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  DollarSign,
  TrendingUp,
  RefreshCw,
  Wallet,
  ArrowUpRight,
  ExternalLink
} from 'lucide-react';
import { contracts, getAddressExplorerUrl } from '../lib/contracts';
import { fetchTreasuryBalances, TreasuryBalanceData, formatTokenBalance, getNetworkDisplayName } from '../lib/alchemyApi';

export function TreasuryDashboard() {
  const publicClient = usePublicClient() as any;
  const [treasuryData, setTreasuryData] = useState<TreasuryBalanceData | null>(null);
  const [arcBalance, setArcBalance] = useState<bigint>(0n);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch balances from Alchemy API
      const data = await fetchTreasuryBalances();
      setTreasuryData(data);

      // Fetch Arc Testnet balance directly
      if (publicClient) {
        const balance = await publicClient.readContract({
          address: contracts.TreasuryCore.address,
          abi: contracts.TreasuryCore.abi,
          functionName: 'getBalance',
        });
        setArcBalance(balance);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading treasury data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [publicClient]);

  const networkCount = treasuryData ? Object.keys(treasuryData.byNetwork).length + 1 : 1; // +1 for Arc
  const totalUSD = treasuryData?.totalUSD || 0;
  const arcBalanceNum = parseFloat(formatEther(arcBalance));

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0">
          <CardHeader>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-48" />
          </CardHeader>
          <CardContent>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold dark:text-white mb-1">Treasury Overview</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Multi-chain treasury balances and activity
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={loading}
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Total Balance</CardTitle>
            <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold dark:text-white">
              ${totalUSD.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">USD value across all chains</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Active Networks</CardTitle>
            <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold dark:text-white">
              {networkCount}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Connected chains</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Arc Testnet</CardTitle>
            <Wallet className="w-4 h-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold dark:text-white">
              {arcBalanceNum.toFixed(4)}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">USDC (native)</p>
          </CardContent>
        </Card>
      </div>

      {/* Network Balances */}
      <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg dark:text-white">Network Balances</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Token balances across supported networks
              </p>
            </div>
            <a
              href={getAddressExplorerUrl(contracts.TreasuryCore.address, 'arc')}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              View Treasury
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Arc Testnet */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium dark:text-white">Arc Testnet</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Native USDC</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold dark:text-white">{arcBalanceNum.toFixed(4)} USDC</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">~${(arcBalanceNum * 1).toFixed(2)}</div>
              </div>
            </div>

            {/* Other Networks from Alchemy */}
            {treasuryData && Object.entries(treasuryData.byNetwork).map(([networkKey, networkData]) => (
              <div key={networkKey} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="font-medium dark:text-white">{getNetworkDisplayName(networkData.network)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{networkData.tokens.length} token(s)</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold dark:text-white">${networkData.balance.toFixed(2)}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">USD value</div>
                </div>
              </div>
            ))}

            {/* Empty State - Only show if no Arc balance AND no Alchemy tokens */}
            {arcBalanceNum === 0 && (!treasuryData || Object.keys(treasuryData.byNetwork).length === 0) && (
              <div className="text-center py-12">
                <Wallet className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-2">No balances found</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Treasury address: {contracts.TreasuryCore.address.slice(0, 10)}...{contracts.TreasuryCore.address.slice(-8)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Token Details - Only show if there are tokens with non-zero balance */}
      {treasuryData && treasuryData.tokens.filter(t => BigInt(t.tokenBalance) > 0n).length > 0 && (
        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0">
          <CardHeader>
            <CardTitle className="text-lg dark:text-white">Token Holdings</CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Detailed breakdown of all tokens
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {treasuryData.tokens.map((token, idx) => {
                const balance = formatTokenBalance(token.tokenBalance, token.tokenMetadata?.decimals || 18);
                const price = token.tokenPrices?.find((p) => p.currency === 'usd');
                const usdValue = price
                  ? (parseFloat(token.tokenBalance) / Math.pow(10, token.tokenMetadata?.decimals || 18)) *
                    parseFloat(price.value)
                  : 0;

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {token.tokenMetadata?.logo ? (
                        <img
                          src={token.tokenMetadata.logo}
                          alt={token.tokenMetadata.symbol}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-gray-500" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium dark:text-white">
                          {token.tokenMetadata?.name || 'Unknown Token'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {getNetworkDisplayName(token.network)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium dark:text-white">
                        {balance} {token.tokenMetadata?.symbol || 'TOKEN'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        ${usdValue.toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Updated */}
      <div className="text-center text-xs text-gray-500 dark:text-gray-400">
        Last updated: {lastUpdated.toLocaleTimeString()}
      </div>
    </div>
  );
}

