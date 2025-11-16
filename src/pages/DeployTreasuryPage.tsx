import { useState, useEffect } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { getContractAddress } from 'viem';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Progress } from '../components/ui/progress';
import {
  Rocket,
  CheckCircle2,
  Loader2,
  Building2,
  Users,
  GitBranch,
  Shield,
  Lock,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useTreasury } from '../contexts/TreasuryContext';

// Import compiled contracts with bytecode and ABIs
import TreasuryCoreCompiled from '../../../backend/out/TreasuryCore.sol/TreasuryCore.json';
import BudgetAllocatorCompiled from '../../../backend/out/BudgetAllocator.sol/BudgetAllocator.json';
import PayrollManagerCompiled from '../../../backend/out/PayrollManager.sol/PayrollManager.json';
import ComplianceTrackerCompiled from '../../../backend/out/ComplianceTracker.sol/ComplianceTracker.json';
import RuleEngineCompiled from '../../../backend/out/RuleEngine.sol/RuleEngine.json';

const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const PROGRESS_STORAGE_KEY = 'arcboard-deployment-progress';

interface DeploymentStep {
  name: string;
  icon: any;
  status: 'pending' | 'deploying' | 'done' | 'error';
  address?: string;
  txHash?: string;
}

interface DeploymentProgress {
  treasuryName: string;
  steps: Array<{
    name: string;
    status: 'pending' | 'deploying' | 'done' | 'error';
    address?: string;
    txHash?: string;
  }>;
  configSteps: Array<{name: string, status: 'pending' | 'done' | 'error'}>;
  timestamp: number;
}

// Map contract names to icons
const iconMap: Record<string, any> = {
  TreasuryCore: Lock,
  BudgetAllocator: Building2,
  PayrollManager: Users,
  ComplianceTracker: Shield,
  RuleEngine: GitBranch,
};

export function DeployTreasuryPage() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient() as any;
  const navigate = useNavigate();
  const { addTreasury, isLoading: treasuryLoading } = useTreasury();

  const [treasuryName, setTreasuryName] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [configStep, setConfigStep] = useState(0);
  const [totalSteps] = useState(15); // 5 deployments + 10 configurations
  const [hasInProgressDeployment, setHasInProgressDeployment] = useState(false);
  const [steps, setSteps] = useState<DeploymentStep[]>([
    { name: 'TreasuryCore', icon: Lock, status: 'pending' },
    { name: 'BudgetAllocator', icon: Building2, status: 'pending' },
    { name: 'PayrollManager', icon: Users, status: 'pending' },
    { name: 'ComplianceTracker', icon: Shield, status: 'pending' },
    { name: 'RuleEngine', icon: GitBranch, status: 'pending' },
  ]);
  const [configSteps, setConfigSteps] = useState<Array<{name: string, status: 'pending' | 'done' | 'error'}>>([
    { name: 'Grant compliance role', status: 'pending' },
    { name: 'Link compliance tracker', status: 'pending' },
    { name: 'Authorize PayrollManager', status: 'pending' },
    { name: 'Authorize BudgetAllocator', status: 'pending' },
    { name: 'Authorize RuleEngine', status: 'pending' },
    { name: 'Configure BudgetAllocator treasury', status: 'pending' },
    { name: 'Link PayrollManager to BudgetAllocator', status: 'pending' },
    { name: 'Configure PayrollManager treasury', status: 'pending' },
    { name: 'Link BudgetAllocator to PayrollManager', status: 'pending' },
    { name: 'Configure RuleEngine treasury', status: 'pending' },
  ]);

  // Load saved progress on mount
  useEffect(() => {
    const saved = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (saved) {
      try {
        const progress: DeploymentProgress = JSON.parse(saved);
        // Only restore if less than 1 hour old
        if (Date.now() - progress.timestamp < 3600000) {
          setTreasuryName(progress.treasuryName);

          // Restore steps with icons
          const restoredSteps = progress.steps.map(step => ({
            ...step,
            icon: iconMap[step.name] || Lock
          }));
          setSteps(restoredSteps);
          setConfigSteps(progress.configSteps);
          setHasInProgressDeployment(true);
        } else {
          // Clear old progress
          localStorage.removeItem(PROGRESS_STORAGE_KEY);
        }
      } catch (error) {
        console.error('Failed to load progress:', error);
      }
    }
  }, []);

  // Save progress whenever steps change
  useEffect(() => {
    if (isDeploying && treasuryName) {
      // Save steps without icon components (not serializable)
      const stepsToSave = steps.map(({ icon, ...rest }) => rest);

      const progress: DeploymentProgress = {
        treasuryName,
        steps: stepsToSave,
        configSteps,
        timestamp: Date.now(),
      };
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    }
  }, [steps, configSteps, isDeploying, treasuryName]);

  const clearProgress = () => {
    localStorage.removeItem(PROGRESS_STORAGE_KEY);
    setHasInProgressDeployment(false);
    setSteps([
      { name: 'TreasuryCore', icon: Lock, status: 'pending' },
      { name: 'BudgetAllocator', icon: Building2, status: 'pending' },
      { name: 'PayrollManager', icon: Users, status: 'pending' },
      { name: 'ComplianceTracker', icon: Shield, status: 'pending' },
      { name: 'RuleEngine', icon: GitBranch, status: 'pending' },
    ]);
    setConfigSteps([
      { name: 'Grant compliance role', status: 'pending' },
      { name: 'Link compliance tracker', status: 'pending' },
      { name: 'Authorize PayrollManager', status: 'pending' },
      { name: 'Authorize BudgetAllocator', status: 'pending' },
      { name: 'Authorize RuleEngine', status: 'pending' },
      { name: 'Configure BudgetAllocator treasury', status: 'pending' },
      { name: 'Link PayrollManager to BudgetAllocator', status: 'pending' },
      { name: 'Configure PayrollManager treasury', status: 'pending' },
      { name: 'Link BudgetAllocator to PayrollManager', status: 'pending' },
      { name: 'Configure RuleEngine treasury', status: 'pending' },
    ]);
  };

  const updateStepStatus = (index: number, status: DeploymentStep['status'], address?: string, txHash?: string) => {
    setSteps(prev => prev.map((step, i) =>
      i === index ? { ...step, status, address, txHash } : step
    ));
  };

  const deployContract = async (bytecode: string, abi: any, stepIndex: number, contractName: string) => {
    if (!walletClient || !publicClient) {
      throw new Error('Wallet not ready');
    }

    updateStepStatus(stepIndex, 'deploying');

    const toastId = toast.loading(`Deploying ${contractName}...`, {
      description: 'Please confirm in your wallet'
    });

    try {
      // Use sendTransaction for better wallet compatibility
      const hash = await walletClient.sendTransaction({
        account: address!,
        to: null,
        data: bytecode as `0x${string}`,
        chain: walletClient.chain,
      });

      toast.loading(`Confirming ${contractName} deployment...`, {
        id: toastId,
        description: `TX: ${hash.slice(0, 10)}...${hash.slice(-8)}`
      });

      try {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
          timeout: 30000, // 30 second timeout
        });

        if (receipt.status === 'success' && receipt.contractAddress) {
          toast.success(`${contractName} deployed!`, {
            id: toastId,
            description: `${receipt.contractAddress.slice(0, 10)}...${receipt.contractAddress.slice(-8)}`
          });
          updateStepStatus(stepIndex, 'done', receipt.contractAddress, hash);
          return receipt.contractAddress;
        }
      } catch (receiptError) {
        console.warn('Receipt fetch failed, calculating contract address deterministically:', receiptError);

        // Calculate contract address deterministically from deployer address and nonce
        try {
          // Wait a bit for transaction to be mined
          await new Promise(resolve => setTimeout(resolve, 5000));

          // Get the transaction to find the nonce
          const tx = await publicClient.getTransaction({ hash }).catch(() => null);

          if (tx && tx.nonce !== undefined) {
            // Calculate contract address from sender + nonce
            const contractAddress = getContractAddress({
              from: address!,
              nonce: BigInt(tx.nonce),
            });

            toast.success(`${contractName} deployed! (calculated address)`, {
              id: toastId,
              description: `${contractAddress.slice(0, 10)}...${contractAddress.slice(-8)}`
            });
            updateStepStatus(stepIndex, 'done', contractAddress, hash);
            return contractAddress;
          }

          throw new Error('Could not get transaction nonce');
        } catch (fallbackError) {
          console.error('Fallback failed:', fallbackError);
          throw new Error('Could not confirm deployment - please check blockchain explorer');
        }
      }
    } catch (error: any) {
      console.error(`${contractName} deployment error:`, error);
      toast.error(`${contractName} failed`, {
        id: toastId,
        description: error.message || 'Unknown error'
      });
      updateStepStatus(stepIndex, 'error');
      throw error;
    }
  };

  const updateConfigStep = (index: number, status: 'pending' | 'done' | 'error') => {
    setConfigSteps(prev => prev.map((step, i) =>
      i === index ? { ...step, status } : step
    ));
    setConfigStep(index + 1);
  };

  const configureContracts = async (addresses: {
    treasuryCore: string;
    budgetAllocator: string;
    payrollManager: string;
    complianceTracker: string;
    ruleEngine: string;
  }) => {
    if (!walletClient || !publicClient) return;

    const toastId = toast.loading('Starting configuration...');

    try {
      // Grant COMPLIANCE_OFFICER_ROLE to TreasuryCore
      const COMPLIANCE_OFFICER_ROLE = '0xb6f0283bd1ed00c6aa7e988a7516070240f3610a34d167391359b648eb37cefc';

      try {
        toast.loading('Granting compliance role...', { id: toastId });
        const hash = await walletClient.writeContract({
          address: addresses.complianceTracker as `0x${string}`,
          abi: ComplianceTrackerCompiled.abi,
          functionName: 'grantRole',
          args: [COMPLIANCE_OFFICER_ROLE, addresses.treasuryCore as `0x${string}`],
          account: address!,
        });
        await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
        updateConfigStep(0, 'done');
      } catch (err) {
        console.error('Failed to grant role:', err);
        updateConfigStep(0, 'error');
      }

      // Set ComplianceTracker in TreasuryCore
      try {
        toast.loading('Linking compliance tracker...', { id: toastId });
        const hash2 = await walletClient.writeContract({
          address: addresses.treasuryCore as `0x${string}`,
          abi: TreasuryCoreCompiled.abi,
          functionName: 'setComplianceTracker',
          args: [addresses.complianceTracker as `0x${string}`],
          account: address!,
        });
        await publicClient.waitForTransactionReceipt({ hash: hash2, confirmations: 1 });
        updateConfigStep(1, 'done');
      } catch (err) {
        console.error('Failed to set compliance tracker:', err);
        updateConfigStep(1, 'error');
      }

      // Authorize contracts
      const contractsToAuthorize = [
        { address: addresses.payrollManager, name: 'PayrollManager', stepIndex: 2 },
        { address: addresses.budgetAllocator, name: 'BudgetAllocator', stepIndex: 3 },
        { address: addresses.ruleEngine, name: 'RuleEngine', stepIndex: 4 },
      ];

      for (const contract of contractsToAuthorize) {
        try {
          toast.loading(`Authorizing ${contract.name}...`, { id: toastId });
          const hash3 = await walletClient.writeContract({
            address: addresses.treasuryCore as `0x${string}`,
            abi: TreasuryCoreCompiled.abi,
            functionName: 'authorizeContract',
            args: [contract.address as `0x${string}`],
            account: address!,
          });
          await publicClient.waitForTransactionReceipt({ hash: hash3, confirmations: 1 });
          updateConfigStep(contract.stepIndex, 'done');
        } catch (err: any) {
          console.error(`Failed to authorize ${contract.name}:`, err);
          updateConfigStep(contract.stepIndex, 'error');
          toast.warning(`Skipping ${contract.name} authorization`, { id: toastId });
        }
      }

      // Configure BudgetAllocator
      try {
        toast.loading('Configuring BudgetAllocator treasury...', { id: toastId });
        const hash4 = await walletClient.writeContract({
          address: addresses.budgetAllocator as `0x${string}`,
          abi: BudgetAllocatorCompiled.abi,
          functionName: 'setTreasury',
          args: [addresses.treasuryCore as `0x${string}`],
          account: address!,
        });
        await publicClient.waitForTransactionReceipt({ hash: hash4, confirmations: 1 });
        updateConfigStep(5, 'done');
      } catch (err) {
        console.error('Failed setTreasury on BudgetAllocator:', err);
        updateConfigStep(5, 'error');
      }

      try {
        toast.loading('Linking PayrollManager to BudgetAllocator...', { id: toastId });
        const hash5 = await walletClient.writeContract({
          address: addresses.budgetAllocator as `0x${string}`,
          abi: BudgetAllocatorCompiled.abi,
          functionName: 'setPayrollManager',
          args: [addresses.payrollManager as `0x${string}`],
          account: address!,
        });
        await publicClient.waitForTransactionReceipt({ hash: hash5, confirmations: 1 });
        updateConfigStep(6, 'done');
      } catch (err) {
        console.error('Failed setPayrollManager on BudgetAllocator:', err);
        updateConfigStep(6, 'error');
      }

      // Configure PayrollManager
      try {
        toast.loading('Configuring PayrollManager treasury...', { id: toastId });
        const hash6 = await walletClient.writeContract({
          address: addresses.payrollManager as `0x${string}`,
          abi: PayrollManagerCompiled.abi,
          functionName: 'setTreasury',
          args: [addresses.treasuryCore as `0x${string}`],
          account: address!,
        });
        await publicClient.waitForTransactionReceipt({ hash: hash6, confirmations: 1 });
        updateConfigStep(7, 'done');
      } catch (err) {
        console.error('Failed setTreasury on PayrollManager:', err);
        updateConfigStep(7, 'error');
      }

      try {
        toast.loading('Linking BudgetAllocator to PayrollManager...', { id: toastId });
        const hash7 = await walletClient.writeContract({
          address: addresses.payrollManager as `0x${string}`,
          abi: PayrollManagerCompiled.abi,
          functionName: 'setBudgetAllocator',
          args: [addresses.budgetAllocator as `0x${string}`],
          account: address!,
        });
        await publicClient.waitForTransactionReceipt({ hash: hash7, confirmations: 1 });
        updateConfigStep(8, 'done');
      } catch (err) {
        console.error('Failed setBudgetAllocator on PayrollManager:', err);
        updateConfigStep(8, 'error');
      }

      // Configure RuleEngine
      try {
        toast.loading('Configuring RuleEngine treasury...', { id: toastId });
        const hash8 = await walletClient.writeContract({
          address: addresses.ruleEngine as `0x${string}`,
          abi: RuleEngineCompiled.abi,
          functionName: 'setTreasury',
          args: [addresses.treasuryCore as `0x${string}`],
          account: address!,
        });
        await publicClient.waitForTransactionReceipt({ hash: hash8, confirmations: 1 });
        updateConfigStep(9, 'done');
      } catch (err) {
        console.error('Failed setTreasury on RuleEngine:', err);
        updateConfigStep(9, 'error');
      }

      const successfulConfigs = configSteps.filter(s => s.status === 'done').length;
      toast.success(`Configuration complete! (${successfulConfigs}/10 steps successful)`, { id: toastId });
    } catch (error) {
      console.error('Configuration error:', error);
      toast.error('Configuration failed', { id: toastId });
      throw error;
    }
  };

  const handleDeploy = async () => {
    if (!treasuryName) {
      toast.error('Please enter a treasury name');
      return;
    }

    if (!walletClient || !publicClient) {
      toast.error('Wallet not ready');
      return;
    }

    setIsDeploying(true);
    setCurrentStep(0);

    let treasuryCoreAddress: string = '';
    let budgetAllocatorAddress: string = '';
    let payrollManagerAddress: string = '';
    let complianceTrackerAddress: string = '';
    let ruleEngineAddress: string = '';

    try {
      // Deploy contracts one by one (skip if already deployed)
      setCurrentStep(0);
      if (steps[0].status === 'done' && steps[0].address) {
        treasuryCoreAddress = steps[0].address;
        toast.info('TreasuryCore already deployed, skipping...');
      } else {
        treasuryCoreAddress = await deployContract(
            TreasuryCoreCompiled.bytecode.object,
            TreasuryCoreCompiled.abi,
            0,
            'TreasuryCore'
          );
      }

      setCurrentStep(1);
      if (steps[1].status === 'done' && steps[1].address) {
        budgetAllocatorAddress = steps[1].address;
        toast.info('BudgetAllocator already deployed, skipping...');
      } else {
        budgetAllocatorAddress = await deployContract(
            BudgetAllocatorCompiled.bytecode.object,
            BudgetAllocatorCompiled.abi,
            1,
            'BudgetAllocator'
          );
      }

      setCurrentStep(2);
      if (steps[2].status === 'done' && steps[2].address) {
        payrollManagerAddress = steps[2].address;
        toast.info('PayrollManager already deployed, skipping...');
      } else {
        payrollManagerAddress = await deployContract(
            PayrollManagerCompiled.bytecode.object,
            PayrollManagerCompiled.abi,
            2,
            'PayrollManager'
          );
      }

      setCurrentStep(3);
      if (steps[3].status === 'done' && steps[3].address) {
        complianceTrackerAddress = steps[3].address;
        toast.info('ComplianceTracker already deployed, skipping...');
      } else {
        complianceTrackerAddress = await deployContract(
            ComplianceTrackerCompiled.bytecode.object,
            ComplianceTrackerCompiled.abi,
            3,
            'ComplianceTracker'
          );
      }

      setCurrentStep(4);
      if (steps[4].status === 'done' && steps[4].address) {
        ruleEngineAddress = steps[4].address;
        toast.info('RuleEngine already deployed, skipping...');
      } else {
        ruleEngineAddress = await deployContract(
            RuleEngineCompiled.bytecode.object,
            RuleEngineCompiled.abi,
            4,
            'RuleEngine'
          );
      }

      // Configure all contracts
      const addresses = {
        treasuryCore: treasuryCoreAddress,
        budgetAllocator: budgetAllocatorAddress,
        payrollManager: payrollManagerAddress,
        complianceTracker: complianceTrackerAddress,
        ruleEngine: ruleEngineAddress,
      };

      await configureContracts(addresses);

      // Save to localStorage
      const newTreasury: Treasury = {
        id: `treasury_${Date.now()}`,
        name: treasuryName,
        owner: address!,
        network: 'arc-testnet',
        contracts: addresses,
        deployedAt: Date.now(),
        isActive: true,
      };

      addTreasury(newTreasury);

      // Clear deployment progress
      localStorage.removeItem(PROGRESS_STORAGE_KEY);

      toast.success('Treasury deployed successfully!');

      // Navigate to dashboard
      setTimeout(() => {
        navigate('/overview');
      }, 1500);

    } catch (error: any) {
      console.error('Deployment error:', error);

      // If all contracts are deployed but configuration failed
      if (deploymentsDone === 5) {
        toast.error('Configuration failed - Contracts deployed but not linked', {
          description: 'You can configure manually in System Setup page'
        });

        // Save the treasury anyway with deployed contracts
        const partialTreasury: any = {
          id: `treasury_${Date.now()}`,
          name: treasuryName,
          owner: address!,
          network: 'arc-testnet',
          contracts: addresses,
          deployedAt: Date.now(),
          isActive: true,
        };

        addTreasury(partialTreasury);
        localStorage.removeItem(PROGRESS_STORAGE_KEY);

        setTimeout(() => {
          navigate('/setup');
        }, 2000);
      } else {
        toast.error('Deployment failed - Progress saved. You can resume later.');
      }

      setIsDeploying(false);
      // Don't clear progress so user can resume
      return;
    }

    setIsDeploying(false);
  };

  const deploymentsDone = steps.filter(s => s.status === 'done').length;
  const configsDone = configSteps.filter(s => s.status === 'done').length;
  const totalDone = deploymentsDone + configsDone;
  const progress = (totalDone / totalSteps) * 100;

  // Show loading while treasury context initializes
  if (treasuryLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full dark:bg-gray-800/50 dark:border-gray-700">
        <CardHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl dark:text-white">Deploy Your Treasury</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Create your on-chain treasury management system
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Resume Banner */}
          {hasInProgressDeployment && !isDeploying && (
            <div className="p-6 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-orange-900 dark:text-orange-100 mb-2">
                    Deployment in Progress
                  </h4>
                </div>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    You have an incomplete deployment. You can resume from where you left off or start fresh.
                  </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleDeploy}
                  variant="success"
                  className="shadow-lg"
                  size="lg"
                >
                  <Rocket className="w-4 h-4 mr-2" />
                  Resume Deployment
                </Button>
                <Button
                  variant="outline"
                  onClick={clearProgress}
                  size="lg"
                  className="border-orange-600 text-orange-600 dark:border-orange-500 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                >
                  <span className="font-medium">Start Fresh</span>
                </Button>
              </div>
            </div>
          )}

          {/* Treasury Name */}
          {!isDeploying && !hasInProgressDeployment && (
            <div>
              <Label htmlFor="treasuryName" className="dark:text-gray-200">
                Treasury Name
              </Label>
              <Input
                id="treasuryName"
                placeholder="e.g., Main Treasury, DAO Treasury"
                value={treasuryName}
                onChange={(e) => setTreasuryName(e.target.value)}
                className="mt-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={isDeploying}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Give your treasury a name to identify it
              </p>
            </div>
          )}

          {/* Deployment Progress */}
          {isDeploying && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium dark:text-white">Overall Progress</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {totalDone} / {totalSteps} steps ({Math.round(progress)}%)
                  </span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>

              {/* Contract Deployments */}
              <div>
                <h3 className="text-sm font-semibold dark:text-white mb-2">Contract Deployment ({deploymentsDone}/5)</h3>
                <div className="space-y-2">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div
                      key={step.name}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        step.status === 'done'
                          ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20'
                          : step.status === 'deploying'
                          ? 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20'
                          : step.status === 'error'
                          ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${
                          step.status === 'done' ? 'text-green-600 dark:text-green-400' :
                          step.status === 'deploying' ? 'text-blue-600 dark:text-blue-400' :
                          step.status === 'error' ? 'text-red-600 dark:text-red-400' :
                          'text-gray-400'
                        }`} />
                        <div>
                          <div className="font-medium dark:text-white">{step.name}</div>
                          {step.address && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                              {step.address.slice(0, 10)}...{step.address.slice(-8)}
                            </div>
                          )}
                        </div>
                      </div>
                      {step.status === 'done' && <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />}
                      {step.status === 'deploying' && <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />}
                    </div>
                  );
                })}
                </div>
              </div>

              {/* Configuration Steps - Only show after deployments are done */}
              {deploymentsDone === 5 && (
                <div>
                  <h3 className="text-sm font-semibold dark:text-white mb-2">Configuration ({configsDone}/10)</h3>
                  <div className="space-y-1">
                    {configSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm"
                      >
                        <span className="text-gray-600 dark:text-gray-400">{step.name}</span>
                        {step.status === 'done' && <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />}
                        {step.status === 'pending' && configStep === idx && <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Deploy Button */}
          {!isDeploying && !hasInProgressDeployment && (
            <div className="space-y-4">
              <Button
                onClick={handleDeploy}
                disabled={!treasuryName || isDeploying}
                size="lg"
                className="w-full"
              >
                <Rocket className="w-5 h-5 mr-2" />
                Deploy Treasury System
              </Button>

              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>You'll need to approve 15 transactions:</strong>
                  <br />• 5 contract deployments
                  <br />• 10 configuration transactions
                  <br />
                  <br />Total time: ~3-5 minutes
                </p>
              </div>
            </div>
          )}

          {/* Success State */}
          {isDeploying && deploymentsDone === 5 && configsDone === 10 && (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-950 mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-bold dark:text-white mb-2">Treasury Ready!</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                All contracts deployed and configured successfully.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Redirecting to dashboard...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

