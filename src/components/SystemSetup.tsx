import { useState, useEffect } from 'react';
import { useAccount, usePublicClient, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Settings,
  Shield,
  Zap,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { contracts, getExplorerUrl, getAddressExplorerUrl } from '../lib/contracts';
import { formatEther } from 'viem';

interface ContractStatus {
  name: string;
  address: string;
  icon: string;
  deployed: boolean;
  hasPermission: boolean;
  configured: boolean;
  loading: boolean;
}

export function SystemSetup() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient() as any;
  const { writeContract } = useWriteContract();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConfiguringAll, setIsConfiguringAll] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, ContractStatus>>({
    treasuryCore: {
      name: 'TreasuryCore',
      address: contracts.TreasuryCore.address,
      icon: '💰',
      deployed: true,
      hasPermission: true, // TreasuryCore doesn't need permission to itself
      configured: true,
      loading: false,
    },
    ruleEngine: {
      name: 'RuleEngine',
      address: contracts.RuleEngine.address,
      icon: '🤖',
      deployed: true,
      hasPermission: false,
      configured: true,
      loading: false,
    },
    payrollManager: {
      name: 'PayrollManager',
      address: contracts.PayrollManager.address,
      icon: '👥',
      deployed: true,
      hasPermission: false,
      configured: true,
      loading: false,
    },
    budgetAllocator: {
      name: 'BudgetAllocator',
      address: contracts.BudgetAllocator.address,
      icon: '🏢',
      deployed: true,
      hasPermission: false,
      configured: true,
      loading: false,
    },
    scheduledPayments: {
      name: 'ScheduledPayments',
      address: contracts.ScheduledPayments.address,
      icon: '📅',
      deployed: true,
      hasPermission: false,
      configured: true,
      loading: false,
    },
    treasuryAggregator: {
      name: 'TreasuryAggregator',
      address: contracts.TreasuryAggregator.address,
      icon: '📊',
      deployed: true,
      hasPermission: true, // Doesn't need permission, just reads
      configured: false,
      loading: false,
    },
  });

  const [treasuryBalance, setTreasuryBalance] = useState<bigint>(0n);

  // Check system status
  useEffect(() => {
    checkSystemStatus();
  }, [publicClient, isConnected]);

  const checkSystemStatus = async () => {
    if (!publicClient || !isConnected) return;

    setIsRefreshing(true);
    console.log('🔍 Checking system status...');

    try {
      // Get treasury balance
      const balance = await publicClient.readContract({
        address: contracts.TreasuryCore.address,
        abi: contracts.TreasuryCore.abi,
        functionName: 'getBalance',
      });
      setTreasuryBalance(balance);

      // Check TreasuryAggregator configuration
      const aggregatorTreasuryCore = await publicClient.readContract({
        address: contracts.TreasuryAggregator.address,
        abi: contracts.TreasuryAggregator.abi,
        functionName: 'treasuryCore',
      });

      const isAggregatorConfigured = aggregatorTreasuryCore !== '0x0000000000000000000000000000000000000000';

      // Note: TreasuryCore in this implementation uses a simple multisig
      // and doesn't have role-based access control like hasRole()
      // So we'll mark permissions as "uncertain" for now
      // In a production system, you'd add hasRole checks

      setStatuses(prev => ({
        ...prev,
        treasuryAggregator: {
          ...prev.treasuryAggregator,
          configured: isAggregatorConfigured,
        },
      }));

      console.log('✅ System status checked');
    } catch (error) {
      console.error('❌ Error checking status:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const configureTreasuryAggregator = async () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet');
      return;
    }

    setStatuses(prev => ({
      ...prev,
      treasuryAggregator: { ...prev.treasuryAggregator, loading: true },
    }));

    const toastId = toast.loading('Configuring TreasuryAggregator...');

    try {
      // Set TreasuryCore address
      console.log('Setting TreasuryCore address...');
      writeContract(
        {
          address: contracts.TreasuryAggregator.address,
          abi: contracts.TreasuryAggregator.abi,
          functionName: 'setTreasuryCore',
          args: [contracts.TreasuryCore.address],
        },
        {
          onSuccess: async (hash) => {
            toast.loading('Transaction submitted...', { id: toastId });
            console.log('TX:', hash);

            // Wait for confirmation
            await publicClient.waitForTransactionReceipt({ hash });

            // Set PayrollManager
            writeContract(
              {
                address: contracts.TreasuryAggregator.address,
                abi: contracts.TreasuryAggregator.abi,
                functionName: 'setPayrollManager',
                args: [contracts.PayrollManager.address],
              },
              {
                onSuccess: async (hash2) => {
                  await publicClient.waitForTransactionReceipt({ hash: hash2 });

                  // Set BudgetAllocator
                  writeContract(
                    {
                      address: contracts.TreasuryAggregator.address,
                      abi: contracts.TreasuryAggregator.abi,
                      functionName: 'setBudgetAllocator',
                      args: [contracts.BudgetAllocator.address],
                    },
                    {
                      onSuccess: async (hash3) => {
                        await publicClient.waitForTransactionReceipt({ hash: hash3 });

                        // Set ScheduledPayments
                        writeContract(
                          {
                            address: contracts.TreasuryAggregator.address,
                            abi: contracts.TreasuryAggregator.abi,
                            functionName: 'setScheduledPayments',
                            args: [contracts.ScheduledPayments.address],
                          },
                          {
                            onSuccess: async (hash4) => {
                              await publicClient.waitForTransactionReceipt({ hash: hash4 });

                              toast.success('TreasuryAggregator configured!', { id: toastId });
                              checkSystemStatus();
                            },
                            onError: (error) => {
                              console.error('Error setting ScheduledPayments:', error);
                              toast.error('Failed to set ScheduledPayments', { id: toastId });
                            },
                          }
                        );
                      },
                      onError: (error) => {
                        console.error('Error setting BudgetAllocator:', error);
                        toast.error('Failed to set BudgetAllocator', { id: toastId });
                      },
                    }
                  );
                },
                onError: (error) => {
                  console.error('Error setting PayrollManager:', error);
                  toast.error('Failed to set PayrollManager', { id: toastId });
                },
              }
            );
          },
          onError: (error) => {
            console.error('Error setting TreasuryCore:', error);
            toast.error('Failed to configure TreasuryAggregator', { id: toastId });
            setStatuses(prev => ({
              ...prev,
              treasuryAggregator: { ...prev.treasuryAggregator, loading: false },
            }));
          },
        }
      );
    } catch (error: any) {
      console.error('❌ Configuration error:', error);
      toast.error('Configuration failed', { id: toastId });
      setStatuses(prev => ({
        ...prev,
        treasuryAggregator: { ...prev.treasuryAggregator, loading: false },
      }));
    }
  };

  const getStatusBadge = (status: ContractStatus) => {
    if (status.loading) {
      return (
        <Badge variant="outline" className="gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Configuring...
        </Badge>
      );
    }

    if (status.name === 'TreasuryAggregator') {
      if (status.configured) {
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Configured
          </Badge>
        );
      } else {
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400">
            <XCircle className="w-3 h-3 mr-1" />
            Not Configured
          </Badge>
        );
      }
    }

    // For other contracts, show deployment status
    if (status.deployed) {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Deployed
        </Badge>
      );
    }

    return (
      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400">
        <AlertCircle className="w-3 h-3 mr-1" />
        Unknown
      </Badge>
    );
  };

  const allConfigured = Object.values(statuses).every(
    (s) => s.configured && (s.hasPermission || s.name === 'TreasuryAggregator' || s.name === 'TreasuryCore')
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold dark:text-white mb-2 flex items-center gap-3">
          <Settings className="w-8 h-8" />
          System Setup & Configuration
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configure contract permissions and integrations
        </p>
      </div>

      {/* Status Banner */}
      {allConfigured ? (
        <Card className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              <div>
                <h3 className="font-semibold text-green-900 dark:text-green-100">
                  System Fully Configured!
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  All contracts are deployed and configured. Your treasury system is ready to use.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              <div>
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                  Configuration Required
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Some contracts need to be configured before the system is fully operational.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}


      {/* Contract Status Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(statuses)
          .filter(([key]) => key !== 'treasuryCore')
          .map(([key, status]) => (
            <Card key={key} className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{status.icon}</div>
                      <div>
                        <h3 className="font-semibold dark:text-white">{status.name}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {status.address.slice(0, 10)}...{status.address.slice(-8)}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(status)}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Deployed:</span>
                      <span className="flex items-center gap-1">
                        {status.deployed ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <span className="text-green-600 dark:text-green-400">Yes</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                            <span className="text-red-600 dark:text-red-400">No</span>
                          </>
                        )}
                      </span>
                    </div>

                    {key === 'treasuryAggregator' ? (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Configured:</span>
                        <span className="flex items-center gap-1">
                          {status.configured ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                              <span className="text-green-600 dark:text-green-400">Yes</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                              <span className="text-red-600 dark:text-red-400">No</span>
                            </>
                          )}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {key === 'treasuryAggregator' && !status.configured && (
                    <Button
                      className="w-full"
                      onClick={configureTreasuryAggregator}
                      disabled={status.loading || !isConnected}
                    >
                      {status.loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Configuring...
                        </>
                      ) : (
                        <>
                          <Settings className="w-4 h-4 mr-2" />
                          Configure Now
                        </>
                      )}
                    </Button>
                  )}

                  <a
                    href={getAddressExplorerUrl(status.address, 'arc')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View on Explorer
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Info Card */}
      <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5" />
            About System Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <p>
            <strong className="text-gray-900 dark:text-white">What does this do?</strong>
            <br />
            This page helps you configure the connections between your treasury contracts so they can work together.
          </p>
          <p>
            <strong className="text-gray-900 dark:text-white">TreasuryAggregator Configuration:</strong>
            <br />
            The TreasuryAggregator needs to know the addresses of your other contracts to aggregate data from them.
            Click "Configure Now" to set up these connections.
          </p>
          <p>
            <strong className="text-gray-900 dark:text-white">Note:</strong>
            <br />
            This implementation of TreasuryCore uses a multisig wallet model. In a production environment with
            role-based access control, you would also need to grant execution permissions to contracts here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

