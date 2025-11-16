import { useEffect, useState } from 'react';
import { useAccount, usePublicClient, useBalance } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { fetchWalletBalances, getNetworkDisplayName, NETWORK_CONFIGS } from '../lib/walletApi';
import { TreasuryBalanceData, formatTokenBalance } from '../lib/alchemyApi';
import { arcTestnet } from '../lib/chains';
import { InlineSendForm } from '../components/InlineSendForm';

export function WalletModalPage() {
  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const [walletData, setWalletData] = useState<TreasuryBalanceData | null>(null);
  const [arcBalance, setArcBalance] = useState<bigint>(0n);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [activeSendRow, setActiveSendRow] = useState<string | null>(null);
  const [activeTokenSendRow, setActiveTokenSendRow] = useState<number | null>(null);

  // Fetch Arc balance using wagmi hook
  const { data: arcBalanceData } = useBalance({
    address: address,
    chainId: arcTestnet.id,
  });

  const loadData = async () => {
    if (!address) return;

    setLoading(true);
    try {
      // Fetch balances from Alchemy API for other networks
      const data = await fetchWalletBalances(address);
      setWalletData(data);

      // Arc balance comes from wagmi hook
      if (arcBalanceData) {
        setArcBalance(arcBalanceData.value);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [address, arcBalanceData]);

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const totalUSD = walletData?.totalUSD || 0;
  const arcBalanceNum = parseFloat(formatEther(arcBalance));
  const networkCount = walletData ? Object.keys(walletData.byNetwork).length + 1 : 1;

  if (!address) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Wallet</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Manage your wallet and assets
          </p>
        </div>

        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Wallet className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Wallet Connected
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
              Please connect your wallet using the button in the top navigation bar to view your balances and manage your assets.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Wallet</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Manage your wallet and assets
          </p>
        </div>
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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold dark:text-white mb-1">Wallet</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your personal wallet balances across multiple networks
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

      {/* Wallet Address Card */}
      <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Connected Wallet</p>
              <div className="flex items-center gap-2">
                <code className="text-lg font-mono text-gray-900 dark:text-white">
                  {address.slice(0, 10)}...{address.slice(-8)}
                </code>
                <a
                  href={`https://testnet.arcscan.app/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={handleCopyAddress}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <ArrowDownToLine className="w-4 h-4" />
                  Deposit
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* All Balances - Unified List */}
      <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0">
        <CardHeader>
          <CardTitle className="text-lg dark:text-white">Your Balances</CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            All available assets across networks
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Arc Testnet Native Balance */}
            {arcBalanceNum > 0 && (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium dark:text-white">USDC</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Arc Testnet</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-bold dark:text-white">{arcBalanceNum.toFixed(4)} USDC</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">~${arcBalanceNum.toFixed(2)}</div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => setActiveSendRow(activeSendRow === 'arc' ? null : 'arc')}
                    >
                      <ArrowUpFromLine className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {activeSendRow === 'arc' && (
                  <InlineSendForm
                    onClose={() => setActiveSendRow(null)}
                    networkId={arcTestnet.id}
                  />
                )}
              </div>
            )}

            {/* All ERC-20 Tokens */}
            {walletData && walletData.tokens.map((token, idx) => {
              const balance = formatTokenBalance(token.tokenBalance, token.tokenMetadata?.decimals || 18);
              const balanceNum = parseFloat(balance);

              // Skip tokens with 0 balance
              if (balanceNum === 0) return null;

              const price = token.tokenPrices?.find((p) => p.currency === 'usd');
              const usdValue = price
                ? (parseFloat(token.tokenBalance) / Math.pow(10, token.tokenMetadata?.decimals || 18)) *
                  parseFloat(price.value)
                : null;

              return (
                <div key={idx} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      {token.tokenMetadata?.logo ? (
                        <img
                          src={token.tokenMetadata.logo}
                          alt={token.tokenMetadata.symbol}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <Wallet className="w-5 h-5 text-gray-500" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium dark:text-white">
                          {token.tokenMetadata?.symbol || token.tokenMetadata?.name || 'Unknown Token'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {getNetworkDisplayName(token.network)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold dark:text-white">
                          {balance} {token.tokenMetadata?.symbol || 'TOKEN'}
                        </div>
                        {usdValue !== null && usdValue > 0 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            ~${usdValue.toFixed(2)}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => setActiveTokenSendRow(activeTokenSendRow === idx ? null : idx)}
                      >
                        <ArrowUpFromLine className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {activeTokenSendRow === idx && (
                    <InlineSendForm
                      onClose={() => setActiveTokenSendRow(null)}
                      networkId={NETWORK_CONFIGS[token.network]?.id}
                      tokenAddress={token.tokenAddress}
                      tokenSymbol={token.tokenMetadata?.symbol}
                      tokenDecimals={token.tokenMetadata?.decimals}
                      tokenBalance={token.tokenBalance}
                    />
                  )}
                </div>
              );
            })}

            {/* Empty State */}
            {arcBalanceNum === 0 && (!walletData || walletData.tokens.filter(t => parseFloat(formatTokenBalance(t.tokenBalance, t.tokenMetadata?.decimals || 18)) > 0).length === 0) && (
              <div className="text-center py-12">
                <Wallet className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-2">No balances found</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Your wallet doesn't have any tokens yet
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Last Updated */}
      <div className="text-center text-xs text-gray-500 dark:text-gray-400">
        Last updated: {lastUpdated.toLocaleTimeString()}
      </div>
    </div>
  );
}
