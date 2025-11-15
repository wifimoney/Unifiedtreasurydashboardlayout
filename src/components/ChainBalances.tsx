import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { fetchTreasuryData, ChainBalance } from '../lib/mockData';
import { Badge } from './ui/badge';
import { ExternalLink } from 'lucide-react';

export function ChainBalances() {
  const [chains, setChains] = useState<ChainBalance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await fetchTreasuryData();
      setChains(data.chains);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded animate-pulse w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-12 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="dark:text-white">Chain Balances</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Detailed breakdown of assets on each blockchain</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {chains.map((chain) => (
          <Card key={chain.chainId} className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="dark:text-white">{chain.chainName}</CardTitle>
                  <CardDescription className="dark:text-gray-400">Chain ID: {chain.chainId}</CardDescription>
                </div>
                <a
                  href={chain.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Value</span>
                  <span className="text-lg dark:text-white">
                    ${chain.totalValueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="space-y-3">
                  {chain.balances.map((balance, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="dark:bg-gray-600 dark:text-gray-200">{balance.symbol}</Badge>
                        <div>
                          <div className="text-sm dark:text-white">
                            {balance.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{balance.token}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm dark:text-white">
                          ${balance.valueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {((balance.valueUSD / chain.totalValueUSD) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}