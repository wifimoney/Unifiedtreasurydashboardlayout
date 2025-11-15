import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Shield, 
  CheckCircle2, 
  AlertTriangle,
  Eye,
  EyeOff,
  Download,
  Filter,
  Search,
  FileText,
  Lock,
  Unlock,
  Activity,
  Users,
  Clock,
  TrendingUp,
  Settings,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface AuditLogEntry {
  id: string;
  timestamp: Date;
  txHash: string;
  action: string;
  from: string;
  to: string;
  amount: number;
  network: string;
  complianceStatus: 'approved' | 'flagged' | 'pending' | 'blocked';
  kycStatus: 'verified' | 'pending' | 'failed' | 'not-required';
  amlScore: number;
  privacyLevel: 'public' | 'restricted' | 'private';
  initiatedBy: string;
}

const mockAuditLogs: AuditLogEntry[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    txHash: '0xabc123def456789...',
    action: 'Transfer',
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    to: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
    amount: 50000,
    network: 'Ethereum',
    complianceStatus: 'approved',
    kycStatus: 'verified',
    amlScore: 98,
    privacyLevel: 'public',
    initiatedBy: 'treasury@company.com',
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    txHash: '0xdef456ghi789012...',
    action: 'Allocation Rule Execution',
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    to: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    amount: 25000,
    network: 'Polygon',
    complianceStatus: 'approved',
    kycStatus: 'verified',
    amlScore: 95,
    privacyLevel: 'restricted',
    initiatedBy: 'system-automated',
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    txHash: '0xghi789jkl012345...',
    action: 'Bridge',
    from: 'Ethereum',
    to: 'Arbitrum',
    amount: 100000,
    network: 'Multi-chain',
    complianceStatus: 'flagged',
    kycStatus: 'verified',
    amlScore: 72,
    privacyLevel: 'public',
    initiatedBy: 'ops@company.com',
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    txHash: '0xjkl012mno345678...',
    action: 'Transfer',
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    to: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    amount: 75000,
    network: 'Base',
    complianceStatus: 'pending',
    kycStatus: 'pending',
    amlScore: 85,
    privacyLevel: 'private',
    initiatedBy: 'finance@company.com',
  },
  {
    id: '5',
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    txHash: '0xmno345pqr678901...',
    action: 'Multi-Sig Withdrawal',
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    to: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
    amount: 200000,
    network: 'Optimism',
    complianceStatus: 'approved',
    kycStatus: 'verified',
    amlScore: 99,
    privacyLevel: 'restricted',
    initiatedBy: 'cfo@company.com',
  },
  {
    id: '6',
    timestamp: new Date(Date.now() - 1000 * 60 * 90),
    txHash: '0xpqr678stu901234...',
    action: 'Transfer',
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    to: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
    amount: 15000,
    network: 'Polygon',
    complianceStatus: 'blocked',
    kycStatus: 'failed',
    amlScore: 45,
    privacyLevel: 'public',
    initiatedBy: 'unknown@external.com',
  },
];

const complianceStatusConfig = {
  approved: {
    color: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400',
    icon: CheckCircle2,
  },
  flagged: {
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400',
    icon: AlertTriangle,
  },
  pending: {
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400',
    icon: Clock,
  },
  blocked: {
    color: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400',
    icon: XCircle,
  },
};

const kycStatusConfig = {
  verified: {
    color: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400',
    label: 'Verified',
  },
  pending: {
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400',
    label: 'Pending',
  },
  failed: {
    color: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400',
    label: 'Failed',
  },
  'not-required': {
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
    label: 'Not Required',
  },
};

const privacyLevelConfig = {
  public: { icon: Eye, color: 'text-blue-600 dark:text-blue-400' },
  restricted: { icon: Lock, color: 'text-yellow-600 dark:text-yellow-400' },
  private: { icon: EyeOff, color: 'text-gray-600 dark:text-gray-400' },
};

export function ComplianceSuite() {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(mockAuditLogs);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [privacySettings, setPrivacySettings] = useState({
    defaultPrivacyLevel: 'restricted',
    enableTransparencyReports: true,
    maskSensitiveData: true,
    allowPublicAuditTrail: false,
    restrictHighValueTx: true,
    privacyThreshold: '100000',
  });

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.txHash.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || log.complianceStatus === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const complianceStats = {
    totalTransactions: auditLogs.length,
    approved: auditLogs.filter(l => l.complianceStatus === 'approved').length,
    flagged: auditLogs.filter(l => l.complianceStatus === 'flagged').length,
    blocked: auditLogs.filter(l => l.complianceStatus === 'blocked').length,
    avgAmlScore: Math.round(auditLogs.reduce((sum, l) => sum + l.amlScore, 0) / auditLogs.length),
    kycVerified: auditLogs.filter(l => l.kycStatus === 'verified').length,
  };

  const handlePrivacySettingChange = (key: string, value: any) => {
    setPrivacySettings({ ...privacySettings, [key]: value });
    toast.success('Privacy setting updated');
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getAmlScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="space-y-8">
      {/* Compliance Overview Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Approved</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl dark:text-white">{complianceStats.approved}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {Math.round((complianceStats.approved / complianceStats.totalTransactions) * 100)}% of total
            </p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Flagged</CardTitle>
            <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl dark:text-white">{complianceStats.flagged}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Requires review</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Avg AML Score</CardTitle>
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl dark:text-white">{complianceStats.avgAmlScore}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Out of 100</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">KYC Verified</CardTitle>
            <Users className="w-4 h-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl dark:text-white">{complianceStats.kycVerified}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Via Circle Gateway</p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Status Widget */}
      <Card className="dark:bg-gradient-to-br dark:from-blue-900/20 dark:to-gray-900 bg-gradient-to-br from-blue-50 to-white border-0 shadow-xl">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-2xl dark:text-white">Compliance Status</CardTitle>
                  <CardDescription className="dark:text-gray-400">
                    Automated KYC/AML via Circle Gateway Integration
                  </CardDescription>
                </div>
              </div>
            </div>
            <Badge className="bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 border-0 px-4 py-2">
              All Systems Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-950 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="text-sm dark:text-white">KYC Automation</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Circle Gateway</div>
                </div>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Real-time identity verification for all counterparties
              </div>
            </div>

            <div className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-sm dark:text-white">AML Screening</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Automated</div>
                </div>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Continuous transaction monitoring and risk scoring
              </div>
            </div>

            <div className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-950 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="text-sm dark:text-white">Audit Reports</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Instant Export</div>
                </div>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Regulatory-ready compliance documentation
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Real-Time Audit Log */}
        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-lg lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl dark:text-white">Real-Time Audit Log</CardTitle>
                <CardDescription className="dark:text-gray-400">
                  Complete on-chain fund movement tracking for auditing and regulatory reporting
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="dark:border-gray-600 dark:hover:bg-gray-700">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm" className="dark:border-gray-600 dark:hover:bg-gray-700">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by transaction hash, address, or action..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            {/* Filter Tabs */}
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="dark:bg-gray-700">
                <TabsTrigger 
                  value="all" 
                  onClick={() => setFilterStatus('all')}
                  className="dark:data-[state=active]:bg-gray-600"
                >
                  All ({auditLogs.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="approved"
                  onClick={() => setFilterStatus('approved')}
                  className="dark:data-[state=active]:bg-gray-600"
                >
                  Approved ({complianceStats.approved})
                </TabsTrigger>
                <TabsTrigger 
                  value="flagged"
                  onClick={() => setFilterStatus('flagged')}
                  className="dark:data-[state=active]:bg-gray-600"
                >
                  Flagged ({complianceStats.flagged})
                </TabsTrigger>
                <TabsTrigger 
                  value="blocked"
                  onClick={() => setFilterStatus('blocked')}
                  className="dark:data-[state=active]:bg-gray-600"
                >
                  Blocked ({complianceStats.blocked})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Audit Log Table */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredLogs.map((log) => {
                const StatusIcon = complianceStatusConfig[log.complianceStatus].icon;
                const PrivacyIcon = privacyLevelConfig[log.privacyLevel].icon;
                
                return (
                  <div
                    key={log.id}
                    className="p-4 border dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <StatusIcon className="w-4 h-4" />
                            <span className="dark:text-white">{log.action}</span>
                          </div>
                          <Badge variant="outline" className="text-xs dark:border-gray-600 dark:text-gray-300">
                            {log.network}
                          </Badge>
                          <Badge className={`text-xs ${complianceStatusConfig[log.complianceStatus].color}`}>
                            {log.complianceStatus}
                          </Badge>
                          <Badge className={`text-xs ${kycStatusConfig[log.kycStatus].color}`}>
                            KYC: {kycStatusConfig[log.kycStatus].label}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <PrivacyIcon className={`w-3.5 h-3.5 ${privacyLevelConfig[log.privacyLevel].color}`} />
                            <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                              {log.privacyLevel}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div>
                            <div className="text-gray-500 dark:text-gray-400 mb-1">From</div>
                            <div className="font-mono dark:text-gray-300">
                              {log.from.slice(0, 10)}...{log.from.slice(-6)}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500 dark:text-gray-400 mb-1">To</div>
                            <div className="font-mono dark:text-gray-300">
                              {log.to.slice(0, 10)}...{log.to.slice(-6)}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500 dark:text-gray-400 mb-1">Amount</div>
                            <div className="dark:text-white">
                              ${log.amount.toLocaleString()} USDC
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500 dark:text-gray-400 mb-1">AML Score</div>
                            <div className={getAmlScoreColor(log.amlScore)}>
                              {log.amlScore}/100
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-4">
                            <div className="text-gray-500 dark:text-gray-400">
                              TX: {log.txHash.slice(0, 20)}...
                            </div>
                            <div className="text-gray-500 dark:text-gray-400">
                              By: {log.initiatedBy}
                            </div>
                          </div>
                          <div className="text-gray-500 dark:text-gray-400">
                            {formatTimeAgo(log.timestamp)}
                          </div>
                        </div>
                      </div>

                      <Button variant="ghost" size="sm" className="dark:hover:bg-gray-600">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredLogs.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                No audit logs found matching your criteria
              </div>
            )}
          </CardContent>
        </Card>

        {/* Privacy Settings Panel */}
        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-950 rounded-xl flex items-center justify-center">
                <Settings className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle className="dark:text-white">Privacy Settings</CardTitle>
                <CardDescription className="dark:text-gray-400 text-xs">
                  Arc transparency & privacy tools
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Default Privacy Level */}
            <div className="space-y-3">
              <Label className="dark:text-gray-200">Default Privacy Level</Label>
              <div className="space-y-2">
                {(['public', 'restricted', 'private'] as const).map((level) => {
                  const Icon = privacyLevelConfig[level].icon;
                  return (
                    <button
                      key={level}
                      onClick={() => handlePrivacySettingChange('defaultPrivacyLevel', level)}
                      className={`w-full p-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
                        privacySettings.defaultPrivacyLevel === level
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${privacyLevelConfig[level].color}`} />
                      <div className="text-left flex-1">
                        <div className="dark:text-white capitalize">{level}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {level === 'public' && 'Full transparency for all transactions'}
                          {level === 'restricted' && 'Limited visibility for sensitive operations'}
                          {level === 'private' && 'Maximum privacy for treasury activities'}
                        </div>
                      </div>
                      {privacySettings.defaultPrivacyLevel === level && (
                        <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator className="dark:bg-gray-700" />

            {/* Privacy Toggles */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1 pr-4">
                  <Label className="dark:text-gray-200">Transparency Reports</Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Enable opt-in public reporting for approved transactions
                  </p>
                </div>
                <Switch
                  checked={privacySettings.enableTransparencyReports}
                  onCheckedChange={(checked) => 
                    handlePrivacySettingChange('enableTransparencyReports', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1 pr-4">
                  <Label className="dark:text-gray-200">Mask Sensitive Data</Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Automatically hide wallet addresses in reports
                  </p>
                </div>
                <Switch
                  checked={privacySettings.maskSensitiveData}
                  onCheckedChange={(checked) => 
                    handlePrivacySettingChange('maskSensitiveData', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1 pr-4">
                  <Label className="dark:text-gray-200">Public Audit Trail</Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Allow external audit access via Arc protocol
                  </p>
                </div>
                <Switch
                  checked={privacySettings.allowPublicAuditTrail}
                  onCheckedChange={(checked) => 
                    handlePrivacySettingChange('allowPublicAuditTrail', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1 pr-4">
                  <Label className="dark:text-gray-200">High-Value Restrictions</Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Enforce private mode for large transactions
                  </p>
                </div>
                <Switch
                  checked={privacySettings.restrictHighValueTx}
                  onCheckedChange={(checked) => 
                    handlePrivacySettingChange('restrictHighValueTx', checked)
                  }
                />
              </div>
            </div>

            <Separator className="dark:bg-gray-700" />

            {/* Privacy Threshold */}
            <div className="space-y-2">
              <Label className="dark:text-gray-200">Privacy Threshold (USDC)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  $
                </span>
                <Input
                  type="number"
                  value={privacySettings.privacyThreshold}
                  onChange={(e) => handlePrivacySettingChange('privacyThreshold', e.target.value)}
                  className="pl-7 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Transactions above this amount automatically use private mode
              </p>
            </div>

            <Separator className="dark:bg-gray-700" />

            {/* Info Box */}
            <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-purple-800 dark:text-purple-300">
                  <p className="mb-2">Arc Privacy Protocol ensures selective transparency while maintaining regulatory compliance.</p>
                  <p>All KYC/AML checks remain active regardless of privacy settings.</p>
                </div>
              </div>
            </div>

            <Button className="w-full" variant="outline">
              <Lock className="w-4 h-4 mr-2" />
              View Privacy Policy
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
