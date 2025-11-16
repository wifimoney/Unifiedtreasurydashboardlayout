import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient, useWalletClient } from 'wagmi';
import { parseEther, formatEther, encodeFunctionData, parseGwei } from 'viem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import {
  Plus,
  CheckCircle2,
  Clock,
  Users,
  Calendar,
  TrendingUp,
  Zap,
  AlertCircle,
  Pause,
  Play,
  Trash2,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { contracts, getExplorerUrl } from '../lib/contracts';

// Interface matching contract Rule struct
interface ContractRule {
  name: string;
  description: string;
  ruleType: number; // 0=THRESHOLD, 1=PERCENTAGE, 2=SCHEDULED, 3=HYBRID
  triggerAmount: bigint;
  recipients: `0x${string}`[];
  percentages: number[];
  interval: number;
  lastExecuted: number;
  executionCount: number;
  maxExecutions: number;
  status: number; // 0=ACTIVE, 1=PAUSED, 2=DISABLED
  creator: `0x${string}`;
  createdAt: number;
}

interface AllocationRule extends ContractRule {
  id: number;
}

// Status config matching contract enum (0=ACTIVE, 1=PAUSED, 2=DISABLED)
const statusConfig = {
  0: {
    label: 'Active',
    color: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400',
    icon: CheckCircle2,
  },
  1: {
    label: 'Paused',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
    icon: Pause,
  },
  2: {
    label: 'Disabled',
    color: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400',
    icon: AlertCircle,
  },
};

// Rule type icons (0=THRESHOLD, 1=PERCENTAGE, 2=SCHEDULED, 3=HYBRID)
const ruleTypeIcons = {
  0: TrendingUp,  // THRESHOLD
  1: TrendingUp,  // PERCENTAGE
  2: Calendar,    // SCHEDULED
  3: Zap,         // HYBRID
};

const ruleTypeLabels = {
  0: 'Threshold',
  1: 'Percentage',
  2: 'Scheduled',
  3: 'Hybrid',
};

export function AllocationRules() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient() as any; // Type assertion for wagmi v2 compatibility
  const { data: walletClient } = useWalletClient();
  const [rules, setRules] = useState<AllocationRule[]>([]);
  const [isLoadingRules, setIsLoadingRules] = useState(true);
  const [isCreatingRule, setIsCreatingRule] = useState(false);
  const [formData, setFormData] = useState({
    recipientWallet: '',
    recipientName: '',
    usdcAmount: '',
    ruleType: '',
    interval: '',
    maxExecutions: '100',
  });

  // Read rule count from contract (wagmi v2)
  const { data: ruleCount, refetch: refetchCount } = useReadContract({
    ...contracts.RuleEngine,
    functionName: 'ruleCount',
  });

  // Contract writes (wagmi v2) - keeping for executeRule and updateStatus
  const { data: executeRuleHash, writeContract: writeExecuteRule, isPending: isExecuting } = useWriteContract();
  const { data: updateStatusHash, writeContract: writeUpdateStatus } = useWriteContract();

  // Debug contract setup
  useEffect(() => {
    console.log('🔧 Contract Setup:', {
      ruleEngineAddress: contracts.RuleEngine.address,
      isWalletConnected: isConnected,
      walletAddress: address,
      publicClientAvailable: !!publicClient,
      walletClientAvailable: !!walletClient,
    });
  }, [isConnected, address, publicClient, walletClient]);

  // Wait for execute rule transaction
  const { isSuccess: isExecuteSuccess } = useWaitForTransactionReceipt({
    hash: executeRuleHash,
  });

  // Wait for update status transaction
  const { isSuccess: isUpdateStatusSuccess } = useWaitForTransactionReceipt({
    hash: updateStatusHash,
  });

  // Fetch all rules from contract
  useEffect(() => {
    async function fetchRules() {
      if (!publicClient) {
        console.log('⏳ Waiting for publicClient...');
        return;
      }

      if (!ruleCount || ruleCount === 0n) {
        console.log('📭 No rules found (count:', ruleCount, ')');
        setRules([]);
        setIsLoadingRules(false);
        return;
      }

      setIsLoadingRules(true);
      console.log(`🔍 Fetching ${ruleCount} rules from contract...`);

      try {
        const rulesData: AllocationRule[] = [];
        const count = Number(ruleCount);

        for (let i = 0; i < count; i++) {
          try {
            console.log(`📝 Fetching rule ${i}...`);

            // Fetch rule basic info - returns array: [name, description, ruleType, status, triggerAmount, timesExecuted, totalDistributed, lastExecuted]
            const ruleData = await publicClient.readContract({
              address: contracts.RuleEngine.address,
              abi: contracts.RuleEngine.abi,
              functionName: 'getRule',
              args: [BigInt(i)],
            }) as any;

            // Fetch rule distribution - returns array: [recipients[], values[], usePercentages]
            const distribution = await publicClient.readContract({
              address: contracts.RuleEngine.address,
              abi: contracts.RuleEngine.abi,
              functionName: 'getRuleDistribution',
              args: [BigInt(i)],
            }) as any;

            // Parse the array responses
            const [name, description, ruleType, status, triggerAmount, timesExecuted, totalDistributed, lastExecuted] = ruleData;
            const [recipients, values, usePercentages] = distribution;

            console.log(`✅ Rule ${i} data:`, {
              name,
              type: ruleType,
              status,
              recipients: recipients.length,
            });

            rulesData.push({
              id: i,
              name: name || `Rule ${i + 1}`,
              description: description || 'Allocation Rule',
              ruleType: Number(ruleType),
              triggerAmount: triggerAmount,
              recipients: recipients || [],
              percentages: values || [],
              interval: 0, // Not in current struct, will use checkInterval if needed
              lastExecuted: Number(lastExecuted || 0),
              executionCount: Number(timesExecuted || 0),
              maxExecutions: 0, // Not in current struct
              status: Number(status),
              creator: '0x0000000000000000000000000000000000000000' as `0x${string}`, // Not in current struct
              createdAt: 0, // Not in current struct
            });
          } catch (error) {
            console.error(`❌ Error fetching rule ${i}:`, error);
          }
        }

        console.log(`✅ Loaded ${rulesData.length} rules:`, rulesData);
        setRules(rulesData);
      } catch (error) {
        console.error('❌ Error fetching rules:', error);
        toast.error('Failed to load rules from contract');
      } finally {
        setIsLoadingRules(false);
      }
    }

    fetchRules();
  }, [ruleCount, publicClient]);

  // Handle execute rule success
  useEffect(() => {
    if (isExecuteSuccess) {
      toast.success(
        <div className="flex items-center gap-2">
          <span>Rule executed successfully!</span>
          {executeRuleHash && (
            <a
              href={getExplorerUrl(executeRuleHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:underline"
            >
              View <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      );
      refetchCount(); // Refetch to update execution count
    }
  }, [isExecuteSuccess, executeRuleHash, refetchCount]);

  // Handle update status success
  useEffect(() => {
    if (isUpdateStatusSuccess) {
      toast.success(
        <div className="flex items-center gap-2">
          <span>Rule status updated!</span>
          {updateStatusHash && (
            <a
              href={getExplorerUrl(updateStatusHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:underline"
            >
              View <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      );
      refetchCount(); // Refetch to update status
    }
  }, [isUpdateStatusSuccess, updateStatusHash, refetchCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 Form submitted!');

    if (!isConnected || !address) {
      console.warn('⚠️ Wallet not connected');
      toast.error('Please connect your wallet');
      return;
    }

    if (!formData.recipientWallet || !formData.usdcAmount || !formData.ruleType) {
      console.warn('⚠️ Missing required fields:', formData);
      toast.error('Please fill in all required fields');
      return;
    }

    if (!publicClient || !walletClient) {
      console.error('❌ Client not available');
      toast.error('Wallet client not ready. Please try again.');
      return;
    }

    setIsCreatingRule(true);
    const toastId = toast.loading('Preparing transaction...', {
      description: 'Building transaction object',
    });

    try {
      const amount = parseEther(formData.usdcAmount);

      // Calculate interval in seconds (0 for on-demand)
      let intervalSeconds = 0;
      if (formData.interval === 'weekly') intervalSeconds = 7 * 24 * 60 * 60;
      else if (formData.interval === 'biweekly') intervalSeconds = 14 * 24 * 60 * 60;
      else if (formData.interval === 'monthly') intervalSeconds = 30 * 24 * 60 * 60;
      else if (formData.interval === 'quarterly') intervalSeconds = 90 * 24 * 60 * 60;

      const ruleName = formData.recipientName || 'Allocation Rule';
      const ruleDescription = `${ruleTypeLabels[parseInt(formData.ruleType) as keyof typeof ruleTypeLabels]} rule - ${formData.usdcAmount} USDC`;

      // Log parameters for debugging
      console.log('📝 Creating rule with parameters:', {
        name: ruleName,
        description: ruleDescription,
        ruleType: parseInt(formData.ruleType),
        triggerAmount: amount.toString(),
        checkInterval: intervalSeconds,
        minExecutionGap: intervalSeconds,
        recipients: [formData.recipientWallet],
        values: [amount.toString()],
        usePercentages: false,
        maxPerExecution: '0',
      });

      // Encode the function call
      const data = encodeFunctionData({
        abi: contracts.RuleEngine.abi,
        functionName: 'createRule',
        args: [
          ruleName,  // name (string)
          ruleDescription, // description (string)
          parseInt(formData.ruleType),  // ruleType (uint8)
          amount,  // triggerAmount (uint256)
          BigInt(intervalSeconds),  // checkInterval (uint256)
          BigInt(intervalSeconds),  // minExecutionGap (uint256)
          [formData.recipientWallet as `0x${string}`], // recipients (address[])
          [amount],  // values (uint256[])
          false,  // usePercentages (bool)
          0n,  // maxPerExecution (uint256)
        ],
      });

      toast.loading('Estimating gas...', {
        id: toastId,
        description: 'Calculating optimal gas parameters',
      });

      // Estimate gas for the transaction
      const gasEstimate = await publicClient.estimateGas({
        account: address,
        to: contracts.RuleEngine.address,
        data,
      });

      // Get current gas price
      const gasPrice = await publicClient.getGasPrice();

      // Calculate max fees with premium for faster confirmation
      const maxFeePerGas = (gasPrice * 120n) / 100n; // Add 20% premium
      const maxPriorityFeePerGas = parseGwei('2'); // Fixed priority fee

      // Get nonce
      const nonce = await publicClient.getTransactionCount({
        address: address,
      });

      console.log('⛽ Gas parameters:', {
        gasEstimate: gasEstimate.toString(),
        gasPrice: gasPrice.toString(),
        maxFeePerGas: maxFeePerGas.toString(),
        maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
        nonce,
      });

      toast.loading('Confirm transaction in wallet...', {
        id: toastId,
        description: 'Please approve the transaction',
      });

      // Send transaction using wallet client
      const hash = await walletClient.sendTransaction({
        account: address,
        to: contracts.RuleEngine.address,
        data,
        gas: gasEstimate,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
        chain: walletClient.chain,
      });

      console.log('✅ Transaction sent:', hash);

      toast.loading('Waiting for confirmation...', {
        id: toastId,
        description: `Transaction: ${hash.slice(0, 10)}...${hash.slice(-8)}`,
      });

      // Wait for transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      console.log('✅ Transaction confirmed:', receipt);

      if (receipt.status === 'success') {
        toast.success('Rule created successfully!', {
          id: toastId,
          description: 'Your allocation rule is now active',
        });

        // Reset form
        setFormData({
          recipientWallet: '',
          recipientName: '',
          usdcAmount: '',
          ruleType: '',
          interval: '',
          maxExecutions: '100',
        });

        // Refetch rules
        await refetchCount();
      } else {
        toast.error('Transaction failed', {
          id: toastId,
          description: 'The transaction was reverted',
        });
      }
    } catch (error: any) {
      console.error('❌ Error creating rule:', error);

      let errorMessage = 'Failed to create rule';
      let errorDescription = error?.message || 'Unknown error';

      // Handle specific error types
      if (error?.message?.includes('User rejected') || error?.message?.includes('user rejected')) {
        errorMessage = 'Transaction cancelled';
        errorDescription = 'You rejected the transaction';
      } else if (error?.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds';
        errorDescription = 'Not enough balance to cover gas fees';
      } else if (error?.message?.includes('rate limit')) {
        errorMessage = 'Rate limited';
        errorDescription = 'Too many requests. Please wait a moment.';
      }

      toast.error(errorMessage, {
        id: toastId,
        description: errorDescription,
      });
    } finally {
      setIsCreatingRule(false);
    }
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold dark:text-white mb-2">Allocation Rules</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Automate USDC distributions with smart contract rules
        </p>
      </div>

      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Active Rules</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold dark:text-white">
              {isLoadingRules ? '-' : rules.filter(r => r.status === 0).length}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Currently active</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Paused Rules</CardTitle>
            <Pause className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold dark:text-white">
              {isLoadingRules ? '-' : rules.filter(r => r.status === 1).length}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Temporarily disabled</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Total Executions</CardTitle>
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold dark:text-white">
              {isLoadingRules ? '-' : rules.reduce((sum, r) => sum + r.executionCount, 0)}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Times executed</p>
          </CardContent>
        </Card>
      </div>

      {/* Create New Rule Form */}
      <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl dark:text-white flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
              <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            Create New Rule
          </CardTitle>
          <CardDescription className="dark:text-gray-400">
            Set up automated USDC distributions
          </CardDescription>
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
                  <Label htmlFor="ruleType" className="dark:text-gray-200">
                    Rule Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.ruleType}
                    onValueChange={(value) => setFormData({ ...formData, ruleType: value })}
                    required
                  >
                    <SelectTrigger
                      id="ruleType"
                      className="mt-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <SelectValue placeholder="Select rule type" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:border-gray-600">
                      <SelectItem value="0" className="dark:text-white dark:hover:bg-gray-700">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Threshold - Trigger when balance exceeds amount
                        </div>
                      </SelectItem>
                      <SelectItem value="1" className="dark:text-white dark:hover:bg-gray-700">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Percentage - Distribute percentage of balance
                        </div>
                      </SelectItem>
                      <SelectItem value="2" className="dark:text-white dark:hover:bg-gray-700">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Scheduled - Execute at time intervals
                        </div>
                      </SelectItem>
                      <SelectItem value="3" className="dark:text-white dark:hover:bg-gray-700">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          Hybrid - Combination of conditions
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Determines when the rule executes
                  </p>
                </div>

                <div>
                  <Label htmlFor="interval" className="dark:text-gray-200">
                    Interval
                  </Label>
                  <Select
                    value={formData.interval}
                    onValueChange={(value) => setFormData({ ...formData, interval: value })}
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
                  <Label htmlFor="maxExecutions" className="dark:text-gray-200">
                    Max Executions
                  </Label>
                  <Input
                    id="maxExecutions"
                    type="number"
                    min="0"
                    placeholder="0 for unlimited"
                    value={formData.maxExecutions}
                    onChange={(e) => setFormData({ ...formData, maxExecutions: e.target.value })}
                    className="mt-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Maximum number of times this rule can execute (0 = unlimited)
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center gap-4">
              <Button
                type="submit"
                size="lg"
                className="flex-1"
                disabled={isCreatingRule || !isConnected}
                onClick={(e) => {
                  console.log('🖱️ Button clicked!');
                  console.log('Wallet connected:', isConnected);
                  console.log('Form data:', formData);
                  if (!isConnected) {
                    e.preventDefault();
                    toast.error('Please connect your wallet first');
                  }
                }}
              >
                {isCreatingRule ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    Creating Rule...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 mr-2" />
                    Create Allocation Rule
                  </>
                )}
              </Button>
            </div>

            {/* Info Banner */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-xl">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p>Your rule will be created on-chain and can be executed immediately once conditions are met.</p>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Active Rules Table */}
      <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl dark:text-white">Your Rules</CardTitle>
              <CardDescription className="dark:text-gray-400">
                Manage your allocation rules
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchCount();
                toast.success('Refreshing rules...');
              }}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingRules ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading rules from blockchain...</span>
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No rules yet</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                Create your first allocation rule above to start automating USDC distributions
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => {
                const StatusIcon = statusConfig[rule.status as keyof typeof statusConfig]?.icon || CheckCircle2;
                const TriggerIcon = ruleTypeIcons[rule.ruleType as keyof typeof ruleTypeIcons] || Calendar;
                const recipient = rule.recipients[0] || '0x0...';
                const amountInUsdc = formatEther(rule.triggerAmount);
                // Use the actual distribution value for the first recipient
                const distributionAmount = rule.percentages[0] ? formatEther(rule.percentages[0]) : amountInUsdc;
                const intervalDays = Math.floor(rule.interval / (24 * 60 * 60));
                const nextExecution = rule.lastExecuted + rule.interval;
                const daysUntilNext = Math.floor((nextExecution - Date.now() / 1000) / (24 * 60 * 60));

                return (
                  <div
                    key={rule.id}
                    className="p-6 border dark:border-gray-700 rounded-lg hover:shadow-md dark:hover:bg-gray-700/30 transition-all"
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
                              <h4 className="dark:text-white font-semibold">{rule.name}</h4>
                              <Badge className={statusConfig[rule.status as keyof typeof statusConfig]?.color}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {statusConfig[rule.status as keyof typeof statusConfig]?.label || 'Unknown'}
                              </Badge>
                              <Badge variant="outline" className="dark:border-gray-600">
                                {ruleTypeLabels[rule.ruleType as keyof typeof ruleTypeLabels]}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {rule.description}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-500 font-mono mt-1">
                              To: {recipient.slice(0, 10)}...{recipient.slice(-8)}
                            </div>
                          </div>
                        </div>

                        {/* Rule Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pl-13">
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Trigger Amount</div>
                            <div className="dark:text-white font-semibold">
                              {parseFloat(amountInUsdc).toFixed(2)} USDC
                            </div>
                          </div>

                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Interval</div>
                            <div className="dark:text-white">
                              {intervalDays > 0 ? `${intervalDays} days` : 'On-demand'}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Next Execution</div>
                            <div className="dark:text-white">
                              {rule.lastExecuted === 0 ? 'Not executed yet' :
                               daysUntilNext <= 0 ? 'Ready' :
                               `in ${daysUntilNext} days`}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Executions</div>
                            <div className="dark:text-white">{rule.executionCount}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {rule.maxExecutions > 0 ? `of ${rule.maxExecutions} max` : 'Unlimited'}
                            </div>
                          </div>
                        </div>

                        {/* Rule Metadata */}
                        {(rule.creator !== '0x0000000000000000000000000000000000000000' || rule.createdAt > 0) && (
                          <div className="pl-13 pt-3 border-t dark:border-gray-700">
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              {rule.creator !== '0x0000000000000000000000000000000000000000' && (
                                <>
                                  <Users className="w-3.5 h-3.5" />
                                  <span>Created by: {rule.creator.slice(0, 8)}...{rule.creator.slice(-6)}</span>
                                </>
                              )}
                              {rule.createdAt > 0 && (
                                <>
                                  <span className="mx-2">•</span>
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>{new Date(rule.createdAt * 1000).toLocaleDateString()}</span>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        {/* Execute Button */}
                        {rule.status === 0 && (
                          <Button
                            size="sm"
                            onClick={() => {
                              writeExecuteRule({
                                ...contracts.RuleEngine,
                                functionName: 'executeRule',
                                args: [rule.id],
                              });
                              toast.loading('Executing rule...', {
                                description: 'Please confirm the transaction in your wallet',
                              });
                            }}
                            disabled={isExecuting}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Zap className="w-4 h-4 mr-2" />
                            Execute Rule
                          </Button>
                        )}

                        {/* Pause Button */}
                        {rule.status === 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              writeUpdateStatus({
                                ...contracts.RuleEngine,
                                functionName: 'updateRuleStatus',
                                args: [rule.id, 1], // 1 = PAUSED
                              });
                              toast.loading('Pausing rule...');
                            }}
                            className="dark:border-gray-600"
                          >
                            <Pause className="w-4 h-4 mr-2" />
                            Pause
                          </Button>
                        )}

                        {/* Resume Button */}
                        {rule.status === 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              writeUpdateStatus({
                                ...contracts.RuleEngine,
                                functionName: 'updateRuleStatus',
                                args: [rule.id, 0], // 0 = ACTIVE
                              });
                              toast.loading('Resuming rule...');
                            }}
                            className="dark:border-gray-600"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Resume
                          </Button>
                        )}

                        {/* Disable Button */}
                        {(rule.status === 0 || rule.status === 1) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm('Are you sure you want to permanently disable this rule?')) {
                                writeUpdateStatus({
                                  ...contracts.RuleEngine,
                                  functionName: 'updateRuleStatus',
                                  args: [rule.id, 2], // 2 = DISABLED
                                });
                                toast.loading('Disabling rule...');
                              }
                            }}
                            className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Disable
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
            })}
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
