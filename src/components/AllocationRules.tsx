import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { 
  Plus, 
  CheckCircle2, 
  Clock, 
  Users, 
  Calendar, 
  TrendingUp,
  Zap,
  Shield,
  AlertCircle,
  MoreVertical,
  Pause,
  Play,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface AllocationRule {
  id: string;
  recipientWallet: string;
  recipientName: string;
  usdcAmount: number;
  triggerCondition: string;
  frequency: string;
  status: 'active' | 'paused' | 'pending';
  approvalsRequired: number;
  approvalsReceived: number;
  nextExecution: Date;
  lastExecuted: Date | null;
  totalExecutions: number;
  createdAt: Date;
}

const mockRules: AllocationRule[] = [
  {
    id: '1',
    recipientWallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    recipientName: 'Marketing Team',
    usdcAmount: 50000,
    triggerCondition: 'recurring',
    frequency: 'Monthly',
    status: 'active',
    approvalsRequired: 3,
    approvalsReceived: 3,
    nextExecution: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    lastExecuted: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000),
    totalExecutions: 12,
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
  },
  {
    id: '2',
    recipientWallet: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
    recipientName: 'Development Team',
    usdcAmount: 100000,
    triggerCondition: 'performance',
    frequency: 'Quarterly',
    status: 'active',
    approvalsRequired: 5,
    approvalsReceived: 5,
    nextExecution: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    lastExecuted: new Date(Date.now() - 67 * 24 * 60 * 60 * 1000),
    totalExecutions: 4,
    createdAt: new Date(Date.now() - 380 * 24 * 60 * 60 * 1000),
  },
  {
    id: '3',
    recipientWallet: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    recipientName: 'Operations',
    usdcAmount: 25000,
    triggerCondition: 'recurring',
    frequency: 'Bi-weekly',
    status: 'pending',
    approvalsRequired: 3,
    approvalsReceived: 2,
    nextExecution: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    lastExecuted: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
    totalExecutions: 24,
    createdAt: new Date(Date.now() - 360 * 24 * 60 * 60 * 1000),
  },
  {
    id: '4',
    recipientWallet: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    recipientName: 'Sales Incentives',
    usdcAmount: 75000,
    triggerCondition: 'milestone',
    frequency: 'On-Demand',
    status: 'paused',
    approvalsRequired: 4,
    approvalsReceived: 4,
    nextExecution: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    lastExecuted: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
    totalExecutions: 2,
    createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
  },
];

const statusConfig = {
  active: {
    color: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400',
    icon: CheckCircle2,
  },
  paused: {
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
    icon: Pause,
  },
  pending: {
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400',
    icon: Clock,
  },
};

const triggerIcons = {
  recurring: Calendar,
  performance: TrendingUp,
  milestone: Zap,
};

export function AllocationRules() {
  const [rules, setRules] = useState<AllocationRule[]>(mockRules);
  const [formData, setFormData] = useState({
    recipientWallet: '',
    recipientName: '',
    usdcAmount: '',
    triggerCondition: '',
    frequency: '',
    approvalsRequired: '3',
    enableAutoExecution: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.recipientWallet || !formData.usdcAmount || !formData.triggerCondition) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newRule: AllocationRule = {
      id: String(rules.length + 1),
      recipientWallet: formData.recipientWallet,
      recipientName: formData.recipientName || 'Unnamed Recipient',
      usdcAmount: parseFloat(formData.usdcAmount),
      triggerCondition: formData.triggerCondition,
      frequency: formData.frequency,
      status: 'pending',
      approvalsRequired: parseInt(formData.approvalsRequired),
      approvalsReceived: 0,
      nextExecution: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      lastExecuted: null,
      totalExecutions: 0,
      createdAt: new Date(),
    };

    setRules([newRule, ...rules]);
    
    // Reset form
    setFormData({
      recipientWallet: '',
      recipientName: '',
      usdcAmount: '',
      triggerCondition: '',
      frequency: '',
      approvalsRequired: '3',
      enableAutoExecution: true,
    });

    toast.success('Allocation rule created successfully', {
      description: 'Rule is pending multi-signature approval',
    });
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTimeUntil = (date: Date) => {
    const days = Math.floor((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 0) return 'Overdue';
    return `in ${days} days`;
  };

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Active Rules</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl dark:text-white">{rules.filter(r => r.status === 'active').length}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Executing automatically</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Pending Approval</CardTitle>
            <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl dark:text-white">{rules.filter(r => r.status === 'pending').length}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Awaiting signatures</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Total Distributed</CardTitle>
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl dark:text-white">
              ${rules.reduce((sum, r) => sum + (r.usdcAmount * r.totalExecutions), 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">USDC lifetime</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Avg Finality</CardTitle>
            <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl dark:text-white">~2.4s</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Near-instant settlement</p>
          </CardContent>
        </Card>
      </div>

      {/* Create New Rule Form */}
      <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl dark:text-white flex items-center gap-2">
                <Plus className="w-6 h-6" />
                Set New Allocation Rule
              </CardTitle>
              <CardDescription className="dark:text-gray-400 mt-2">
                Configure automated USDC distributions with multi-signature security
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg">
              <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs text-blue-700 dark:text-blue-300">Multi-Sig Protected</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Recipient Information */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="recipientName" className="dark:text-gray-200">
                    Recipient Name <span className="text-gray-400">(Optional)</span>
                  </Label>
                  <Input
                    id="recipientName"
                    placeholder="e.g., Marketing Team"
                    value={formData.recipientName}
                    onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                    className="mt-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="recipientWallet" className="dark:text-gray-200">
                    Recipient Wallet <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="recipientWallet"
                    placeholder="0x..."
                    value={formData.recipientWallet}
                    onChange={(e) => setFormData({ ...formData, recipientWallet: e.target.value })}
                    required
                    className="mt-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Enter the destination wallet address
                  </p>
                </div>

                <div>
                  <Label htmlFor="usdcAmount" className="dark:text-gray-200">
                    USDC Amount <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                      $
                    </span>
                    <Input
                      id="usdcAmount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.usdcAmount}
                      onChange={(e) => setFormData({ ...formData, usdcAmount: e.target.value })}
                      required
                      className="pl-7 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Amount to distribute per execution
                  </p>
                </div>
              </div>

              {/* Trigger Configuration */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="triggerCondition" className="dark:text-gray-200">
                    Trigger Condition <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.triggerCondition}
                    onValueChange={(value) => setFormData({ ...formData, triggerCondition: value })}
                    required
                  >
                    <SelectTrigger 
                      id="triggerCondition" 
                      className="mt-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <SelectValue placeholder="Select trigger type" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:border-gray-600">
                      <SelectItem value="recurring" className="dark:text-white dark:hover:bg-gray-700">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Recurring Schedule
                        </div>
                      </SelectItem>
                      <SelectItem value="performance" className="dark:text-white dark:hover:bg-gray-700">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Performance Trigger
                        </div>
                      </SelectItem>
                      <SelectItem value="milestone" className="dark:text-white dark:hover:bg-gray-700">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          Milestone-Based
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Determines when the rule executes
                  </p>
                </div>

                <div>
                  <Label htmlFor="frequency" className="dark:text-gray-200">
                    Frequency
                  </Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                  >
                    <SelectTrigger 
                      id="frequency" 
                      className="mt-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:border-gray-600">
                      <SelectItem value="weekly" className="dark:text-white dark:hover:bg-gray-700">Weekly</SelectItem>
                      <SelectItem value="biweekly" className="dark:text-white dark:hover:bg-gray-700">Bi-weekly</SelectItem>
                      <SelectItem value="monthly" className="dark:text-white dark:hover:bg-gray-700">Monthly</SelectItem>
                      <SelectItem value="quarterly" className="dark:text-white dark:hover:bg-gray-700">Quarterly</SelectItem>
                      <SelectItem value="ondemand" className="dark:text-white dark:hover:bg-gray-700">On-Demand</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="approvalsRequired" className="dark:text-gray-200">
                    Required Approvals
                  </Label>
                  <Select
                    value={formData.approvalsRequired}
                    onValueChange={(value) => setFormData({ ...formData, approvalsRequired: value })}
                  >
                    <SelectTrigger 
                      id="approvalsRequired" 
                      className="mt-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:border-gray-600">
                      <SelectItem value="2" className="dark:text-white dark:hover:bg-gray-700">2 of N signatures</SelectItem>
                      <SelectItem value="3" className="dark:text-white dark:hover:bg-gray-700">3 of N signatures</SelectItem>
                      <SelectItem value="4" className="dark:text-white dark:hover:bg-gray-700">4 of N signatures</SelectItem>
                      <SelectItem value="5" className="dark:text-white dark:hover:bg-gray-700">5 of N signatures</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Multi-signature security threshold
                  </p>
                </div>
              </div>
            </div>

            <Separator className="dark:bg-gray-700" />

            {/* Advanced Options */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="space-y-0.5">
                <Label htmlFor="autoExecution" className="dark:text-gray-200">
                  Enable Auto-Execution
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Rule executes automatically when conditions are met (after approval)
                </p>
              </div>
              <Switch
                id="autoExecution"
                checked={formData.enableAutoExecution}
                onCheckedChange={(checked) => setFormData({ ...formData, enableAutoExecution: checked })}
              />
            </div>

            {/* Submit Button */}
            <div className="flex items-center gap-4">
              <Button type="submit" size="lg" className="flex-1">
                <Plus className="w-5 h-5 mr-2" />
                Create Allocation Rule
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="lg"
                className="dark:border-gray-600 dark:hover:bg-gray-700"
              >
                Save as Draft
              </Button>
            </div>

            {/* Info Banner */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-xl">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="mb-1">Your rule will be pending until required multi-signature approvals are collected.</p>
                <p>Once approved, transactions execute with deterministic, near-instant finality (~2-3 seconds).</p>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Active Rules Table */}
      <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl dark:text-white">Active Rules</CardTitle>
          <CardDescription className="dark:text-gray-400">
            Manage and monitor all allocation rules with multi-signature approval status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rules.map((rule) => {
              const StatusIcon = statusConfig[rule.status].icon;
              const TriggerIcon = triggerIcons[rule.triggerCondition as keyof typeof triggerIcons] || Calendar;
              
              return (
                <div
                  key={rule.id}
                  className="p-5 border dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Main Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center">
                          <TriggerIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="dark:text-white">{rule.recipientName}</h4>
                            <Badge className={statusConfig[rule.status].color}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {rule.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                            {rule.recipientWallet.slice(0, 20)}...{rule.recipientWallet.slice(-8)}
                          </div>
                        </div>
                      </div>

                      {/* Rule Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pl-13">
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Amount</div>
                          <div className="dark:text-white">
                            ${rule.usdcAmount.toLocaleString()} USDC
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Frequency</div>
                          <div className="dark:text-white">{rule.frequency}</div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Next Execution</div>
                          <div className="dark:text-white">
                            {formatTimeUntil(rule.nextExecution)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(rule.nextExecution)}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Executions</div>
                          <div className="dark:text-white">{rule.totalExecutions}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            ${(rule.usdcAmount * rule.totalExecutions).toLocaleString()} total
                          </div>
                        </div>
                      </div>

                      {/* Multi-Sig Status */}
                      <div className="pl-13 pt-2 border-t dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                Multi-Signature Approvals:
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex -space-x-2">
                                {Array.from({ length: rule.approvalsRequired }).map((_, i) => (
                                  <div
                                    key={i}
                                    className={`w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs ${
                                      i < rule.approvalsReceived
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                                    }`}
                                  >
                                    {i < rule.approvalsReceived ? '✓' : '?'}
                                  </div>
                                ))}
                              </div>
                              <span className="text-sm dark:text-white">
                                {rule.approvalsReceived}/{rule.approvalsRequired} Approved
                              </span>
                            </div>
                          </div>

                          {rule.status === 'active' && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg">
                              <Zap className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                              <span className="text-xs text-green-700 dark:text-green-400">
                                Near-instant finality (~2.4s)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <Button variant="ghost" size="icon" className="dark:hover:bg-gray-600">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                      {rule.status === 'active' && (
                        <Button variant="ghost" size="icon" className="dark:hover:bg-gray-600">
                          <Pause className="w-4 h-4" />
                        </Button>
                      )}
                      {rule.status === 'paused' && (
                        <Button variant="ghost" size="icon" className="dark:hover:bg-gray-600">
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="text-red-600 dark:text-red-400 dark:hover:bg-gray-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
