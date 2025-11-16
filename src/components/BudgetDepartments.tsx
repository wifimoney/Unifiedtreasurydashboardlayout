import { useState, useEffect } from 'react';
import { useAccount, useReadContract, usePublicClient, useWalletClient } from 'wagmi';
import { parseEther, formatEther, encodeFunctionData, parseGwei } from 'viem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Plus,
  Building2,
  DollarSign,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Trash2,
  PlusCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { contracts, getExplorerUrl } from '../lib/contracts';

interface Department {
  id: number;
  name: string;
  budget: bigint;
  spent: bigint;
  manager: string;
  active: boolean;
}

export function BudgetDepartments() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient() as any;
  const { data: walletClient } = useWalletClient();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoadingDepts, setIsLoadingDepts] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [allocatingId, setAllocatingId] = useState<number | null>(null);
  const [allocateAmount, setAllocateAmount] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    budget: '',
    manager: '',
  });

  // Read department count from contract
  const { data: deptCount, refetch: refetchCount } = useReadContract({
    ...contracts.BudgetAllocator,
    functionName: 'departmentCount',
  });

  // Fetch all departments
  useEffect(() => {
    async function fetchDepartments() {
      if (!publicClient || !deptCount || deptCount === 0n) {
        setDepartments([]);
        setIsLoadingDepts(false);
        return;
      }

      setIsLoadingDepts(true);
      console.log(`🏢 Fetching ${deptCount} departments...`);

      try {
        const deptsData: Department[] = [];
        const count = Number(deptCount);

        for (let i = 0; i < count; i++) {
          try {
            // Fetch department data - returns array
            const deptData = await publicClient.readContract({
              address: contracts.BudgetAllocator.address,
              abi: contracts.BudgetAllocator.abi,
              functionName: 'departments',
              args: [BigInt(i)],
            }) as any;

            // Parse array: [id, name, totalBudget, spentAmount, availableBalance, manager, active, createdAt]
            const [id, name, totalBudget, spentAmount, availableBalance, manager, active, createdAt] = deptData;

            console.log(`✅ Department ${i}:`, {
              id: Number(id),
              name,
              manager,
              active
            });

            deptsData.push({
              id: Number(id),
              name: name || `Department ${i}`,
              budget: totalBudget,
              spent: spentAmount || 0n,
              manager: manager,
              active: active,
            });
          } catch (error) {
            console.error(`❌ Error fetching department ${i}:`, error);
          }
        }

        console.log(`✅ Loaded ${deptsData.length} departments`);
        setDepartments(deptsData);
      } catch (error) {
        console.error('❌ Error fetching departments:', error);
        toast.error('Failed to load departments');
      } finally {
        setIsLoadingDepts(false);
      }
    }

    fetchDepartments();
  }, [deptCount, publicClient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !address) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!formData.name || !formData.budget) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!publicClient || !walletClient) {
      toast.error('Wallet client not ready');
      return;
    }

    setIsCreating(true);
    const toastId = toast.loading('Creating department...');

    try {
      const budgetAmount = parseEther(formData.budget);
      const managerAddress = (formData.manager || address) as `0x${string}`;

      console.log('Creating department:', {
        name: formData.name,
        budget: budgetAmount.toString(),
        manager: managerAddress,
      });

      // Encode the function call
      const data = encodeFunctionData({
        abi: contracts.BudgetAllocator.abi,
        functionName: 'createDepartment',
        args: [formData.name, budgetAmount, managerAddress],
      });

      // Estimate gas
      const gasEstimate = await publicClient.estimateGas({
        account: address,
        to: contracts.BudgetAllocator.address,
        data,
      });

      const gasPrice = await publicClient.getGasPrice();
      const maxFeePerGas = (gasPrice * 120n) / 100n;
      const maxPriorityFeePerGas = parseGwei('2');

      toast.loading('Confirm transaction in wallet...', { id: toastId });

      // Send transaction
      const hash = await walletClient.sendTransaction({
        account: address,
        to: contracts.BudgetAllocator.address,
        data,
        gas: gasEstimate,
        maxFeePerGas,
        maxPriorityFeePerGas,
        chain: walletClient.chain,
      });

      console.log('✅ Transaction sent:', hash);

      toast.loading('Waiting for confirmation...', {
        id: toastId,
        description: `TX: ${hash.slice(0, 10)}...${hash.slice(-8)}`,
      });

      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      console.log('✅ Transaction confirmed:', receipt);

      if (receipt.status === 'success') {
        toast.success('Department created successfully!', {
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

        // Reset form
        setFormData({ name: '', budget: '', manager: '' });

        // Refetch departments
        await refetchCount();
      } else {
        toast.error('Transaction failed', { id: toastId });
      }
    } catch (error: any) {
      console.error('❌ Error creating department:', error);

      let errorMessage = 'Failed to create department';
      let errorDescription = error?.message || 'Unknown error';

      if (error?.message?.includes('User rejected')) {
        errorMessage = 'Transaction cancelled';
        errorDescription = 'You rejected the transaction';
      } else if (error?.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds';
        errorDescription = 'Not enough balance to cover gas fees';
      }

      toast.error(errorMessage, {
        id: toastId,
        description: errorDescription,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleAllocateFunds = async (deptId: number) => {
    if (!allocateAmount || parseFloat(allocateAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!publicClient || !walletClient) {
      toast.error('Wallet client not ready');
      return;
    }

    const toastId = toast.loading('Allocating funds...');

    try {
      const amount = parseEther(allocateAmount);

      const data = encodeFunctionData({
        abi: contracts.BudgetAllocator.abi,
        functionName: 'allocateFunds',
        args: [BigInt(deptId), amount],
      });

      const gasEstimate = await publicClient.estimateGas({
        account: address,
        to: contracts.BudgetAllocator.address,
        data,
      });

      const gasPrice = await publicClient.getGasPrice();
      const maxFeePerGas = (gasPrice * 120n) / 100n;
      const maxPriorityFeePerGas = parseGwei('2');

      toast.loading('Confirm transaction...', { id: toastId });

      const hash = await walletClient.sendTransaction({
        account: address,
        to: contracts.BudgetAllocator.address,
        data,
        gas: gasEstimate,
        maxFeePerGas,
        maxPriorityFeePerGas,
        chain: walletClient.chain,
      });

      toast.loading('Waiting for confirmation...', { id: toastId });

      const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });

      if (receipt.status === 'success') {
        toast.success('Funds allocated successfully!', { id: toastId });
        setAllocateAmount('');
        setAllocatingId(null);
        await refetchCount();
      } else {
        toast.error('Transaction failed', { id: toastId });
      }
    } catch (error: any) {
      console.error('❌ Error allocating funds:', error);

      let errorMessage = 'Failed to allocate funds';
      if (error?.message?.includes('User rejected')) {
        errorMessage = 'Transaction cancelled';
      }

      toast.error(errorMessage, { id: toastId });
    }
  };

  const handleDeactivate = async (deptId: number) => {
    if (!confirm('Are you sure you want to deactivate this department?')) {
      return;
    }

    if (!publicClient || !walletClient) {
      toast.error('Wallet client not ready');
      return;
    }

    setDeletingId(deptId);
    const toastId = toast.loading('Deactivating department...');

    try {
      const data = encodeFunctionData({
        abi: contracts.BudgetAllocator.abi,
        functionName: 'deactivateDepartment',
        args: [BigInt(deptId)],
      });

      const gasEstimate = await publicClient.estimateGas({
        account: address,
        to: contracts.BudgetAllocator.address,
        data,
      });

      const gasPrice = await publicClient.getGasPrice();
      const maxFeePerGas = (gasPrice * 120n) / 100n;
      const maxPriorityFeePerGas = parseGwei('2');

      const hash = await walletClient.sendTransaction({
        account: address,
        to: contracts.BudgetAllocator.address,
        data,
        gas: gasEstimate,
        maxFeePerGas,
        maxPriorityFeePerGas,
        chain: walletClient.chain,
      });

      toast.loading('Waiting for confirmation...', { id: toastId });

      const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });

      if (receipt.status === 'success') {
        toast.success('Department deactivated!', { id: toastId });
        await refetchCount();
      } else {
        toast.error('Transaction failed', { id: toastId });
      }
    } catch (error: any) {
      console.error('❌ Error deactivating department:', error);
      toast.error('Failed to deactivate department', { id: toastId });
    } finally {
      setDeletingId(null);
    }
  };

  const activeDepts = departments.filter(d => d.active).length;
  const totalBudget = departments.reduce((sum, d) => sum + d.budget, 0n);
  const totalSpent = departments.reduce((sum, d) => sum + d.spent, 0n);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold dark:text-white mb-1">Department Budgets</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Manage department budgets and track spending
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Active Departments</CardTitle>
            <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold dark:text-white">
              {isLoadingDepts ? '-' : activeDepts}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Currently active</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Total Budget</CardTitle>
            <DollarSign className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold dark:text-white">
              {isLoadingDepts ? '-' : parseFloat(formatEther(totalBudget)).toFixed(0)}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">USDC allocated</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Total Spent</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold dark:text-white">
              {isLoadingDepts ? '-' : parseFloat(formatEther(totalSpent)).toFixed(0)}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">USDC used</p>
          </CardContent>
        </Card>
      </div>

      {/* Create Department Form */}
      <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl dark:text-white flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
              <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            Create New Department
          </CardTitle>
          <CardDescription className="dark:text-gray-400">
            Set up a department with budget allocation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="deptName" className="dark:text-gray-200">
                    Department Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="deptName"
                    placeholder="e.g., Engineering, Marketing"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="mt-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="budget" className="dark:text-gray-200">
                    Budget Allocation <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="budget"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      required
                      className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    USDC budget for this department
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="manager" className="dark:text-gray-200">
                    Manager Address <span className="text-gray-400">(Optional)</span>
                  </Label>
                  <Input
                    id="manager"
                    placeholder="0x... (defaults to you)"
                    value={formData.manager}
                    onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                    className="mt-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Department manager wallet address
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                type="submit"
                size="lg"
                className="flex-1"
                disabled={isCreating || !isConnected}
              >
                {isCreating ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    Creating Department...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 mr-2" />
                    Create Department
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-xl">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p>The department will be created on-chain with the specified budget allocation.</p>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Active Departments */}
      <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl dark:text-white">Active Departments</CardTitle>
              <CardDescription className="dark:text-gray-400">
                Currently active department budgets
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchCount()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingDepts ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading departments...</span>
            </div>
          ) : departments.filter(d => d.active).length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                <Building2 className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No active departments</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                Create your first department above to start managing budgets
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {departments.filter(d => d.active).map((dept) => {
                const budgetNum = parseFloat(formatEther(dept.budget));
                const spentNum = parseFloat(formatEther(dept.spent));
                const remaining = budgetNum - spentNum;

                return (
                  <div
                    key={dept.id}
                    className="p-4 border dark:border-gray-700 rounded-lg hover:shadow-md dark:hover:bg-gray-700/30 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      {/* Left: Department Info */}
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold dark:text-white">{dept.name}</h4>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                            {dept.manager.slice(0, 8)}...{dept.manager.slice(-6)}
                          </div>
                        </div>
                      </div>

                      {/* Right: Budget Numbers */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Remaining
                          </div>
                          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                            {remaining.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            of {budgetNum.toLocaleString()} USDC
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setAllocatingId(allocatingId === dept.id ? null : dept.id)}
                            className="text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-900"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDeactivate(dept.id)}
                            disabled={deletingId === dept.id}
                            className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            {deletingId === dept.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Allocate Funds Form */}
                    {allocatingId === dept.id && (
                      <div className="pt-3 border-t dark:border-gray-700">
                        <div className="flex items-end gap-3">
                          <div className="flex-1">
                            <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5">
                              Allocate Additional Funds
                            </Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Amount in USDC"
                              value={allocateAmount}
                              onChange={(e) => setAllocateAmount(e.target.value)}
                              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAllocateFunds(dept.id)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <DollarSign className="w-4 h-4 mr-1" />
                            Allocate
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setAllocatingId(null);
                              setAllocateAmount('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inactive Departments */}
      {departments.filter(d => !d.active).length > 0 && (
        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl dark:text-white">Inactive Departments</CardTitle>
            <CardDescription className="dark:text-gray-400">
              Deactivated departments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {departments.filter(d => !d.active).map((dept) => {
                const budgetNum = parseFloat(formatEther(dept.budget));
                const spentNum = parseFloat(formatEther(dept.spent));
                const remaining = budgetNum - spentNum;

                return (
                  <div
                    key={dept.id}
                    className="p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/30 opacity-60"
                  >
                    <div className="flex items-center justify-between">
                      {/* Left: Department Info */}
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold dark:text-white">{dept.name}</h4>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                            {dept.manager.slice(0, 8)}...{dept.manager.slice(-6)}
                          </div>
                        </div>
                      </div>

                      {/* Right: Budget Numbers */}
                      <div className="text-right">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Remaining
                        </div>
                        <div className="text-3xl font-bold text-gray-400">
                          {remaining.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          of {budgetNum.toLocaleString()} USDC
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

