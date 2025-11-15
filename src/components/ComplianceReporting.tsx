import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { fetchAuditLogs, fetchComplianceMetrics, AuditLog, ComplianceMetrics } from '../lib/complianceData';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Search,
  Download,
  Eye,
  Filter
} from 'lucide-react';

export function ComplianceReporting() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterChain, setFilterChain] = useState('all');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [logs, metricsData] = await Promise.all([
        fetchAuditLogs(),
        fetchComplianceMetrics(),
      ]);
      setAuditLogs(logs);
      setMetrics(metricsData);
      setLoading(false);
    }
    loadData();
  }, []);

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.txHash.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || log.complianceStatus === filterStatus;
    const matchesChain = filterChain === 'all' || log.chainName === filterChain;

    return matchesSearch && matchesStatus && matchesChain;
  });

  const statusColors = {
    approved: 'bg-green-100 text-green-800',
    flagged: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
    reviewed: 'bg-blue-100 text-blue-800',
  };

  const riskColors = {
    low: 'text-green-600',
    medium: 'text-yellow-600',
    high: 'text-red-600',
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compliance Metrics */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Total Transactions</CardTitle>
            <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl dark:text-white">{metrics?.totalTransactions.toLocaleString()}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Last 30 days</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Flagged Items</CardTitle>
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl dark:text-white">{metrics?.flaggedTransactions}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Requires review</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Compliance Rate</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl dark:text-white">{metrics?.complianceRate}%</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Auto-approved</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Avg Review Time</CardTitle>
            <Clock className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl dark:text-white">{metrics?.averageReviewTime}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Minutes</p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Monitoring Status */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Transaction Monitoring Status</CardTitle>
          <CardDescription className="dark:text-gray-400">Real-time compliance monitoring across all chains</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {metrics?.monitoringStatus.map((status, idx) => (
              <div key={idx} className="p-4 border dark:border-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="dark:text-white">{status.chainName}</span>
                  <Badge variant={status.status === 'active' ? 'default' : 'secondary'}>
                    {status.status}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Last scan:</span>
                    <span className="dark:text-gray-300">{new Date(status.lastScan).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Checks passed:</span>
                    <span className="dark:text-gray-300">{status.checksPerformed}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="dark:text-white">Audit Logs</CardTitle>
              <CardDescription className="dark:text-gray-400">Comprehensive transaction audit trail</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="dark:border-gray-600 dark:hover:bg-gray-700">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px] dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-600">
                  <SelectItem value="all" className="dark:text-white dark:hover:bg-gray-700">All Status</SelectItem>
                  <SelectItem value="approved" className="dark:text-white dark:hover:bg-gray-700">Approved</SelectItem>
                  <SelectItem value="flagged" className="dark:text-white dark:hover:bg-gray-700">Flagged</SelectItem>
                  <SelectItem value="pending" className="dark:text-white dark:hover:bg-gray-700">Pending</SelectItem>
                  <SelectItem value="reviewed" className="dark:text-white dark:hover:bg-gray-700">Reviewed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterChain} onValueChange={setFilterChain}>
                <SelectTrigger className="w-[180px] dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <SelectValue placeholder="Filter by chain" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-600">
                  <SelectItem value="all" className="dark:text-white dark:hover:bg-gray-700">All Chains</SelectItem>
                  <SelectItem value="Ethereum" className="dark:text-white dark:hover:bg-gray-700">Ethereum</SelectItem>
                  <SelectItem value="Polygon" className="dark:text-white dark:hover:bg-gray-700">Polygon</SelectItem>
                  <SelectItem value="Arbitrum" className="dark:text-white dark:hover:bg-gray-700">Arbitrum</SelectItem>
                  <SelectItem value="Optimism" className="dark:text-white dark:hover:bg-gray-700">Optimism</SelectItem>
                  <SelectItem value="Base" className="dark:text-white dark:hover:bg-gray-700">Base</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <TabsList className="dark:bg-gray-700">
              <TabsTrigger value="all" className="dark:data-[state=active]:bg-gray-600">
                All ({filteredLogs.length})
              </TabsTrigger>
              <TabsTrigger value="flagged" className="dark:data-[state=active]:bg-gray-600">
                Flagged ({filteredLogs.filter(l => l.complianceStatus === 'flagged').length})
              </TabsTrigger>
              <TabsTrigger value="pending" className="dark:data-[state=active]:bg-gray-600">
                Pending ({filteredLogs.filter(l => l.complianceStatus === 'pending').length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-3">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="dark:text-white">{log.action}</span>
                        <Badge variant="outline" className="dark:border-gray-600 dark:text-gray-300">{log.chainName}</Badge>
                        <Badge className={statusColors[log.complianceStatus]}>
                          {log.complianceStatus}
                        </Badge>
                        <span className={`text-sm ${riskColors[log.riskLevel]}`}>
                          Risk: {log.riskLevel}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-500">Entity</div>
                          <div className="dark:text-gray-300">{log.entity}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-500">Amount</div>
                          <div className="dark:text-gray-300">${log.amount.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-500">Timestamp</div>
                          <div className="dark:text-gray-300">{new Date(log.timestamp).toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-500">Reviewer</div>
                          <div className="dark:text-gray-300">{log.reviewer || 'Auto'}</div>
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        TX: {log.txHash}
                      </div>

                      {log.notes && (
                        <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm">
                          <div className="flex items-start gap-2">
                            <Shield className="w-4 h-4 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                            <span className="text-yellow-800 dark:text-yellow-300">{log.notes}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <Button variant="ghost" size="sm" className="dark:hover:bg-gray-600">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="flagged" className="space-y-3">
              {filteredLogs.filter(l => l.complianceStatus === 'flagged').map((log) => (
                <div
                  key={log.id}
                  className="p-4 border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 rounded-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-500" />
                        <span className="dark:text-white">{log.action}</span>
                        <Badge variant="outline" className="dark:border-red-800 dark:text-red-300">{log.chainName}</Badge>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        Entity: {log.entity} | Amount: ${log.amount.toLocaleString()}
                      </div>
                      {log.notes && (
                        <div className="text-sm text-red-800 dark:text-red-300">{log.notes}</div>
                      )}
                    </div>
                    <Button size="sm">Review</Button>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="pending" className="space-y-3">
              {filteredLogs.filter(l => l.complianceStatus === 'pending').map((log) => (
                <div
                  key={log.id}
                  className="p-4 border border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
                        <span className="dark:text-white">{log.action}</span>
                        <Badge variant="outline" className="dark:border-yellow-800 dark:text-yellow-300">{log.chainName}</Badge>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        Entity: {log.entity} | Amount: ${log.amount.toLocaleString()}
                      </div>
                    </div>
                    <Button size="sm">Review</Button>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}