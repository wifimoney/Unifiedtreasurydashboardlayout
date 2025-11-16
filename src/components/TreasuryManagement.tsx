import { useState, useEffect } from 'react';
import { useAccount, useReadContract, usePublicClient, useWalletClient } from 'wagmi';
import { formatEther, encodeFunctionData, parseGwei } from 'viem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  DollarSign,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  Users,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { contracts, getExplorerUrl, getAddressExplorerUrl } from '../lib/contracts';

interface Transaction {
  to: string;
  amount: bigint;
  data: string;
  executed: boolean;
  cancelled: boolean;
  approvalCount: bigint;
}

export function TreasuryManagement() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient() as any;
  const { data: walletClient } = useWalletClient();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTxs, setIsLoadingTxs] = useState(true);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [executingId, setExecutingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [owners, setOwners] = useState<string[]>([]);
  const [balance, setBalance] = useState<bigint>(0n);

  // Read transaction count
  const { data: txCount, refetch: refetchCount } = useReadContract({
    ...contracts.TreasuryCore,
    functionName: 'getTransactionCount',
  });

  // Fetch treasury data
  useEffect(() => {
    async function fetchTreasuryData() {
      if (!publicClient) return;

      setIsLoadingTxs(true);

      try {
        // Get owners
        const ownersList = await publicClient.readContract({
          address: contracts.TreasuryCore.address,
          abi: contracts.TreasuryCore.abi,
          functionName: 'getOwners',
        });
        setOwners(ownersList);

        // Get balance
        const treasuryBalance = await publicClient.readContract({
          address: contracts.TreasuryCore.address,
          abi: contracts.TreasuryCore.abi,
          functionName: 'getBalance',
        });
        setBalance(treasuryBalance);

        // Fetch transactions
        if (!txCount || txCount === 0n) {
          setTransactions([]);
          setIsLoadingTxs(false);
          return;
        }

        const txsData: Transaction[] = [];
        const count = Number(txCount);

        for (let i = 0; i < count; i++) {
          try {
            const tx = await publicClient.readContract({
              address: contracts.TreasuryCore.address,
              abi: contracts.TreasuryCore.abi,
              functionName: 'getTransaction',
              args: [BigInt(i)],
            }) as any;

            // Parse: [to, amount, data, executed, cancelled, approvalCount]
            const [to, amount, data, executed, cancelled, approvalCount] = tx;

            txsData.push({
              to,
              amount,
              data,
              executed,
              cancelled,
              approvalCount,
            });
          } catch (error) {
            console.error(`Error fetching transaction ${i}:`, error);
          }
        }

        console.log(`✅ Loaded ${txsData.length} transactions`);
        setTransactions(txsData);
      } catch (error) {
        console.error('❌ Error fetching treasury data:', error);
      } finally {
        setIsLoadingTxs(false);
      }
    }

    fetchTreasuryData();
  }, [txCount, publicClient]);

  const handleApprove = async (txId: number) => {
    if (!publicClient || !walletClient) {
      toast.error('Wallet client not ready');
      return;
    }

    setApprovingId(txId);
    const toastId = toast.loading('Approving transaction...');

    try {
      const data = encodeFunctionData({
        abi: contracts.TreasuryCore.abi,
        functionName: 'approveTransaction',
        args: [BigInt(txId)],
      });

      const gasEstimate = await publicClient.estimateGas({
        account: address,
        to: contracts.TreasuryCore.address,
        data,
      });

      const gasPrice = await publicClient.getGasPrice();
      const maxFeePerGas = (gasPrice * 120n) / 100n;
      const maxPriorityFeePerGas = parseGwei('2');

      const hash = await walletClient.sendTransaction({
        account: address,
        to: contracts.TreasuryCore.address,
        data,
        gas: gasEstimate,
        maxFeePerGas,
        maxPriorityFeePerGas,
        chain: walletClient.chain,
      });

      toast.loading('Waiting for confirmation...', { id: toastId });

      const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });

      if (receipt.status === 'success') {
        toast.success('Transaction approved!', { id: toastId });
        await refetchCount();
      } else {
        toast.error('Approval failed', { id: toastId });
      }
    } catch (error: any) {
      console.error('❌ Error approving:', error);
      toast.error('Failed to approve transaction', { id: toastId });
    } finally {
      setApprovingId(null);
    }
  };

  const handleCancel = async (txId: number) => {
    if (!confirm('Are you sure you want to cancel this transaction?')) {
      return;
    }

    if (!publicClient || !walletClient) {
      toast.error('Wallet client not ready');
      return;
    }

    setCancellingId(txId);
    const toastId = toast.loading('Cancelling transaction...');

    try {
      const data = encodeFunctionData({
        abi: contracts.TreasuryCore.abi,
        functionName: 'cancelTransaction',
        args: [BigInt(txId)],
      });

      const gasEstimate = await publicClient.estimateGas({
        account: address,
        to: contracts.TreasuryCore.address,
        data,
      });

      const gasPrice = await publicClient.getGasPrice();
      const maxFeePerGas = (gasPrice * 120n) / 100n;
      const maxPriorityFeePerGas = parseGwei('2');

      const hash = await walletClient.sendTransaction({
        account: address,
        to: contracts.TreasuryCore.address,
        data,
        gas: gasEstimate,
        maxFeePerGas,
        maxPriorityFeePerGas,
        chain: walletClient.chain,
      });

      toast.loading('Waiting for confirmation...', { id: toastId });

      const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });

      if (receipt.status === 'success') {
        toast.success('Transaction cancelled!', { id: toastId });
        await refetchCount();
      } else {
        toast.error('Cancel failed', { id: toastId });
      }
    } catch (error: any) {
      console.error('❌ Error cancelling:', error);
      toast.error('Failed to cancel transaction', { id: toastId });
    } finally {
      setCancellingId(null);
    }
  };

  const handleExecute = async (txId: number) => {
    if (!publicClient || !walletClient) {
      toast.error('Wallet client not ready');
      return;
    }

    setExecutingId(txId);
    const toastId = toast.loading('Executing transaction...');

    try {
      const data = encodeFunctionData({
        abi: contracts.TreasuryCore.abi,
        functionName: 'executeTransaction',
        args: [BigInt(txId)],
      });

      const gasEstimate = await publicClient.estimateGas({
        account: address,
        to: contracts.TreasuryCore.address,
        data,
      });

      const gasPrice = await publicClient.getGasPrice();
      const maxFeePerGas = (gasPrice * 120n) / 100n;
      const maxPriorityFeePerGas = parseGwei('2');

      const hash = await walletClient.sendTransaction({
        account: address,
        to: contracts.TreasuryCore.address,
        data,
        gas: gasEstimate,
        maxFeePerGas,
        maxPriorityFeePerGas,
        chain: walletClient.chain,
      });

      toast.loading('Waiting for confirmation...', { id: toastId });

      const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });

      if (receipt.status === 'success') {
        toast.success('Transaction executed successfully!', {
          id: toastId,
          description: (
            <a
              href={getExplorerUrl(hash)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:underline"
            >
              View Transaction <ExternalLink className="w-3 h-3" />
            </a>
          ),
        });
        await refetchCount();
      } else {
        toast.error('Execution failed', { id: toastId });
      }
    } catch (error: any) {
      console.error('❌ Error executing:', error);
      toast.error('Failed to execute transaction', { id: toastId });
    } finally {
      setExecutingId(null);
    }
  };

  const balanceNum = parseFloat(formatEther(balance));
  const pendingTxs = transactions.filter(tx => !tx.executed && !tx.cancelled);
  const executedTxs = transactions.filter(tx => tx.executed);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold dark:text-white mb-1">Treasury Vault</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Multisig treasury with transaction approval queue
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetchCount()}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Treasury Info */}
      <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg dark:text-white">Multisig Vault</CardTitle>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {balanceNum.toFixed(4)} USDC
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Current Balance</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Contract Address</div>
              <div className="text-sm font-mono dark:text-white">
                {contracts.TreasuryCore.address}
              </div>
            </div>
            <a
              href={getAddressExplorerUrl(contracts.TreasuryCore.address, 'arc')}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Authorized Signers ({owners.length}):
            </div>
            <div className="space-y-2">
              {owners.map((owner, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-mono dark:text-white">{owner}</span>
                  </div>
                  {owner.toLowerCase() === address?.toLowerCase() && (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400">
                      You
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Transactions - Approval Queue */}
      <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl dark:text-white">Approval Queue</CardTitle>
              <CardDescription className="dark:text-gray-400">
                {pendingTxs.length} transaction(s) awaiting signatures
              </CardDescription>
            </div>
            {pendingTxs.length > 0 && (
              <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-400">
                {pendingTxs.length} Pending
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pendingTxs.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                <CheckCircle2 className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">All clear!</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                No transactions pending approval
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingTxs.map((tx, idx) => {
                const amountNum = parseFloat(formatEther(tx.amount));
                const approvals = Number(tx.approvalCount);
                const requiredApprovals = Math.ceil(owners.length / 2); // Assuming majority required

                return (
                  <div
                    key={idx}
                    className="p-4 border dark:border-gray-700 rounded-lg hover:shadow-md dark:hover:bg-gray-700/30 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium dark:text-white">Transaction #{idx}</span>
                          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-400">
                            Pending
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">To:</span>
                            <span className="font-mono dark:text-white">{tx.to.slice(0, 10)}...{tx.to.slice(-8)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">Amount:</span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                              {amountNum.toLocaleString()} USDC
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 dark:text-gray-400">Approvals:</span>
                            <span className="font-medium dark:text-white">
                              {approvals} of {requiredApprovals} required
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(idx)}
                          disabled={approvingId === idx}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {approvingId === idx ? (
                            <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                          )}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleExecute(idx)}
                          disabled={executingId === idx || approvals < requiredApprovals}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {executingId === idx ? (
                            <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <DollarSign className="w-4 h-4 mr-1" />
                          )}
                          Execute
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancel(idx)}
                          disabled={cancellingId === idx}
                          className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-900"
                        >
                          {cancellingId === idx ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Executed Transactions */}
      <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl dark:text-white">Transaction History</CardTitle>
              <CardDescription className="dark:text-gray-400">
                Completed treasury transactions
              </CardDescription>
            </div>
            {executedTxs.length > 0 && (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400">
                {executedTxs.length} Completed
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {executedTxs.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                <Clock className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No history yet</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                Executed transactions will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {executedTxs.slice(0, 10).map((tx, txIdx) => {
                const amountNum = parseFloat(formatEther(tx.amount));
                const approvals = Number(tx.approvalCount);

                return (
                  <div
                    key={txIdx}
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium dark:text-white mb-1">Transfer to</div>
                        <div className="text-sm font-mono text-gray-600 dark:text-gray-400">
                          {tx.to.slice(0, 10)}...{tx.to.slice(-8)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600 dark:text-green-400 text-lg">
                        {amountNum.toLocaleString()} USDC
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {approvals} signature(s)
                      </div>
                    </div>
                  </div>
                );
              })}
              {executedTxs.length > 10 && (
                <div className="text-center pt-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Showing 10 of {executedTxs.length} transactions
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

