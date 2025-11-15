import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { fetchUSDCTreasuryData, NetworkBalance } from '../lib/usdcData';
import { Badge } from './ui/badge';
import { ExternalLink, Activity } from 'lucide-react';
import { Progress } from './ui/progress';

export function NetworkBalances() {
  const [networks, setNetworks] = useState<NetworkBalance[]>([]);
  const [totalUSDC, setTotalUSDC] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await fetchUSDCTreasuryData();
      setNetworks(data.networks);
      setTotalUSDC(data.totalUSDC);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="dark:bg-gray-800/50 dark:border-gray-700">
              <CardHeader>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-32" />
              </CardHeader>
              <CardContent>
                <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl dark:text-white">Network Balances</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">USDC distribution across supported networks</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {networks.map((network) => {
          const percentage = (network.usdcBalance / totalUSDC) * 100;
          
          return (
            <Card 
              key={network.chainId}
              className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-lg hover:shadow-xl transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="dark:text-white">{network.network}</CardTitle>
                      <Badge 
                        variant={network.status === 'active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {network.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Chain ID: {network.chainId}</p>
                  </div>
                  <a
                    href={network.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-3xl dark:text-white">
                      ${network.usdcBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Portfolio Share</span>
                      <span className="dark:text-gray-300">{percentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                </div>

                <div className="pt-4 border-t dark:border-gray-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">24h Transactions</span>
                    <div className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm dark:text-white">{network.transactions24h.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Avg Gas Cost</span>
                    <div className="px-2 py-1 bg-green-100 dark:bg-green-950 rounded text-xs text-green-700 dark:text-green-400">
                      ${network.avgGasCostUSDC.toFixed(4)} USDC
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Native Token</span>
                    <Badge variant="outline" className="text-xs dark:border-gray-600 dark:text-gray-300">
                      {network.nativeToken}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
