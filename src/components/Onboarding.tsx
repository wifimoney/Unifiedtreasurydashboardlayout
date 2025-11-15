import React, { useState } from 'react';
import { useAccount, useDeployContract, useWaitForTransactionReceipt, useChainId, usePublicClient } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import {
  Rocket,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ExternalLink,
  Shield,
  FileCode,
  Zap,
  Copy,
  Check,
  Edit,
} from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { ContractDeploymentService } from '../lib/contractDeploymentService';
import { getExplorerUrl, USDC_ADDRESS, ARC_TESTNET_CHAIN_ID } from '../lib/contracts';
import RuleEngineDeployment from '../lib/deployments/arcTestnet/RuleEngine.json';
import TreasuryCoreDeployment from '../lib/deployments/arcTestnet/TreasuryCore.json';

interface OnboardingProps {
  onComplete: () => void;
}

const DEMO_WALLET = '0x499Be1Fc64bF3adCfD9619e0dF92BaA459DFe2DA'; // Hackathon demo wallet

export function Onboarding({ onComplete }: OnboardingProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const [deploymentStep, setDeploymentStep] = useState<'idle' | 'deploying-treasury' | 'deploying-ruleengine' | 'completed'>('idle');
  const [deployedTreasuryAddress, setDeployedTreasuryAddress] = useState<string>('');
  const [deployedRuleEngineAddress, setDeployedRuleEngineAddress] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualTreasuryAddress, setManualTreasuryAddress] = useState('');
  const [manualRuleEngineAddress, setManualRuleEngineAddress] = useState('');

  // HACKATHON: Auto-configure demo wallet with existing contracts
  React.useEffect(() => {
    if (address?.toLowerCase() === DEMO_WALLET.toLowerCase() && deploymentStep === 'idle') {
      console.log('🎯 HACKATHON: Auto-configuring demo wallet with existing contracts');

      const existingTreasury = "0xcee3Bb02aE95E1Dbc2e5C51a502Ac6eC5deEFa81";
      const existingRuleEngine = "0x69AF02435EfE7Ed08f8f5Fe411831e84e5eA89a8";

      // Auto-save for demo wallet
      ContractDeploymentService.updateContractAddress(address, chainId, 'treasuryCore', existingTreasury);
      ContractDeploymentService.updateContractAddress(address, chainId, 'ruleEngine', existingRuleEngine);

      setDeployedTreasuryAddress(existingTreasury);
      setDeployedRuleEngineAddress(existingRuleEngine);
      setDeploymentStep('completed');

      toast.success('🎉 Demo wallet configured!', {
        description: 'Using existing contracts - you can now manage rules',
        duration: 5000,
      });
    }
  }, [address, chainId, deploymentStep]);

  // Verify bytecode is loaded
  React.useEffect(() => {
    console.log('🔍 Contract bytecode verification:', {
      treasuryCoreBytecode: TreasuryCoreDeployment.bytecode ? 'Loaded ✓' : 'Missing ✗',
      treasuryCoreBytecodeLength: (TreasuryCoreDeployment.bytecode as string)?.length || 0,
      ruleEngineBytecode: RuleEngineDeployment.bytecode ? 'Loaded ✓' : 'Missing ✗',
      ruleEngineBytecodeLength: (RuleEngineDeployment.bytecode as string)?.length || 0,
    });
  }, []);

  // Use deployContract hook for actual deployment
  const { data: deployHash, deployContract, isPending: isDeploying, error: deployError } = useDeployContract();

  const { isLoading: isWaitingForDeploy, isSuccess: isDeploySuccess } = useWaitForTransactionReceipt({
    hash: deployHash,
  });

  // Handle deployment success - Get actual contract address from receipt
  React.useEffect(() => {
    async function getDeployedAddress() {
      if (isDeploySuccess && deployHash && address && publicClient) {
        try {
          console.log('🔍 Getting transaction receipt for:', deployHash);

          // Get the transaction receipt to find the deployed contract address
          const receipt = await publicClient.getTransactionReceipt({ hash: deployHash });

          if (receipt.contractAddress) {
            const contractAddress = receipt.contractAddress;

            // Check which contract was just deployed
            if (deploymentStep === 'deploying-treasury') {
              console.log('✅ TreasuryCore deployed at:', contractAddress);
              setDeployedTreasuryAddress(contractAddress);

              toast.dismiss('deploying-treasury');
              toast.success('🎉 TreasuryCore deployed!', {
                description: 'Now deploying RuleEngine...',
                duration: 3000,
              });

              // Save TreasuryCore address
              ContractDeploymentService.updateContractAddress(
                address,
                chainId,
                'treasuryCore',
                contractAddress
              );

              // Automatically deploy RuleEngine next
              deployRuleEngine(contractAddress);

            } else if (deploymentStep === 'deploying-ruleengine') {
              console.log('✅ RuleEngine deployed at:', contractAddress);
              setDeployedRuleEngineAddress(contractAddress);
              setDeploymentStep('completed');

              // Save RuleEngine address
              ContractDeploymentService.updateContractAddress(
                address,
                chainId,
                'ruleEngine',
                contractAddress
              );

              toast.dismiss('deploying-ruleengine');
              toast.success('🎉 All contracts deployed successfully!', {
                description: `RuleEngine: ${contractAddress.slice(0, 10)}...${contractAddress.slice(-8)}`,
                duration: 8000,
              });
            }
          } else {
            throw new Error('Contract address not found in receipt');
          }
        } catch (error) {
          console.error('Error getting contract address:', error);
          toast.error('Failed to get contract address', {
            description: 'Please check the transaction on explorer',
          });
          setDeploymentStep('idle');
        }
      }
    }

    getDeployedAddress();
  }, [isDeploySuccess, deployHash, address, chainId, publicClient, deploymentStep]);

  // Handle deployment errors
  React.useEffect(() => {
    if (deployError) {
      console.error('❌ Deployment error FULL:', deployError);
      console.error('❌ Error name:', deployError.name);
      console.error('❌ Error message:', deployError.message);
      console.error('❌ Error cause:', deployError.cause);
      console.error('❌ Error stack:', deployError.stack);

      const contractType = deploymentStep === 'deploying-treasury' ? 'TreasuryCore' : 'RuleEngine';
      toast.dismiss('deploying-treasury');
      toast.dismiss('deploying-ruleengine');
      setDeploymentStep('idle');

      const errorMessage = deployError.message?.toLowerCase() || '';
      const causeMessage = (deployError.cause as any)?.message?.toLowerCase() || '';
      const detailsMessage = (deployError as any)?.details?.toLowerCase() || '';

      // Check if rate limiting is the root cause
      const isRateLimit = errorMessage.includes('rate limit') ||
                         causeMessage.includes('rate limit') ||
                         detailsMessage.includes('rate limit');

      if (isRateLimit) {
        toast.error('🚨 RPC Rate Limit Hit!', {
          description: 'Your Alchemy RPC is rate limited. Please wait 30-60 seconds and try again, or update your RPC endpoint in chains.ts',
          duration: 15000,
        });
      } else if (errorMessage.includes('user rejected') || errorMessage.includes('user denied')) {
        // Only show this if NOT caused by rate limit
        if (!isRateLimit) {
          toast.error(`${contractType} deployment cancelled`, {
            description: 'You rejected the transaction in your wallet',
          });
        }
      } else if (errorMessage.includes('insufficient funds') || errorMessage.includes('insufficient balance')) {
        toast.error('Insufficient funds', {
          description: 'You need more USDC to deploy the contract',
        });
      } else if (errorMessage.includes('execution reverted')) {
        toast.error(`${contractType} deployment reverted`, {
          description: 'The contract deployment failed. Check constructor arguments.',
          duration: 10000,
        });
      } else {
        const shortMessage = errorMessage.split('\n')[0].substring(0, 150);
        toast.error(`${contractType} deployment failed`, {
          description: shortMessage || 'Please check console for details',
          duration: 10000,
        });
      }
    }
  }, [deployError, deploymentStep]);

  // Step 1: Deploy TreasuryCore
  const handleDeploy = async () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet');
      return;
    }

    // Check if on correct network
    if (chainId !== ARC_TESTNET_CHAIN_ID) {
      toast.error('Wrong Network', {
        description: `Please switch to Arc Testnet (Chain ID: ${ARC_TESTNET_CHAIN_ID}). You're currently on chain ${chainId}.`,
        duration: 8000,
      });
      return;
    }

    console.log('🔍 Deployment environment check:', {
      isConnected,
      address,
      chainId,
      chainName: 'Arc Testnet (5042002)',
      correctNetwork: chainId === ARC_TESTNET_CHAIN_ID,
    });

    try {
      setDeploymentStep('deploying-treasury');

      const deployParams = {
        abi: TreasuryCoreDeployment.abi,
        bytecode: TreasuryCoreDeployment.bytecode as `0x${string}`,
        args: [
          [address], // _owners array with user as sole owner
          1n,        // _threshold (1 signature required)
        ],
        chainId: chainId,
      };

      console.log('🚀 Step 1/2: Deploying TreasuryCore with params:', {
        owners: [address],
        threshold: 1,
        targetChainId: chainId,
        bytecodeLength: (TreasuryCoreDeployment.bytecode as string).length,
        abiLength: TreasuryCoreDeployment.abi.length,
      });

      console.log('📦 Deploy params:', {
        hasAbi: !!deployParams.abi,
        hasBytecode: !!deployParams.bytecode,
        argsCount: deployParams.args.length,
        args: deployParams.args,
        chainId: deployParams.chainId,
      });

      toast.loading('Deploying TreasuryCore contract...', {
        description: 'Step 1 of 2 - Please confirm the transaction in your wallet',
        id: 'deploying-treasury',
      });

      // Deploy TreasuryCore with user as the only owner and threshold of 1
      // Add manual gas to skip estimation (which is failing due to RPC rate limit)
      const deployParamsWithGas = {
        ...deployParams,
        gas: 3000000n, // Manual gas limit for TreasuryCore deployment
      };

      console.log('💰 Deploying with manual gas limit to avoid estimation:', deployParamsWithGas);

      deployContract(deployParamsWithGas);

      console.log('📝 TreasuryCore deployment transaction sent...');

    } catch (error) {
      console.error('💥 TreasuryCore deployment error:', error);
      setDeploymentStep('idle');
      toast.dismiss('deploying-treasury');
      toast.error('Failed to deploy TreasuryCore', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Step 2: Deploy RuleEngine (called automatically after TreasuryCore)
  const deployRuleEngine = async (treasuryCoreAddress: string) => {
    try {
      setDeploymentStep('deploying-ruleengine');

      console.log('🚀 Step 2/2: Deploying RuleEngine with params:', {
        treasury: treasuryCoreAddress,
        usdc: USDC_ADDRESS,
        targetChainId: chainId,
      });

      toast.loading('Deploying RuleEngine contract...', {
        description: 'Step 2 of 2 - Please confirm the transaction in your wallet',
        id: 'deploying-ruleengine',
      });

      // Deploy RuleEngine with the newly deployed TreasuryCore address
      // Add manual gas to skip estimation
      deployContract({
        abi: RuleEngineDeployment.abi,
        bytecode: RuleEngineDeployment.bytecode as `0x${string}`,
        args: [
          treasuryCoreAddress as `0x${string}`,
          USDC_ADDRESS,
        ],
        chainId: chainId,
        gas: 5000000n, // Manual gas limit for RuleEngine deployment (larger contract)
      });

      console.log('📝 RuleEngine deployment transaction sent...');

    } catch (error) {
      console.error('💥 RuleEngine deployment error:', error);
      setDeploymentStep('idle');
      toast.dismiss('deploying-ruleengine');
      toast.error('Failed to deploy RuleEngine', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleCopyAddress = (addressType: 'treasury' | 'ruleengine') => {
    const addr = addressType === 'treasury' ? deployedTreasuryAddress : deployedRuleEngineAddress;
    if (addr) {
      navigator.clipboard.writeText(addr);
      setCopied(true);
      toast.success(`${addressType === 'treasury' ? 'TreasuryCore' : 'RuleEngine'} address copied`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleComplete = () => {
    if (deployedRuleEngineAddress && address) {
      onComplete();
    }
  };

  const handleManualSave = () => {
    if (!address) {
      toast.error('Please connect wallet');
      return;
    }

    if (!manualTreasuryAddress || !manualRuleEngineAddress) {
      toast.error('Please enter both contract addresses');
      return;
    }

    // Validate addresses
    if (!manualTreasuryAddress.match(/^0x[a-fA-F0-9]{40}$/) || !manualRuleEngineAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast.error('Invalid address format');
      return;
    }

    // Save to localStorage
    ContractDeploymentService.updateContractAddress(address, chainId, 'treasuryCore', manualTreasuryAddress);
    ContractDeploymentService.updateContractAddress(address, chainId, 'ruleEngine', manualRuleEngineAddress);

    setDeployedTreasuryAddress(manualTreasuryAddress);
    setDeployedRuleEngineAddress(manualRuleEngineAddress);
    setDeploymentStep('completed');

    toast.success('Contract addresses saved!', {
      description: 'You can now use your contracts in the dashboard',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-6">
      <Card className="max-w-3xl w-full dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-2xl">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Rocket className="w-10 h-10 text-white" />
          </div>
          <div>
            <CardTitle className="text-4xl dark:text-white mb-2">
              Welcome to ARCBOARD
            </CardTitle>
            <CardDescription className="text-lg dark:text-gray-400">
              Deploy your TreasuryCore and RuleEngine contracts
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Why Deploy Section */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                  Why deploy your own contracts?
                </h3>
                <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-400">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span><strong>Full ownership:</strong> You control all allocation rules and treasury operations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span><strong>Security:</strong> Only your wallet has admin access to your contracts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span><strong>Privacy:</strong> Your rules and data are isolated from other users</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Deployment Steps */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg dark:text-white flex items-center gap-2">
              <FileCode className="w-5 h-5" />
              Deployment Process
            </h3>

            <div className="space-y-3">
              {/* Step 1: Connect Wallet */}
              <div className="flex items-start gap-4 p-4 rounded-lg border dark:border-gray-700">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isConnected
                    ? 'bg-green-100 dark:bg-green-950/30 border-2 border-green-500'
                    : 'bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600'
                }`}>
                  {isConnected ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <span className="text-sm text-gray-600 dark:text-gray-400">1</span>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium dark:text-white">Connect Your Wallet</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {isConnected ? (
                      <>
                        Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
                        <br />
                        <span className={`inline-flex items-center gap-1 mt-2 px-2 py-1 rounded text-xs ${
                          chainId === ARC_TESTNET_CHAIN_ID
                            ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400'
                            : 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400'
                        }`}>
                          {chainId === ARC_TESTNET_CHAIN_ID ? (
                            <>✓ Arc Testnet</>
                          ) : (
                            <>⚠️ Wrong Network (Chain ID: {chainId})</>
                          )}
                        </span>
                      </>
                    ) : (
                      'Use the "Connect Wallet" button in the top right'
                    )}
                  </p>
                </div>
              </div>

              {/* Step 2: Deploy TreasuryCore */}
              <div className="flex items-start gap-4 p-4 rounded-lg border dark:border-gray-700">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  deployedTreasuryAddress
                    ? 'bg-green-100 dark:bg-green-950/30 border-2 border-green-500'
                    : deploymentStep === 'deploying-treasury'
                    ? 'bg-blue-100 dark:bg-blue-950/30 border-2 border-blue-500'
                    : 'bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600'
                }`}>
                  {deployedTreasuryAddress ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                  ) : deploymentStep === 'deploying-treasury' ? (
                    <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
                  ) : (
                    <span className="text-sm text-gray-600 dark:text-gray-400">2</span>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium dark:text-white">Deploy TreasuryCore Contract</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {deploymentStep === 'deploying-treasury' && isWaitingForDeploy
                      ? 'Deploying TreasuryCore... This may take 5-10 seconds'
                      : deploymentStep === 'deploying-treasury'
                      ? 'Waiting for wallet confirmation...'
                      : 'Your personal treasury with multi-signature support'}
                  </p>
                  {deployedTreasuryAddress && (
                    <div className="mt-3 flex items-center gap-2">
                      <code className="text-xs bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded flex-1 truncate">
                        {deployedTreasuryAddress}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyAddress('treasury')}
                        className="h-8"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3: Deploy RuleEngine */}
              <div className="flex items-start gap-4 p-4 rounded-lg border dark:border-gray-700">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  deployedRuleEngineAddress
                    ? 'bg-green-100 dark:bg-green-950/30 border-2 border-green-500'
                    : deploymentStep === 'deploying-ruleengine'
                    ? 'bg-blue-100 dark:bg-blue-950/30 border-2 border-blue-500'
                    : 'bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600'
                }`}>
                  {deployedRuleEngineAddress ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                  ) : deploymentStep === 'deploying-ruleengine' ? (
                    <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
                  ) : (
                    <span className="text-sm text-gray-600 dark:text-gray-400">3</span>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium dark:text-white">Deploy RuleEngine Contract</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {deploymentStep === 'deploying-ruleengine' && isWaitingForDeploy
                      ? 'Deploying RuleEngine... This may take 5-10 seconds'
                      : deploymentStep === 'deploying-ruleengine'
                      ? 'Waiting for wallet confirmation...'
                      : 'Automated allocation rules engine (deploys after TreasuryCore)'}
                  </p>
                  {deployedRuleEngineAddress && (
                    <div className="mt-3 flex items-center gap-2">
                      <code className="text-xs bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded flex-1 truncate">
                        {deployedRuleEngineAddress}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyAddress('ruleengine')}
                        className="h-8"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator className="dark:bg-gray-700" />

          {/* Action Buttons */}
          <div className="space-y-4">
            {deploymentStep === 'idle' && (
              <>
                <Button
                  onClick={handleDeploy}
                  size="lg"
                  className="w-full"
                  disabled={!isConnected || isDeploying || chainId !== ARC_TESTNET_CHAIN_ID}
                >
                  {isDeploying ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Confirm in Wallet...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-5 h-5 mr-2" />
                      Deploy My Contracts
                    </>
                  )}
                </Button>
                {isConnected && chainId !== ARC_TESTNET_CHAIN_ID && (
                  <p className="text-sm text-orange-600 dark:text-orange-400 text-center">
                    ⚠️ Please switch to Arc Testnet (Chain ID: {ARC_TESTNET_CHAIN_ID}) in your wallet to deploy
                  </p>
                )}
              </>
            )}

            {(deploymentStep === 'deploying-treasury' || deploymentStep === 'deploying-ruleengine') && (
              <div className="space-y-3">
                <Button size="lg" className="w-full" disabled>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {isWaitingForDeploy
                    ? deploymentStep === 'deploying-treasury'
                      ? 'Deploying TreasuryCore (Step 1/2)...'
                      : 'Deploying RuleEngine (Step 2/2)...'
                    : 'Confirm in Your Wallet...'}
                </Button>
                {isWaitingForDeploy && deployHash && (
                  <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                    <a
                      href={getExplorerUrl(deployHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      View {deploymentStep === 'deploying-treasury' ? 'TreasuryCore' : 'RuleEngine'} deployment
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {deploymentStep === 'completed' && (
              <Button
                onClick={handleComplete}
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Continue to Dashboard
              </Button>
            )}

            {/* Cost Estimate */}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Zap className="w-4 h-4" />
              <span>Estimated gas cost: ~1-2 USDC total (2 deployments on Arc Testnet)</span>
            </div>

            {/* Manual Entry Option */}
            {deploymentStep === 'idle' && (
              <div className="pt-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setManualMode(!manualMode)}
                  className="mx-auto text-sm text-gray-600 dark:text-gray-400"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {manualMode ? 'Hide Manual Entry' : 'Already deployed? Enter addresses manually'}
                </Button>
              </div>
            )}

            {manualMode && deploymentStep === 'idle' && (
              <div className="space-y-4 pt-4">
                <Separator className="dark:bg-gray-700" />
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm dark:text-white flex items-center gap-2">
                    <Edit className="w-4 h-4" />
                    Enter Deployed Contract Addresses
                  </h4>
                  <div>
                    <Label htmlFor="manual-treasury" className="dark:text-gray-200">
                      TreasuryCore Address
                    </Label>
                    <Input
                      id="manual-treasury"
                      placeholder="0x..."
                      value={manualTreasuryAddress}
                      onChange={(e) => setManualTreasuryAddress(e.target.value)}
                      className="mt-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="manual-ruleengine" className="dark:text-gray-200">
                      RuleEngine Address
                    </Label>
                    <Input
                      id="manual-ruleengine"
                      placeholder="0x..."
                      value={manualRuleEngineAddress}
                      onChange={(e) => setManualRuleEngineAddress(e.target.value)}
                      className="mt-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-sm"
                    />
                  </div>
                  <Button
                    onClick={handleManualSave}
                    size="lg"
                    variant="outline"
                    className="w-full dark:border-gray-600"
                  >
                    <Check className="w-5 h-5 mr-2" />
                    Save Contract Addresses
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Info Banner */}
          <div className="flex items-start gap-3 p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-xl">
            <AlertCircle className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-purple-800 dark:text-purple-300">
              <p className="font-semibold mb-1">Two-Step Deployment Process</p>
              <p>
                First, we'll deploy your TreasuryCore (multi-sig treasury), then automatically deploy your RuleEngine using the TreasuryCore address.
                Both contracts will be saved to your browser for future use.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

