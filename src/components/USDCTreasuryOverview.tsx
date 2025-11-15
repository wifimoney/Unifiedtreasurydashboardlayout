import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { fetchUSDCTreasuryData, TreasuryData } from '../lib/usdcData';
import { TrendingUp, ArrowUpRight, ArrowDownRight, DollarSign, Activity } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

// Mock historical data for the chart
const generateHistoricalData = (totalUSDC: number) => {
  const data = [];
  const baseValue = totalUSDC * 0.85;
  for (let i = 30; i >= 0; i--) {
    const variance = Math.random() * 0.1 - 0.05;
    const value = baseValue + (totalUSDC - baseValue) * ((30 - i) / 30) + baseValue * variance;
    data.push({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Math.round(value),
    });
  }
  return data;
};

export function USDCTreasuryOverview() {
  const [data, setData] = useState<TreasuryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const treasuryData = await fetchUSDCTreasuryData();
      setData(treasuryData);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-xl">
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

  if (!data) return null;

  const historicalData = generateHistoricalData(data.totalUSDC);
  const activeNetworks = data.networks.filter(n => n.status === 'active').length;
  const totalTransactions = data.networks.reduce((sum, n) => sum + n.transactions24h, 0);

  return (
    <div className="space-y-6">
      {/* Main USDC Balance Card */}
      <Card className="dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 bg-gradient-to-br from-white to-gray-50 border-0 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <CardHeader className="relative">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-sm text-gray-600 dark:text-gray-400 tracking-wide uppercase">
                  Total USDC Balance
                </CardTitle>
              </div>
              <div className="flex items-end gap-4">
                <div className="text-5xl tracking-tight dark:text-white">
                  ${data.totalUSDC.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg mb-2 ${
                  data.monthlyChange >= 0 
                    ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400' 
                    : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'
                }`}>
                  {data.monthlyChange >= 0 ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  <span className="text-sm">{Math.abs(data.monthlyChange)}%</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Aggregated across {data.networks.length} networks
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="px-3 py-1 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg">
                <span className="text-xs text-blue-700 dark:text-blue-300">Circle USDC</span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Updated {data.lastUpdated.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="h-64 -mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historicalData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af" 
                  style={{ fontSize: '12px' }}
                  tick={{ fill: 'currentColor' }}
                  className="dark:text-gray-400"
                />
                <YAxis 
                  stroke="#9ca3af" 
                  style={{ fontSize: '12px' }}
                  tick={{ fill: 'currentColor' }}
                  className="dark:text-gray-400"
                  tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px 12px'
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Balance']}
                  labelStyle={{ color: '#374151' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Active Networks</CardTitle>
            <div className="w-8 h-8 bg-green-100 dark:bg-green-950 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl dark:text-white">{activeNetworks}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">All systems operational</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">24h Volume</CardTitle>
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-950 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl dark:text-white">
              ${data.weeklyVolume.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">USDC transferred</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Transactions (24h)</CardTitle>
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl dark:text-white">{totalTransactions.toLocaleString()}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Across all networks</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
