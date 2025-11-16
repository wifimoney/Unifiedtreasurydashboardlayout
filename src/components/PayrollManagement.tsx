import { useState, useEffect } from 'react';
import { useAccount, useReadContract, usePublicClient, useWalletClient } from 'wagmi';
import { parseEther, formatEther, encodeFunctionData, parseGwei, getAddress } from 'viem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Plus,
  Users,
  DollarSign,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Wallet,
  Calendar,
  Edit,
} from 'lucide-react';
import { toast } from 'sonner';
import { useContracts, getExplorerUrl } from '../lib/contracts';

interface Employee {
  wallet: string;
  salary: bigint;
  frequency: number; // 0=WEEKLY, 1=BIWEEKLY, 2=MONTHLY, 3=QUARTERLY
  lastPaymentTime: bigint;
  totalPaid: bigint;
  active: boolean;
  name: string;
  addedAt: bigint;
}

interface PaymentRecord {
  employee: string;
  amount: bigint;
  timestamp: bigint;
  paymentId: bigint;
}

const frequencyLabels = {
  0: 'Weekly',
  1: 'Bi-weekly',
  2: 'Monthly',
  3: 'Quarterly',
};

const frequencyDays = {
  0: 7,
  1: 14,
  2: 30,
  3: 90,
};

export function PayrollManagement() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient() as any;
  const { data: walletClient } = useWalletClient();
  const contracts = useContracts();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [processingAddress, setProcessingAddress] = useState<string | null>(null);
  const [removingAddress, setRemovingAddress] = useState<string | null>(null);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  const [editSalary, setEditSalary] = useState('');
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [departments, setDepartments] = useState<Array<{id: number, name: string}>>([]);
  const [formData, setFormData] = useState({
    name: '',
    wallet: '',
    salary: '',
    frequency: '2', // Default to MONTHLY
    departmentId: '0', // Default to first department
  });

  if (!contracts) {
    return <div className="text-center py-12"><p className="text-gray-600 dark:text-gray-400">No treasury selected</p></div>;
  }

  // Read active employee count
  const { data: employeeCount, refetch: refetchCount } = useReadContract({
    ...contracts.PayrollManager,
    functionName: 'activeEmployees',
  });

  // Fetch departments for the dropdown
  useEffect(() => {
    async function fetchDepartments() {
      if (!publicClient || !contracts) return;

      try {
        const deptCount = await publicClient.readContract({
          address: contracts.BudgetAllocator.address,
          abi: contracts.BudgetAllocator.abi,
          functionName: 'departmentCount',
        });

        const depts = [];
        for (let i = 0; i < Number(deptCount); i++) {
          const dept = await publicClient.readContract({
            address: contracts.BudgetAllocator.address,
            abi: contracts.BudgetAllocator.abi,
            functionName: 'departments',
            args: [BigInt(i)],
          }) as any;

          const [id, name, , , , , active] = dept;
          if (active) {
            depts.push({ id: Number(id), name });
          }
        }
        setDepartments(depts);
      } catch (error) {
        console.error('Error fetching departments:', error);
      }
    }

    fetchDepartments();
  }, [publicClient, contracts]);

  const fetchEmployees = async () => {
    if (!publicClient || !contracts) {
      console.log('⏳ Waiting for publicClient...');
      return;
    }

    setIsLoadingEmployees(true);
    console.log('👥 Fetching employees...');

      try {
        const employeesData: Employee[] = [];

        // Get total employees count first
        const totalEmployees = await publicClient.readContract({
          address: contracts.PayrollManager.address,
          abi: contracts.PayrollManager.abi,
          functionName: 'totalEmployees',
        });

        console.log(`Total employees ever added: ${totalEmployees}`);

        // Fetch from employeeList array
        for (let i = 0; i < Number(totalEmployees); i++) {
          try {
            const employeeAddress = await publicClient.readContract({
              address: contracts.PayrollManager.address,
              abi: contracts.PayrollManager.abi,
              functionName: 'employeeList',
              args: [BigInt(i)],
            });

            // Fetch employee details
            const empData = await publicClient.readContract({
              address: contracts.PayrollManager.address,
              abi: contracts.PayrollManager.abi,
              functionName: 'employees',
              args: [employeeAddress],
            }) as any;

            // Parse array: [wallet, salary, frequency, lastPaymentTime, totalPaid, active, name, addedAt]
            const [wallet, salary, frequency, lastPaymentTime, totalPaid, active, name, addedAt] = empData;

            console.log(`✅ Employee ${i}:`, { wallet, name, active });

            // Only add active employees
            if (active) {
              employeesData.push({
                wallet,
                salary,
                frequency: Number(frequency),
                lastPaymentTime,
                totalPaid,
                active,
                name,
                addedAt,
              });
            }
          } catch (error) {
            console.error(`❌ Error fetching employee ${i}:`, error);
          }
        }

      console.log(`✅ Loaded ${employeesData.length} active employees`);
      setEmployees(employeesData);

      // Fetch payment history
      try {
        const historyData: PaymentRecord[] = [];
        // Try to fetch up to 50 payment records
        for (let i = 0; i < 50; i++) {
          try {
            const record = await publicClient.readContract({
              address: contracts.PayrollManager.address,
              abi: contracts.PayrollManager.abi,
              functionName: 'paymentHistory',
              args: [BigInt(i)],
            }) as any;

            const [employee, amount, timestamp, paymentId] = record;

            historyData.push({
              employee,
              amount,
              timestamp,
              paymentId,
            });
          } catch {
            break; // No more records
          }
        }
        console.log(`✅ Loaded ${historyData.length} payment records`);
        setPaymentHistory(historyData.reverse()); // Most recent first
      } catch (error) {
        console.error('Error fetching payment history:', error);
      }

    } catch (error) {
      console.error('❌ Error fetching employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  // Only fetch on mount, not on every employeeCount change
  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only on mount, refresh via button

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !address) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!formData.name || !formData.wallet || !formData.salary) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!publicClient || !walletClient) {
      toast.error('Wallet client not ready');
      return;
    }

    setIsAdding(true);
    const toastId = toast.loading('Adding employee...');

    try {
      const salaryAmount = parseEther(formData.salary);
      const employeeAddress = getAddress(formData.wallet);

      const data = encodeFunctionData({
        abi: contracts.PayrollManager.abi,
        functionName: 'addEmployee',
        args: [
          employeeAddress,
          formData.name,
          salaryAmount,
          parseInt(formData.frequency),
          parseInt(formData.departmentId) // NEW: Department ID
        ],
      });

      const gasEstimate = await publicClient.estimateGas({
        account: address,
        to: contracts.PayrollManager.address,
        data,
      });

      const gasPrice = await publicClient.getGasPrice();
      const maxFeePerGas = (gasPrice * 120n) / 100n;
      const maxPriorityFeePerGas = parseGwei('2');

      toast.loading('Confirm transaction...', { id: toastId });

      const hash = await walletClient.sendTransaction({
        account: address,
        to: contracts.PayrollManager.address,
        data,
        gas: gasEstimate,
        maxFeePerGas,
        maxPriorityFeePerGas,
        chain: walletClient.chain,
      });

      toast.loading('Waiting for confirmation...', { id: toastId });

      const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });

      if (receipt.status === 'success') {
        toast.success('Employee added successfully!', { id: toastId });
        setFormData({ name: '', wallet: '', salary: '', frequency: '2', departmentId: '0' });
        await refetchCount();
        fetchEmployees(); // Refresh employee list
      } else {
        toast.error('Transaction failed', { id: toastId });
      }
    } catch (error: any) {
      console.error('❌ Error adding employee:', error);

      let errorMessage = 'Failed to add employee';
      if (error?.message?.includes('User rejected')) {
        errorMessage = 'Transaction cancelled';
      } else if (error?.message?.includes('invalid address')) {
        errorMessage = 'Invalid wallet address';
      }

      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsAdding(false);
    }
  };

  const handleProcessPayment = async (employeeWallet: string) => {
    if (!publicClient || !walletClient) {
      toast.error('Wallet client not ready');
      return;
    }

    setProcessingAddress(employeeWallet);
    const toastId = toast.loading('Processing payment...');

    try {
      const data = encodeFunctionData({
        abi: contracts.PayrollManager.abi,
        functionName: 'processPayment',
        args: [employeeWallet as `0x${string}`],
      });

      const gasEstimate = await publicClient.estimateGas({
        account: address,
        to: contracts.PayrollManager.address,
        data,
      });

      const gasPrice = await publicClient.getGasPrice();
      const maxFeePerGas = (gasPrice * 120n) / 100n;
      const maxPriorityFeePerGas = parseGwei('2');

      toast.loading('Confirm transaction...', { id: toastId });

      const hash = await walletClient.sendTransaction({
        account: address,
        to: contracts.PayrollManager.address,
        data,
        gas: gasEstimate,
        maxFeePerGas,
        maxPriorityFeePerGas,
        chain: walletClient.chain,
      });

      toast.loading('Waiting for confirmation...', { id: toastId });

      const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });

      if (receipt.status === 'success') {
        toast.success('Payment processed successfully!', {
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
        fetchEmployees(); // Refresh employee list
      } else {
        toast.error('Payment failed', { id: toastId });
      }
    } catch (error: any) {
      console.error('❌ Error processing payment:', error);
      toast.error('Failed to process payment', { id: toastId });
    } finally {
      setProcessingAddress(null);
    }
  };

  const handleProcessAll = async () => {
    if (!publicClient || !walletClient) {
      toast.error('Wallet client not ready');
      return;
    }

    // Check if any employees are due
    const dueEmployees = employees.filter(emp => {
      const lastPaid = Number(emp.lastPaymentTime);
      const daysSince = lastPaid > 0 ? Math.floor((Date.now() / 1000 - lastPaid) / 86400) : 999;
      return lastPaid === 0 || daysSince >= frequencyDays[emp.frequency as keyof typeof frequencyDays];
    });

    if (dueEmployees.length === 0) {
      toast.info('No employees are due for payment');
      return;
    }

    setIsProcessingAll(true);
    const toastId = toast.loading(`Processing ${dueEmployees.length} payment(s)...`);

    try {
      const data = encodeFunctionData({
        abi: contracts.PayrollManager.abi,
        functionName: 'processAllPayments',
        args: [],
      });

      const gasEstimate = await publicClient.estimateGas({
        account: address,
        to: contracts.PayrollManager.address,
        data,
      });

      const gasPrice = await publicClient.getGasPrice();
      const maxFeePerGas = (gasPrice * 120n) / 100n;
      const maxPriorityFeePerGas = parseGwei('2');

      toast.loading('Confirm transaction...', { id: toastId });

      const hash = await walletClient.sendTransaction({
        account: address,
        to: contracts.PayrollManager.address,
        data,
        gas: gasEstimate,
        maxFeePerGas,
        maxPriorityFeePerGas,
        chain: walletClient.chain,
      });

      toast.loading('Waiting for confirmation...', { id: toastId });

      const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });

      if (receipt.status === 'success') {
        toast.success(`Processed ${dueEmployees.length} payment(s) successfully!`, {
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
        fetchEmployees(); // Refresh employee list
      } else {
        toast.error('Batch payment failed', { id: toastId });
      }
    } catch (error: any) {
      console.error('❌ Error processing all payments:', error);
      toast.error('Failed to process payments', { id: toastId });
    } finally {
      setIsProcessingAll(false);
    }
  };

  const handleUpdateSalary = async (employeeWallet: string) => {
    if (!editSalary || parseFloat(editSalary) <= 0) {
      toast.error('Please enter a valid salary');
      return;
    }

    if (!publicClient || !walletClient) {
      toast.error('Wallet client not ready');
      return;
    }

    const toastId = toast.loading('Updating salary...');

    try {
      const newSalary = parseEther(editSalary);

      const data = encodeFunctionData({
        abi: contracts.PayrollManager.abi,
        functionName: 'updateSalary',
        args: [employeeWallet as `0x${string}`, newSalary],
      });

      const gasEstimate = await publicClient.estimateGas({
        account: address,
        to: contracts.PayrollManager.address,
        data,
      });

      const gasPrice = await publicClient.getGasPrice();
      const maxFeePerGas = (gasPrice * 120n) / 100n;
      const maxPriorityFeePerGas = parseGwei('2');

      toast.loading('Confirm transaction...', { id: toastId });

      const hash = await walletClient.sendTransaction({
        account: address,
        to: contracts.PayrollManager.address,
        data,
        gas: gasEstimate,
        maxFeePerGas,
        maxPriorityFeePerGas,
        chain: walletClient.chain,
      });

      toast.loading('Waiting for confirmation...', { id: toastId });

      const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });

      if (receipt.status === 'success') {
        toast.success('Salary updated successfully!', { id: toastId });
        setEditingAddress(null);
        setEditSalary('');
        await refetchCount();
        fetchEmployees(); // Refresh employee list
      } else {
        toast.error('Transaction failed', { id: toastId });
      }
    } catch (error: any) {
      console.error('❌ Error updating salary:', error);
      toast.error('Failed to update salary', { id: toastId });
    }
  };

  const handleRemoveEmployee = async (employeeWallet: string) => {
    if (!confirm('Are you sure you want to remove this employee?')) {
      return;
    }

    if (!publicClient || !walletClient) {
      toast.error('Wallet client not ready');
      return;
    }

    setRemovingAddress(employeeWallet);
    const toastId = toast.loading('Removing employee...');

    try {
      const data = encodeFunctionData({
        abi: contracts.PayrollManager.abi,
        functionName: 'removeEmployee',
        args: [employeeWallet as `0x${string}`],
      });

      const gasEstimate = await publicClient.estimateGas({
        account: address,
        to: contracts.PayrollManager.address,
        data,
      });

      const gasPrice = await publicClient.getGasPrice();
      const maxFeePerGas = (gasPrice * 120n) / 100n;
      const maxPriorityFeePerGas = parseGwei('2');

      const hash = await walletClient.sendTransaction({
        account: address,
        to: contracts.PayrollManager.address,
        data,
        gas: gasEstimate,
        maxFeePerGas,
        maxPriorityFeePerGas,
        chain: walletClient.chain,
      });

      toast.loading('Waiting for confirmation...', { id: toastId });

      const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });

      if (receipt.status === 'success') {
        toast.success('Employee removed!', { id: toastId });
        await refetchCount();
        fetchEmployees(); // Refresh employee list
      } else {
        toast.error('Transaction failed', { id: toastId });
      }
    } catch (error: any) {
      console.error('❌ Error removing employee:', error);
      toast.error('Failed to remove employee', { id: toastId });
    } finally {
      setRemovingAddress(null);
    }
  };

  const totalMonthlyCost = employees.reduce((sum, emp) => {
    const salaryNum = parseFloat(formatEther(emp.salary));
    // Convert all frequencies to monthly equivalent
    const multiplier = emp.frequency === 0 ? 4.33 : emp.frequency === 1 ? 2.17 : emp.frequency === 2 ? 1 : 0.33;
    return sum + (salaryNum * multiplier);
  }, 0);

  const totalPaid = employees.reduce((sum, emp) => sum + emp.totalPaid, 0n);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold dark:text-white mb-1">Payroll Management</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Manage employees and process salary payments
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Active Employees</CardTitle>
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold dark:text-white">
              {isLoadingEmployees ? '-' : employees.length}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">On payroll</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Monthly Cost</CardTitle>
            <DollarSign className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold dark:text-white">
              {isLoadingEmployees ? '-' : totalMonthlyCost.toFixed(0)}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">USDC per month</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Total Paid</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold dark:text-white">
              {isLoadingEmployees ? '-' : parseFloat(formatEther(totalPaid)).toFixed(0)}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">USDC lifetime</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Employee Form */}
      <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl dark:text-white flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
              <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            Add New Employee
          </CardTitle>
          <CardDescription className="dark:text-gray-400">
            Add employee to payroll system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="empName" className="dark:text-gray-200">
                    Employee Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="empName"
                    placeholder="e.g., John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="mt-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="empWallet" className="dark:text-gray-200">
                    Wallet Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="empWallet"
                    placeholder="0x..."
                    value={formData.wallet}
                    onChange={(e) => setFormData({ ...formData, wallet: e.target.value })}
                    required
                    className="mt-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-sm"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="salary" className="dark:text-gray-200">
                    Salary <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="salary"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    required
                    className="mt-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    USDC per payment period
                  </p>
                </div>

                <div>
                  <Label htmlFor="department" className="dark:text-gray-200">
                    Department <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.departmentId}
                    onValueChange={(value) => setFormData({ ...formData, departmentId: value })}
                  >
                    <SelectTrigger
                      id="department"
                      className="mt-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:border-gray-600">
                      {departments.length === 0 ? (
                        <SelectItem value="none" disabled className="dark:text-gray-500">
                          No departments available - Create one first
                        </SelectItem>
                      ) : (
                        departments.map(dept => (
                          <SelectItem key={dept.id} value={dept.id.toString()} className="dark:text-white dark:hover:bg-gray-700">
                            {dept.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Employees must belong to a department
                  </p>
                </div>

                <div>
                  <Label htmlFor="frequency" className="dark:text-gray-200">
                    Payment Frequency
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
                      <SelectItem value="0" className="dark:text-white dark:hover:bg-gray-700">Weekly</SelectItem>
                      <SelectItem value="1" className="dark:text-white dark:hover:bg-gray-700">Bi-weekly</SelectItem>
                      <SelectItem value="2" className="dark:text-white dark:hover:bg-gray-700">Monthly</SelectItem>
                      <SelectItem value="3" className="dark:text-white dark:hover:bg-gray-700">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                type="submit"
                size="lg"
                className="flex-1"
                disabled={isAdding || !isConnected}
              >
                {isAdding ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    Adding Employee...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 mr-2" />
                    Add Employee
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Active Employees */}
      <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl dark:text-white">Active Employees</CardTitle>
              <CardDescription className="dark:text-gray-400">
                Current payroll roster
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleProcessAll}
                disabled={isProcessingAll}
                className="bg-green-600 hover:bg-green-700"
              >
                {isProcessingAll ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4 mr-1" />
                    Pay All Due
                  </>
                )}
              </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchCount();
                fetchEmployees();
              }}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingEmployees ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading employees...</span>
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No employees yet</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                Add your first employee above to start managing payroll
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {employees.map((emp) => {
                const salaryNum = parseFloat(formatEther(emp.salary));
                const totalPaidNum = parseFloat(formatEther(emp.totalPaid));
                const lastPaid = Number(emp.lastPaymentTime);
                const daysSincePayment = lastPaid > 0 ? Math.floor((Date.now() / 1000 - lastPaid) / 86400) : null;
                const paymentDue = lastPaid === 0 || daysSincePayment >= frequencyDays[emp.frequency as keyof typeof frequencyDays];

                return (
                  <div
                    key={emp.wallet}
                    className="p-4 border dark:border-gray-700 rounded-lg hover:shadow-md dark:hover:bg-gray-700/30 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      {/* Left: Employee Info */}
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-950 rounded-lg flex items-center justify-center">
                          <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold dark:text-white">{emp.name}</h4>
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                            {emp.wallet.slice(0, 8)}...{emp.wallet.slice(-6)}
                          </div>
                        </div>
                      </div>

                      {/* Right: Salary */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Salary
                          </div>
                          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                            {salaryNum.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {frequencyLabels[emp.frequency as keyof typeof frequencyLabels]} • {totalPaidNum.toFixed(0)} paid
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              if (editingAddress === emp.wallet) {
                                setEditingAddress(null);
                                setEditSalary('');
                              } else {
                                setEditingAddress(emp.wallet);
                                setEditSalary(salaryNum.toString());
                              }
                            }}
                            className="text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-900"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleRemoveEmployee(emp.wallet)}
                            disabled={removingAddress === emp.wallet}
                            className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-900"
                          >
                            {removingAddress === emp.wallet ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Edit Salary Form */}
                    {editingAddress === emp.wallet && (
                      <div className="pt-3 border-t dark:border-gray-700 mt-3">
                        <div className="flex items-end gap-3">
                          <div className="flex-1">
                            <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5">
                              New Salary Amount
                            </Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="New salary"
                              value={editSalary}
                              onChange={(e) => setEditSalary(e.target.value)}
                              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleUpdateSalary(emp.wallet)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Update
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingAddress(null);
                              setEditSalary('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Payment Status & Action */}
                    <div className="flex items-center justify-between pt-3 border-t dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {lastPaid === 0 ? 'Never paid' : `Paid ${daysSincePayment} days ago`}
                        </span>
                        {paymentDue && (
                          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-400">
                            Due
                          </Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleProcessPayment(emp.wallet)}
                        disabled={processingAddress === emp.wallet}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {processingAddress === emp.wallet ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <DollarSign className="w-4 h-4 mr-1" />
                            Pay Now
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      {paymentHistory.length > 0 && (
        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl dark:text-white">Payment History</CardTitle>
            <CardDescription className="dark:text-gray-400">
              Recent payroll transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {paymentHistory.slice(0, 10).map((record, idx) => {
                const employee = employees.find(e => e.wallet.toLowerCase() === record.employee.toLowerCase());
                const amountNum = parseFloat(formatEther(record.amount));
                const date = new Date(Number(record.timestamp) * 1000);

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <div className="font-medium dark:text-white">
                          {employee?.name || 'Unknown Employee'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {record.employee.slice(0, 8)}...{record.employee.slice(-6)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600 dark:text-green-400">
                        {amountNum.toLocaleString()} USDC
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {paymentHistory.length > 10 && (
              <div className="text-center mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing 10 of {paymentHistory.length} payments
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

