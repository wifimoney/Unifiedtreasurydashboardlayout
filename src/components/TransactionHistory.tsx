import { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { formatEther } from 'viem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, Search, ExternalLink, AlertCircle } from 'lucide-react';
import { useContracts, getExplorerUrl } from '../lib/contracts';

interface ComplianceEntry {
  id: number;
  transactionHash: string;
  contractAddress: string;
  from: string;
  to: string;
  amount: bigint;
  category: number; // 0=PAYROLL, 1=EXPENSE, 2=INVESTMENT, 3=REVENUE, 4=OTHER
  riskLevel: number; // 0=LOW, 1=MEDIUM, 2=HIGH
  description: string;
  purpose: string;
  jurisdiction: string;
  timestamp: bigint;
  recordedBy: string;
  flagged: boolean;
}

const categoryLabels = {
  0: 'Payroll',
  1: 'Expense',
  2: 'Investment',
  3: 'Revenue',
  4: 'Other',
};

const categoryColors = {
  0: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
  1: 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400',
  2: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400',
  3: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',
  4: 'bg-gray-100 dark:bg-gray-950 text-gray-700 dark:text-gray-400',
};

const riskLevelColors = {
  0: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400',
  1: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400',
  2: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400',
};

const riskLevelLabels = {
  0: 'Low Risk',
  1: 'Medium Risk',
  2: 'High Risk',
};

export function TransactionHistory() {
  const publicClient = usePublicClient() as any;
  const contracts = useContracts();
  const [entries, setEntries] = useState<ComplianceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterRisk, setFilterRisk] = useState('all');

  if (!contracts) {
    return <div className="text-center py-12"><p className="text-gray-600 dark:text-gray-400">No treasury selected</p></div>;
  }

  useEffect(() => {
    async function loadTransactions() {
      if (!publicClient) {
        console.log('⏳ Waiting for publicClient...');
        return;
      }

      setLoading(true);
      console.log('🔍 Fetching transactions from ComplianceTracker...');

      try {
        // Note: ComplianceTracker doesn't have a getter for entries count yet
        // For now, we'll try to fetch a reasonable number of entries
        // In a real implementation, you'd add an entryCount() function to the contract

        const entriesData: ComplianceEntry[] = [];

        // Try to fetch up to 100 entries (adjust based on your needs)
        for (let i = 0; i < 100; i++) {
          try {
            const entry = await publicClient.readContract({
              address: contracts.ComplianceTracker.address,
              abi: contracts.ComplianceTracker.abi,
              functionName: 'entries',
              args: [BigInt(i)],
            }) as any;

            // Parse the entry data (it comes as an array)
            const [
              id,
              transactionHash,
              contractAddress,
              from,
              to,
              amount,
              category,
              riskLevel,
              description,
              purpose,
              jurisdiction,
              timestamp,
              recordedBy,
              flagged,
            ] = entry;

            // If id is 0 and transactionHash is empty, we've reached the end
            if (Number(id) === 0 && transactionHash === '0x0000000000000000000000000000000000000000000000000000000000000000') {
              break;
            }

            entriesData.push({
              id: Number(id),
              transactionHash,
              contractAddress,
              from,
              to,
              amount,
              category: Number(category),
              riskLevel: Number(riskLevel),
              description,
              purpose,
              jurisdiction,
              timestamp,
              recordedBy,
              flagged,
            });
          } catch (error) {
            // Entry doesn't exist, we've reached the end
            break;
          }
        }

        console.log(`✅ Loaded ${entriesData.length} transactions from ComplianceTracker`);
        setEntries(entriesData);
      } catch (error) {
        console.error('❌ Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    }

    loadTransactions();
  }, [publicClient]);

  const filteredEntries = entries.filter(entry => {
    const matchesSearch =
      entry.transactionHash.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = filterCategory === 'all' || entry.category.toString() === filterCategory;
    const matchesRisk = filterRisk === 'all' || entry.riskLevel.toString() === filterRisk;

    return matchesSearch && matchesCategory && matchesRisk;
  });

  const formatTimeAgo = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getCategoryIcon = (category: number) => {
    switch (category) {
      case 3: return ArrowDownLeft; // Revenue (incoming)
      default: return ArrowUpRight; // All others (outgoing)
    }
  };

  if (loading) {
    return (
      <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-sm">
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold dark:text-white mb-1">Transactions</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          On-chain transaction records from ComplianceTracker
        </p>
      </div>

      <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg dark:text-white">All Transactions</CardTitle>
            </div>
          <Button
            variant="outline"
            size="sm"
            className="dark:border-gray-600 dark:hover:bg-gray-700"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
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

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[160px] dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="dark:bg-gray-800 dark:border-gray-600">
              <SelectItem value="all" className="dark:text-white dark:hover:bg-gray-700">All Categories</SelectItem>
              <SelectItem value="0" className="dark:text-white dark:hover:bg-gray-700">Payroll</SelectItem>
              <SelectItem value="1" className="dark:text-white dark:hover:bg-gray-700">Expense</SelectItem>
              <SelectItem value="2" className="dark:text-white dark:hover:bg-gray-700">Investment</SelectItem>
              <SelectItem value="3" className="dark:text-white dark:hover:bg-gray-700">Revenue</SelectItem>
              <SelectItem value="4" className="dark:text-white dark:hover:bg-gray-700">Other</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterRisk} onValueChange={setFilterRisk}>
            <SelectTrigger className="w-[160px] dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              <SelectValue placeholder="Risk Level" />
            </SelectTrigger>
            <SelectContent className="dark:bg-gray-800 dark:border-gray-600">
              <SelectItem value="all" className="dark:text-white dark:hover:bg-gray-700">All Risks</SelectItem>
              <SelectItem value="0" className="dark:text-white dark:hover:bg-gray-700">Low Risk</SelectItem>
              <SelectItem value="1" className="dark:text-white dark:hover:bg-gray-700">Medium Risk</SelectItem>
              <SelectItem value="2" className="dark:text-white dark:hover:bg-gray-700">High Risk</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Transaction List */}
        <div className="space-y-3">
          {filteredEntries.map((entry) => {
            const CategoryIcon = getCategoryIcon(entry.category);

            return (
              <div
                key={entry.id}
                className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg hover:shadow-md dark:hover:bg-gray-700/30 transition-all"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={`p-2.5 rounded-xl ${categoryColors[entry.category as keyof typeof categoryColors]}`}>
                    <CategoryIcon className="w-5 h-5" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-medium dark:text-white">
                        {categoryLabels[entry.category as keyof typeof categoryLabels]}
                      </span>
                      <Badge className={`text-xs ${riskLevelColors[entry.riskLevel as keyof typeof riskLevelColors]}`}>
                        {riskLevelLabels[entry.riskLevel as keyof typeof riskLevelLabels]}
                      </Badge>
                      {entry.flagged && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Flagged
                        </Badge>
                      )}
                    </div>

                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {entry.description || 'No description'}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                      <span className="font-mono">
                        {entry.from.slice(0, 8)}...{entry.from.slice(-6)}
                      </span>
                      <span>→</span>
                      <span className="font-mono">
                        {entry.to.slice(0, 8)}...{entry.to.slice(-6)}
                      </span>
                    </div>

                    {entry.transactionHash !== '0x0000000000000000000000000000000000000000000000000000000000000000' && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400 dark:text-gray-600 font-mono">
                          {entry.transactionHash.slice(0, 16)}...
                        </span>
                        <a
                          href={getExplorerUrl(entry.transactionHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <div className="font-semibold dark:text-white">
                      {parseFloat(formatEther(entry.amount)).toFixed(4)} ETH
                    </div>
                    {entry.purpose && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {entry.purpose}
                      </div>
                    )}
                  </div>

                  <div className="text-right min-w-[80px]">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatTimeAgo(entry.timestamp)}
                    </div>
                    {entry.jurisdiction && (
                      <div className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                        {entry.jurisdiction}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredEntries.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {entries.length === 0 ? 'No transactions yet' : 'No matches found'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              {entries.length === 0
                ? 'Transaction records will appear here once logged by the ComplianceTracker'
                : 'Try adjusting your filters or search terms'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
