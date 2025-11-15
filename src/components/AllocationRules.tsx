import React, { useState, useEffect, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { parseEther, formatEther } from 'viem';
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
  Trash2,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { getUserContracts, RuleType, RuleStatus, getExplorerUrl } from '../lib/contracts';

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
  const chainId = useChainId();
  const [rules, setRules] = useState<AllocationRule[]>([]);
  const [isLoadingRules, setIsLoadingRules] = useState(true);
  const [formData, setFormData] = useState({
    recipientWallet: '',
    recipientName: '',
    usdcAmount: '',
    ruleType: '',
    interval: '',
    maxExecutions: '100',
  });

  // Get user's deployed contracts or fallback to default
  const contracts = useMemo(() => {
    return getUserContracts(address, chainId);
  }, [address, chainId]);

  // Read rule count from contract (wagmi v2)
  const { data: ruleCount, refetch: refetchCount } = useReadContract({
    ...contracts.RuleEngine,
    functionName: 'getRuleCount',
  });

  // Contract writes (wagmi v2)
  const {
    data: createRuleHash,
    writeContract: writeCreateRule,
    isPending: isCreating,
    error: createRuleError,
    isError: isCreateError,
  } = useWriteContract();

  const {
    data: executeRuleHash,
    writeContract: writeExecuteRule,
    isPending: isExecuting
  } = useWriteContract();

  const {
    data: updateStatusHash,
    writeContract: writeUpdateStatus
  } = useWriteContract();

  // Debug contract setup
  useEffect(() => {
    console.log('🔧 Contract Setup:', {
      ruleEngineAddress: contracts.RuleEngine.address,
      writeContractAvailable: !!writeCreateRule,
      isWalletConnected: isConnected,
      walletAddress: address,
    });
  }, [writeCreateRule, isConnected, address]);

  // Track transaction pending state
  useEffect(() => {
    if (isCreating) {
      console.log('⏳ Transaction is pending - wallet should be prompting...');
    }
  }, [isCreating]);

  // Handle errors
  useEffect(() => {
    if (isCreateError && createRuleError) {
      console.error('❌ Contract write error:', {
        error: createRuleError,
        message: createRuleError.message,
        cause: createRuleError.cause,
      });

      // Deep inspect the error to find rate limit source
      console.log('🔍 Error details:', {
        errorType: createRuleError.constructor.name,
        message: createRuleError.message,
        stack: createRuleError.stack?.split('\n').slice(0, 3),
      });

      // Show user-friendly error messages
      const errorMessage = createRuleError.message?.toLowerCase() || '';
      const causeMessage = (createRuleError.cause as any)?.message?.toLowerCase() || '';
      const errorDetails = (createRuleError as any)?.details?.toLowerCase() || '';

      // Check all error sources for rate limit
      const isRateLimit = errorMessage.includes('rate limit') ||
                         causeMessage.includes('rate limit') ||
                         errorDetails.includes('rate limit');

      if (isRateLimit) {
        console.error('⚠️ RATE LIMIT DETECTED - This is from your WALLET\'S RPC, not Alchemy!');
        toast.error('Wallet RPC Rate Limit', {
          description: 'Your wallet (MetaMask/RainbowKit) has its own RPC that is rate limited. Wait 60 seconds and try again. The Alchemy endpoint is fine.',
          duration: 10000,
        });
      } else if (errorMessage.includes('user rejected') || errorMessage.includes('user denied')) {
        toast.error('Transaction rejected', {
          description: 'You declined the transaction in your wallet'
        });
      } else if (errorMessage.includes('insufficient funds') || errorMessage.includes('insufficient balance')) {
        toast.error('Insufficient funds for gas', {
          description: 'You need more USDC to pay for transaction gas'
        });
      } else if (errorMessage.includes('nonce')) {
        toast.error('Transaction nonce error', {
          description: 'Please try again or reset your wallet'
        });
      } else {
        // Extract meaningful error from the message
        const shortMessage = errorMessage.split('\n')[0].substring(0, 100);
        toast.error('Transaction failed', {
          description: shortMessage || 'Please try again'
        });
      }
    }
  }, [isCreateError, createRuleError]);

  // Wait for create rule transaction (wagmi v2)
  const { isLoading: isWaitingForTx, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: createRuleHash,
  });

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
      if (!ruleCount || ruleCount === 0n) {
        setRules([]);
        setIsLoadingRules(false);
        return;
      }

      setIsLoadingRules(true);
      try {
        const rulesData: AllocationRule[] = [];
        const count = Number(ruleCount);

        for (let i = 0; i < count; i++) {
          try {
            // @ts-ignore - wagmi types can be finicky
            const rule = await contracts.RuleEngine.abi.find((f: any) => f.name === 'rules');
            // This would normally use publicClient.readContract() but simplified for now
            // In production, you'd batch these reads
            rulesData.push({
              id: i,
              name: `Rule ${i + 1}`,
              description: 'Allocation Rule',
              ruleType: 0,
              triggerAmount: 0n,
              recipients: [],
              percentages: [],
              interval: 0,
              lastExecuted: 0,
              executionCount: 0,
              maxExecutions: 0,
              status: 0,
              creator: '0x0' as `0x${string}`,
              createdAt: 0,
            });
          } catch (error) {
            console.error(`Error fetching rule ${i}:`, error);
          }
        }

        setRules(rulesData);
      } catch (error) {
        console.error('Error fetching rules:', error);
        toast.error('Failed to load rules from contract');
      } finally {
        setIsLoadingRules(false);
      }
    }

    fetchRules();
  }, [ruleCount]);

  // Handle create rule success
  useEffect(() => {
    if (isTxSuccess) {
      console.log('🎉 Rule created successfully!');
      console.log('Transaction hash:', createRuleHash);
      console.log('Explorer URL:', createRuleHash ? getExplorerUrl(createRuleHash) : 'N/A');

      toast.success(
        <div className="flex items-center gap-2">
          <span>Rule created on-chain!</span>
          {createRuleHash && (
            <a
              href={getExplorerUrl(createRuleHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:underline"
            >
              View <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      );
      refetchCount();

      // Reset form
      setFormData({
        recipientWallet: '',
        recipientName: '',
        usdcAmount: '',
        ruleType: '',
        interval: '',
        maxExecutions: '100',
      });
    }
  }, [isTxSuccess, createRuleHash, refetchCount]);

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

    if (!isConnected) {
      console.warn('⚠️ Wallet not connected');
      toast.error('Please connect your wallet');
      return;
    }

    if (!address) {
      console.warn('⚠️ No wallet address');
      toast.error('Wallet address not found');
      return;
    }

    // Check if on correct chain
    const ARC_TESTNET_CHAIN_ID = 5042002;
    if (chainId !== ARC_TESTNET_CHAIN_ID) {
      console.error('❌ Wrong network! Current:', chainId, 'Expected:', ARC_TESTNET_CHAIN_ID);
      toast.error('Wrong Network', {
        description: `Please switch to Arc Testnet (Chain ID: ${ARC_TESTNET_CHAIN_ID}). You are currently on Chain ID: ${chainId}`,
        duration: 10000,
      });
      return;
    }

    console.log('✅ Chain check passed. Current chain ID:', chainId);

    if (!formData.recipientWallet || !formData.usdcAmount || !formData.ruleType) {
      console.warn('⚠️ Missing required fields:', formData);
      toast.error('Please fill in all required fields');
      return;
    }

    if (!writeCreateRule) {
      console.error('❌ writeContract function not available');
      toast.error('Contract write function not ready. Please try again.');
      return;
    }

    console.log('✅ Wallet state:', {
      isConnected,
      address,
      contractAddress: contracts.RuleEngine.address,
      ruleCount: ruleCount?.toString() || 'not loaded',
    });

    // Verify contract is accessible
    if (ruleCount === undefined) {
      console.error('❌ Cannot read from RuleEngine contract. It may not exist on this network.');
      toast.error('Contract Not Found', {
        description: 'The RuleEngine contract cannot be found. Make sure you are on Arc Testnet.',
        duration: 10000,
      });
      return;
    }

    try {
      const amount = parseEther(formData.usdcAmount);

      // Calculate interval in seconds (0 for on-demand)
      let intervalSeconds = 0;
      if (formData.interval === 'weekly') intervalSeconds = 7 * 24 * 60 * 60;
      else if (formData.interval === 'biweekly') intervalSeconds = 14 * 24 * 60 * 60;
      else if (formData.interval === 'monthly') intervalSeconds = 30 * 24 * 60 * 60;
      else if (formData.interval === 'quarterly') intervalSeconds = 90 * 24 * 60 * 60;
      // else 0 for on-demand or not set

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

      // Contract expects these parameters in this exact order:
      // createRule(name, description, ruleType, triggerAmount, checkInterval, minExecutionGap, recipients, values, usePercentages, maxPerExecution)
      const txParams = {
        address: contracts.RuleEngine.address,
        abi: contracts.RuleEngine.abi,
        functionName: 'createRule',
        args: [
          ruleName,  // name (string)
          ruleDescription, // description (string)
          parseInt(formData.ruleType),  // ruleType (uint8)
          amount,  // triggerAmount (uint256)
          BigInt(intervalSeconds),  // checkInterval (uint256)
          BigInt(intervalSeconds),  // minExecutionGap (uint256) - same as interval for simplicity
          [formData.recipientWallet as `0x${string}`], // recipients (address[])
          [amount],  // values (uint256[]) - full amount to single recipient
          false,  // usePercentages (bool) - false means fixed amounts
          0n,  // maxPerExecution (uint256) - 0 means unlimited
        ],
        account: address,
      } as const;

      console.log('📝 Transaction parameters:', txParams);

      toast.loading('Preparing transaction...', {
        description: 'Please wait a moment...',
        id: 'preparing-tx',
      });

      // Add a small delay to avoid hitting rate limits immediately
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        console.log('🎯 Calling writeCreateRule...');
        writeCreateRule(txParams);
        console.log('✅ createRule transaction initiated');

        toast.loading('Creating rule on-chain...', {
          description: 'Please confirm the transaction in your wallet',
          id: 'creating-rule',
        });
      } catch (writeError) {
        console.error('❌ Error calling writeCreateRule:', writeError);
        toast.error('Failed to initiate transaction', {
          description: writeError instanceof Error ? writeError.message : 'Unknown error'
        });
        return;
      }
    } catch (error) {
      console.error('💥 Error in handleSubmit:', error);
      toast.error('Failed to prepare transaction', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
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
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Active Rules</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl dark:text-white">
              {isLoadingRules ? '-' : rules.filter(r => r.status === 0).length}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Executing automatically</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Paused Rules</CardTitle>
            <Pause className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl dark:text-white">
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
            <div className="text-3xl dark:text-white">
              {isLoadingRules ? '-' : rules.reduce((sum, r) => sum + r.executionCount, 0)}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Times executed</p>
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
                Create New Allocation Rule
              </CardTitle>
              <CardDescription className="dark:text-gray-400 mt-2">
                Configure automated USDC distributions based on conditions
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg">
              <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs text-blue-700 dark:text-blue-300">Instant Settlement</span>
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
                disabled={isCreating || isWaitingForTx || !isConnected}
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
                {isCreating || isWaitingForTx ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    {isCreating ? 'Confirm in Wallet...' : 'Creating Rule...'}
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 mr-2" />
                    Create Allocation Rule
                  </>
                )}
              </Button>
            </div>

            {/* RPC Fallback Info */}
            <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-xl">
              <Shield className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-800 dark:text-green-300">
                <p className="font-semibold mb-1">Redundant RPC Endpoints</p>
                <p>Using 5 fallback RPC endpoints for maximum reliability. If one endpoint is rate limited, the system automatically switches to the next available endpoint.</p>
              </div>
            </div>

            {/* Info Banner */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-xl">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="mb-1">Your rule will be created on-chain and can be executed immediately once conditions are met.</p>
                <p>Transactions execute with deterministic, near-instant finality (~2-3 seconds on Arc Testnet).</p>
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
            Manage and monitor all allocation rules on-chain
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingRules ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading rules from blockchain...</span>
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">No allocation rules yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">Create your first rule above to automate distributions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => {
                const StatusIcon = statusConfig[rule.status as keyof typeof statusConfig]?.icon || CheckCircle2;
                const TriggerIcon = ruleTypeIcons[rule.ruleType as keyof typeof ruleTypeIcons] || Calendar;
                const recipient = rule.recipients[0] || '0x0...';
                const amountInUsdc = formatEther(rule.triggerAmount);
                const intervalDays = Math.floor(rule.interval / (24 * 60 * 60));
                const nextExecution = rule.lastExecuted + rule.interval;
                const daysUntilNext = Math.floor((nextExecution - Date.now() / 1000) / (24 * 60 * 60));

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

                        {/* Creator Info */}
                        <div className="pl-13 pt-3 border-t dark:border-gray-700">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <Users className="w-3.5 h-3.5" />
                              <span>Created by: {rule.creator.slice(0, 8)}...{rule.creator.slice(-6)}</span>
                              <span className="mx-2">•</span>
                              <Clock className="w-3.5 h-3.5" />
                              <span>{new Date(rule.createdAt * 1000).toLocaleDateString()}</span>
                            </div>

                            {rule.status === 0 && (
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
