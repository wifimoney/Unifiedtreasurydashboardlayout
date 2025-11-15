import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { fetchTransactionHistory, Transaction } from '../lib/usdcData';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, ArrowLeftRight, Search, Download } from 'lucide-react';

const typeIcons = {
  send: ArrowUpRight,
  receive: ArrowDownLeft,
  swap: RefreshCw,
  bridge: ArrowLeftRight,
};

const typeColors = {
  send: 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400',
  receive: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',
  swap: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
  bridge: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400',
};

const statusColors = {
  completed: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400',
};

export function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterNetwork, setFilterNetwork] = useState('all');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await fetchTransactionHistory();
      setTransactions(data);
      setLoading(false);
    }
    loadData();
  }, []);

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = 
      tx.txHash.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.network.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.to.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || tx.type === filterType;
    const matchesNetwork = filterNetwork === 'all' || tx.network === filterNetwork;

    return matchesSearch && matchesType && matchesNetwork;
  });

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
      <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="dark:text-white">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="dark:text-white">Transaction History</CardTitle>
            <CardDescription className="dark:text-gray-400">
              Complete record of all USDC transactions
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" className="dark:border-gray-600 dark:hover:bg-gray-700">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[160px] dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="dark:bg-gray-800 dark:border-gray-600">
              <SelectItem value="all" className="dark:text-white dark:hover:bg-gray-700">All Types</SelectItem>
              <SelectItem value="send" className="dark:text-white dark:hover:bg-gray-700">Send</SelectItem>
              <SelectItem value="receive" className="dark:text-white dark:hover:bg-gray-700">Receive</SelectItem>
              <SelectItem value="swap" className="dark:text-white dark:hover:bg-gray-700">Swap</SelectItem>
              <SelectItem value="bridge" className="dark:text-white dark:hover:bg-gray-700">Bridge</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterNetwork} onValueChange={setFilterNetwork}>
            <SelectTrigger className="w-[160px] dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              <SelectValue placeholder="Network" />
            </SelectTrigger>
            <SelectContent className="dark:bg-gray-800 dark:border-gray-600">
              <SelectItem value="all" className="dark:text-white dark:hover:bg-gray-700">All Networks</SelectItem>
              <SelectItem value="Ethereum" className="dark:text-white dark:hover:bg-gray-700">Ethereum</SelectItem>
              <SelectItem value="Polygon" className="dark:text-white dark:hover:bg-gray-700">Polygon</SelectItem>
              <SelectItem value="Arbitrum" className="dark:text-white dark:hover:bg-gray-700">Arbitrum</SelectItem>
              <SelectItem value="Optimism" className="dark:text-white dark:hover:bg-gray-700">Optimism</SelectItem>
              <SelectItem value="Base" className="dark:text-white dark:hover:bg-gray-700">Base</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Transaction List */}
        <div className="space-y-3">
          {filteredTransactions.map((tx) => {
            const TypeIcon = typeIcons[tx.type];
            
            return (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={`p-2.5 rounded-xl ${typeColors[tx.type]}`}>
                    <TypeIcon className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="capitalize dark:text-white">{tx.type}</span>
                      <Badge variant="outline" className="text-xs dark:border-gray-600 dark:text-gray-300">
                        {tx.network}
                      </Badge>
                      <Badge className={`text-xs ${statusColors[tx.status]}`}>
                        {tx.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {tx.type === 'bridge' ? (
                        <>Bridge from {tx.from} to {tx.to}</>
                      ) : (
                        <>
                          {tx.from.slice(0, 10)}...{tx.from.slice(-4)} → {tx.to.slice(0, 10)}...{tx.to.slice(-4)}
                        </>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {tx.txHash.slice(0, 16)}...
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <div className="dark:text-white">
                      ${tx.amount.toLocaleString()} USDC
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Gas: ${tx.gasCost.toFixed(4)}
                    </div>
                  </div>

                  <div className="text-right min-w-[80px]">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatTimeAgo(tx.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No transactions found matching your filters
          </div>
        )}
      </CardContent>
    </Card>
  );
}
