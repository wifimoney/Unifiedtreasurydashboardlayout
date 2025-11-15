import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { fetchRecentActivity, Transaction } from '../lib/mockData';
import { Badge } from './ui/badge';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, ArrowLeftRight, CheckCircle, Clock, XCircle } from 'lucide-react';

const typeIcons = {
  transfer: ArrowUpRight,
  swap: RefreshCw,
  bridge: ArrowLeftRight,
  deposit: ArrowDownLeft,
  withdrawal: ArrowUpRight,
};

const statusColors = {
  completed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
};

const statusIcons = {
  completed: CheckCircle,
  pending: Clock,
  failed: XCircle,
};

export function RecentActivity() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await fetchRecentActivity();
      setTransactions(data);
      setLoading(false);
    }
    loadData();
  }, []);

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="dark:text-white">Recent Activity</CardTitle>
        <CardDescription className="dark:text-gray-400">Latest transactions across all chains</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.map((tx) => {
            const TypeIcon = typeIcons[tx.type];
            const StatusIcon = statusIcons[tx.status];
            
            return (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <TypeIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="capitalize dark:text-white">{tx.type}</span>
                      <Badge variant="outline" className="text-xs dark:border-gray-600 dark:text-gray-300">
                        {tx.chainName}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {tx.type === 'bridge' ? (
                        <>From {tx.from} → {tx.to}</>
                      ) : tx.type === 'swap' ? (
                        <>Swap {tx.from} → {tx.to}</>
                      ) : (
                        <>
                          {tx.from.slice(0, 10)}...{tx.from.slice(-4)} →{' '}
                          {tx.to.slice(0, 10)}...{tx.to.slice(-4)}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="dark:text-white">
                      {tx.amount.toLocaleString()} {tx.token}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      ${tx.valueUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${statusColors[tx.status]}`}>
                      <StatusIcon className="w-3 h-3" />
                      <span className="capitalize">{tx.status}</span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(tx.timestamp)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}