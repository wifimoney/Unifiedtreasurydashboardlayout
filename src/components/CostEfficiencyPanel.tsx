import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { fetchCostMetrics, CostMetrics } from '../lib/usdcData';
import { TrendingDown, DollarSign, Zap, PiggyBank, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Badge } from './ui/badge';

export function CostEfficiencyPanel() {
  const [metrics, setMetrics] = useState<CostMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await fetchCostMetrics();
      setMetrics(data);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="dark:bg-gray-800/50 dark:border-gray-700">
          <CardHeader>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-48" />
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!metrics) return null;

  const comparisonData = [
    {
      name: 'ARCBOARD\n(USDC Gas)',
      cost: metrics.totalGasPaid,
      color: '#3b82f6',
    },
    {
      name: 'Traditional\n(ETH Gas)',
      cost: metrics.traditionalGasCost,
      color: '#9ca3af',
    },
  ];

  const benefits = [
    { icon: DollarSign, title: 'Predictable Costs', description: 'Fixed dollar-denominated gas fees' },
    { icon: Zap, title: 'Fast Settlement', description: 'Near-instant transaction finality' },
    { icon: TrendingDown, title: 'Low Overhead', description: 'Average $0.01 per transaction' },
    { icon: CheckCircle2, title: 'No Volatility', description: 'Stable USDC pricing eliminates gas spikes' },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Cost Efficiency Card */}
      <Card className="dark:bg-gradient-to-br dark:from-green-900/20 dark:to-gray-900 bg-gradient-to-br from-green-50 to-white border-0 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
        <CardHeader className="relative">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-950 rounded-xl flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-2xl dark:text-white">Cost Efficiency Overview</CardTitle>
              </div>
              <CardDescription className="text-base dark:text-gray-300">
                Revolutionary USDC-based gas payments for predictable, enterprise-grade treasury operations
              </CardDescription>
            </div>
            <Badge className="bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 border-0 px-4 py-2">
              {metrics.efficiency}% Efficient
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            <div className="p-6 bg-white/50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Average Transaction Cost</div>
              <div className="flex items-end gap-2">
                <span className="text-4xl dark:text-white">
                  ${metrics.avgTransactionCost.toFixed(4)}
                </span>
                <span className="text-lg text-gray-500 dark:text-gray-400 mb-1">USDC</span>
              </div>
              <div className="mt-2 text-xs text-green-600 dark:text-green-400">
                ~$0.01 per transaction
              </div>
            </div>

            <div className="p-6 bg-white/50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Gas Paid (USDC)</div>
              <div className="flex items-end gap-2">
                <span className="text-4xl dark:text-white">
                  ${metrics.totalGasPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {metrics.totalTransactions.toLocaleString()} transactions
              </div>
            </div>

            <div className="p-6 bg-gradient-to-br from-green-100 to-green-50 dark:from-green-950 dark:to-green-900/30 rounded-2xl border border-green-200 dark:border-green-800">
              <div className="text-sm text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
                <PiggyBank className="w-4 h-4" />
                Cost Savings
              </div>
              <div className="flex items-end gap-2">
                <span className="text-4xl text-green-700 dark:text-green-300">
                  ${metrics.costSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="mt-2 text-xs text-green-600 dark:text-green-400">
                vs traditional gas costs
              </div>
            </div>
          </div>

          {/* Comparison Chart */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg dark:text-white mb-1">Cost Comparison</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ARCBOARD vs Traditional Ethereum Gas Fees
              </p>
            </div>
            <div className="h-80 bg-white/50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#9ca3af"
                    style={{ fontSize: '13px' }}
                    tick={{ fill: 'currentColor' }}
                    className="dark:text-gray-400"
                  />
                  <YAxis 
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                    tick={{ fill: 'currentColor' }}
                    className="dark:text-gray-400"
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '12px'
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Total Cost']}
                  />
                  <Bar dataKey="cost" radius={[8, 8, 0, 0]}>
                    {comparisonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Benefits */}
      <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="dark:text-white">Key Benefits of USDC Gas Payments</CardTitle>
          <CardDescription className="dark:text-gray-400">
            Why enterprises choose ARCBOARD for treasury management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {benefits.map((benefit, idx) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={idx}
                  className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600"
                >
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="dark:text-white mb-1">{benefit.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{benefit.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Technical Details */}
      <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="dark:text-white">How It Works</CardTitle>
          <CardDescription className="dark:text-gray-400">
            USDC as native gas powered by Circle Gateway
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center mb-3">1</div>
              <h4 className="text-sm dark:text-white mb-2">USDC Payment</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Transactions are paid using USDC from your treasury balance
              </p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center mb-3">2</div>
              <h4 className="text-sm dark:text-white mb-2">Fixed Pricing</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                All fees are denominated in dollars, eliminating volatility
              </p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center mb-3">3</div>
              <h4 className="text-sm dark:text-white mb-2">Instant Settlement</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Transactions settle quickly with predictable costs
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
