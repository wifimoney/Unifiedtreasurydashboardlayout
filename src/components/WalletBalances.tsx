import { useEffect, useState } from 'react';
import { useAccount, useWalletClient, usePublicClient, useSwitchChain } from 'wagmi';
import { parseUnits, erc20Abi } from 'viem';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Wallet, RefreshCw, ArrowUpRight, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import axios from 'axios';

interface ChainBalance {
  chain: string;
  network: string;
  domain: number;
  usdcBalance: string;
  nativeBalance: string;
  nativeToken: string;
  explorerUrl: string;
  chainId: string;
}

// Gateway Wallet ABI (partial - only the functions we need)
const gatewayWalletAbi = [
  {
    type: 'function',
    name: 'deposit',
    inputs: [
      {
        name: 'token',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'value',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

// Gateway Wallet contract address (same on all chains)
const GATEWAY_WALLET_ADDRESS = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9' as const;

const CHAIN_CONFIGS = [
  {
    name: 'Ethereum Sepolia',
    network: 'Testnet',
    domain: 0,
    chainId: '11155111',
    nativeToken: 'ETH',
    explorerUrl: 'https://sepolia.etherscan.io',
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/CXvHG0j6A1Fv6mI2y-iIKxGtWbiW7HN4',
    usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  },
  {
    name: 'Optimism Sepolia',
    network: 'Testnet',
    domain: 2,
    chainId: '11155420',
    nativeToken: 'ETH',
    explorerUrl: 'https://sepolia-optimism.etherscan.io',
    rpcUrl: 'https://opt-sepolia.g.alchemy.com/v2/CXvHG0j6A1Fv6mI2y-iIKxGtWbiW7HN4',
    usdcAddress: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
  },
  {
    name: 'Polygon Amoy',
    network: 'Testnet',
    domain: 6,
    chainId: '80002',
    nativeToken: 'MATIC',
    explorerUrl: 'https://amoy.polygonscan.com',
    rpcUrl: 'https://polygon-amoy.g.alchemy.com/v2/CXvHG0j6A1Fv6mI2y-iIKxGtWbiW7HN4',
    usdcAddress: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
  },
  {
    name: 'Arbitrum Sepolia',
    network: 'Testnet',
    domain: 3,
    chainId: '421614',
    nativeToken: 'ETH',
    explorerUrl: 'https://sepolia.arbiscan.io',
    rpcUrl: 'https://arb-sepolia.g.alchemy.com/v2/CXvHG0j6A1Fv6mI2y-iIKxGtWbiW7HN4',
    usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  },
  {
    name: 'Base Sepolia',
    network: 'Testnet',
    domain: 6,
    chainId: '84532',
    nativeToken: 'ETH',
    explorerUrl: 'https://sepolia.basescan.org',
    rpcUrl: 'https://base-sepolia.g.alchemy.com/v2/CXvHG0j6A1Fv6mI2y-iIKxGtWbiW7HN4',
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  },
  {
    name: 'Avalanche Fuji',
    network: 'Testnet',
    domain: 1,
    chainId: '43113',
    nativeToken: 'AVAX',
    explorerUrl: 'https://testnet.snowtrace.io',
    rpcUrl: 'https://avax-fuji.g.alchemy.com/v2/CXvHG0j6A1Fv6mI2y-iIKxGtWbiW7HN4',
    usdcAddress: '0x5425890298aed601595a70AB815c96711a31Bc65',
  },
  {
    name: 'ARC Testnet',
    network: 'Testnet',
    domain: 26,
    chainId: '5042002',
    nativeToken: 'USDC',
    explorerUrl: 'https://testnet.arcscan.app',
    rpcUrl: 'https://arc-testnet.g.alchemy.com/v2/x9KWnxVYhNfjC0Yr8llKf',
    usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  },
];

export function WalletBalances() {
  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { switchChain } = useSwitchChain();
  const [balances, setBalances] = useState<ChainBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedChain, setSelectedChain] = useState<ChainBalance | null>(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferStep, setTransferStep] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [wrongChain, setWrongChain] = useState(false);

  const fetchBalances = async () => {
    if (!address) return;

    setLoading(true);
    try {
      const balancePromises = CHAIN_CONFIGS.map(async (config: any) => {
        try {
          let usdcBalance = '0';
          let nativeBalance = '0';

          // For ARC Testnet, USDC is the native token (used via eth_getBalance)
          if (config.name === 'ARC Testnet') {
            try {
              const balanceResponse = await axios.post(config.rpcUrl, {
                jsonrpc: '2.0',
                method: 'eth_getBalance',
                params: [address, 'latest'],
                id: 1,
              });

              const balanceHex = balanceResponse.data.result;
              if (balanceHex && balanceHex !== '0x') {
                const balanceWei = BigInt(balanceHex);
                // On ARC, native balance is still in 18 decimals (like ETH) even though it's USDC
                const balanceUsdc = Number(balanceWei) / 1e18;
                nativeBalance = balanceUsdc.toFixed(6);
                usdcBalance = balanceUsdc.toFixed(2); // Same value for display
              }
            } catch (error) {
              console.error(`Error fetching ARC balance for ${config.name}:`, error);
            }
          } else {
            // For other chains, fetch USDC from ERC20 contract
            if (config.usdcAddress) {
              try {
                const balanceResponse = await axios.post(config.rpcUrl, {
                  jsonrpc: '2.0',
                  method: 'eth_call',
                  params: [
                    {
                      to: config.usdcAddress,
                      data: `0x70a08231000000000000000000000000${address?.slice(2)}`, // balanceOf(address)
                    },
                    'latest',
                  ],
                  id: 1,
                });

                const balanceHex = balanceResponse.data.result;
                if (balanceHex && balanceHex !== '0x') {
                  const balanceWei = BigInt(balanceHex);
                  const balanceUsdc = Number(balanceWei) / 1e6; // USDC has 6 decimals
                  usdcBalance = balanceUsdc.toFixed(2);
                }
              } catch (error) {
                console.error(`USDC balance error for ${config.name}:`, error);
              }
            }

            // Fetch native token balance (ETH, MATIC, AVAX, etc.)
            try {
              const balanceResponse = await axios.post(config.rpcUrl, {
                jsonrpc: '2.0',
                method: 'eth_getBalance',
                params: [address, 'latest'],
                id: 1,
              });

              const balanceHex = balanceResponse.data.result;
              if (balanceHex && balanceHex !== '0x') {
                const balanceWei = BigInt(balanceHex);
                const balanceEther = Number(balanceWei) / 1e18;
                nativeBalance = balanceEther.toFixed(6);
              }
            } catch (error) {
              console.error(`Error fetching native balance for ${config.name}:`, error);
            }
          }

          return {
            chain: config.name,
            network: config.network,
            domain: config.domain,
            usdcBalance,
            nativeBalance,
            nativeToken: config.nativeToken,
            explorerUrl: config.explorerUrl,
            chainId: config.chainId,
          };
        } catch (error) {
          console.error(`Error fetching balance for ${config.name}:`, error);
          return {
            chain: config.name,
            network: config.network,
            domain: config.domain,
            usdcBalance: '0',
            nativeBalance: '0',
            nativeToken: config.nativeToken,
            explorerUrl: config.explorerUrl,
            chainId: config.chainId,
          };
        }
      });

      const results = await Promise.all(balancePromises);
      setBalances(results);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching wallet balances:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && address) {
      fetchBalances();
    }
  }, [isConnected, address]);

  const openTransferModal = (chainBalance: ChainBalance) => {
    setSelectedChain(chainBalance);
    setTransferAmount('');
    setValidationError(null);
    setWrongChain(false);
    setTransferModalOpen(true);
  };

  const closeTransferModal = () => {
    setTransferModalOpen(false);
    setSelectedChain(null);
    setTransferAmount('');
    setValidationError(null);
    setTransferStep('');
    setWrongChain(false);
  };

  const handleSwitchChain = async () => {
    if (!selectedChain) return;

    const chainConfig = CHAIN_CONFIGS.find(c => c.name === selectedChain.chain);
    if (!chainConfig) return;

    try {
      await switchChain({ chainId: parseInt(chainConfig.chainId) });
      setWrongChain(false);
      setValidationError(null);
    } catch (error) {
      console.error('Error switching chain:', error);
      setValidationError('Failed to switch network. Please switch manually in your wallet.');
    }
  };

  // Check if we're on the correct chain whenever chain or selectedChain changes
  useEffect(() => {
    if (!selectedChain || !transferModalOpen) return;

    const chainConfig = CHAIN_CONFIGS.find(c => c.name === selectedChain.chain);
    if (!chainConfig) return;

    const isCorrectChain = chain?.id.toString() === chainConfig.chainId;

    console.log('Chain check:', {
      currentChainId: chain?.id.toString(),
      requiredChainId: chainConfig.chainId,
      selectedChain: selectedChain.chain,
      isCorrectChain,
      wrongChain
    });

    if (!isCorrectChain) {
      console.log('Setting wrongChain to TRUE');
      setWrongChain(true);
      setValidationError(`Please switch to ${selectedChain.chain} network`);
    } else {
      console.log('Setting wrongChain to FALSE');
      setWrongChain(false);
      if (validationError === `Please switch to ${selectedChain.chain} network`) {
        setValidationError(null);
      }
    }
  }, [chain, selectedChain, transferModalOpen]);

  const validateTransfer = (): boolean => {
    if (!selectedChain) return false;

    // First check if we're on the wrong chain
    const chainConfig = CHAIN_CONFIGS.find(c => c.name === selectedChain.chain);
    if (chainConfig && chain?.id.toString() !== chainConfig.chainId) {
      setWrongChain(true);
      setValidationError(`Please switch to ${selectedChain.chain} network`);
      return false;
    }

    const amount = parseFloat(transferAmount);

    if (isNaN(amount) || amount <= 0) {
      setValidationError('Please enter a valid amount');
      setWrongChain(false);
      return false;
    }

    // Get available USDC balance
    const usdcBalance = selectedChain.chain === 'ARC Testnet'
      ? parseFloat(selectedChain.nativeBalance || '0')
      : parseFloat(selectedChain.usdcBalance || '0');

    if (amount > usdcBalance) {
      setValidationError(`Insufficient USDC balance. Available: ${usdcBalance.toFixed(6)} USDC`);
      setWrongChain(false);
      return false;
    }

    // Validate gas balance (native token)
    const nativeBalance = parseFloat(selectedChain.nativeBalance || '0');
    const minGasRequired = 0.001; // Minimum gas required for transaction

    if (selectedChain.chain !== 'ARC Testnet' && nativeBalance < minGasRequired) {
      setValidationError(`Insufficient ${selectedChain.nativeToken} for gas. Need at least ${minGasRequired} ${selectedChain.nativeToken}`);
      setWrongChain(false);
      return false;
    }

    setValidationError(null);
    setWrongChain(false);
    return true;
  };

  const handleTransferToGateway = async () => {
    if (!validateTransfer()) return;
    if (!walletClient || !publicClient || !address) {
      setValidationError('Wallet not connected');
      return;
    }
    if (!selectedChain) return;

    setTransferring(true);
    setValidationError(null);
    setTransferStep('');

    try {
      // Get the chain config
      const chainConfig = CHAIN_CONFIGS.find(c => c.name === selectedChain.chain);
      if (!chainConfig) {
        throw new Error('Chain configuration not found');
      }

      // Check if we're on the correct chain
      if (chain?.id.toString() !== chainConfig.chainId) {
        setWrongChain(true);
        setValidationError(`Please switch to ${selectedChain.chain} network`);
        setTransferring(false);
        return;
      }

      // Special handling for ARC Testnet (USDC is native token)
      if (selectedChain.chain === 'ARC Testnet') {
        // On ARC, USDC is the native gas token (18 decimals in EVM)
        const amount = parseUnits(transferAmount, 18);

        setTransferStep('Depositing USDC to Gateway...');
        console.log('Depositing native USDC to Gateway Wallet on ARC...');

        // On ARC, we use the deposit function with the native USDC token address
        const depositHash = await walletClient.writeContract({
          address: GATEWAY_WALLET_ADDRESS,
          abi: gatewayWalletAbi,
          functionName: 'deposit',
          args: [chainConfig.usdcAddress as `0x${string}`, amount],
          value: amount, // Send native USDC as value
        });

        console.log('Deposit transaction sent:', depositHash);

        setTransferStep('Waiting for confirmation...');
        console.log('Waiting for deposit confirmation...');

        await publicClient.waitForTransactionReceipt({ hash: depositHash });

        setTransferStep('Transfer complete!');
        console.log('Transfer to gateway completed successfully on ARC!');
      } else {
        // For other chains, USDC is an ERC20 token (6 decimals)
        const usdcAddress = chainConfig.usdcAddress as `0x${string}`;
        const amount = parseUnits(transferAmount, 6);

        setTransferStep('Approving Gateway Wallet...');
        console.log('Step 1: Approving Gateway Wallet to transfer USDC...');

        // Step 1: Approve the Gateway Wallet to transfer USDC
        const approvalHash = await walletClient.writeContract({
          address: usdcAddress,
          abi: erc20Abi,
          functionName: 'approve',
          args: [GATEWAY_WALLET_ADDRESS, amount],
        });

        console.log('Approval transaction sent:', approvalHash);

        setTransferStep('Waiting for approval confirmation...');
        console.log('Waiting for approval confirmation...');

        // Wait for approval transaction to be mined
        await publicClient.waitForTransactionReceipt({ hash: approvalHash });

        setTransferStep('Depositing USDC to Gateway...');
        console.log('Step 2: Depositing USDC to Gateway Wallet...');

        // Step 2: Call deposit on the Gateway Wallet contract
        const depositHash = await walletClient.writeContract({
          address: GATEWAY_WALLET_ADDRESS,
          abi: gatewayWalletAbi,
          functionName: 'deposit',
          args: [usdcAddress, amount],
        });

        console.log('Deposit transaction sent:', depositHash);

        setTransferStep('Waiting for deposit confirmation...');
        console.log('Waiting for deposit confirmation...');

        // Wait for deposit transaction to be mined
        await publicClient.waitForTransactionReceipt({ hash: depositHash });

        setTransferStep('Transfer complete!');
        console.log('Transfer to gateway completed successfully!');
      }

      // Close form after successful transfer
      closeTransferModal();

      // Refresh balances
      await fetchBalances();
    } catch (error: any) {
      console.error('Transfer error:', error);

      // Parse error message for user-friendly display
      let errorMessage = 'Transfer failed. Please try again.';
      if (error?.message) {
        if (error.message.includes('User rejected')) {
          errorMessage = 'Transaction rejected by user';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for transaction';
        } else if (error.message.includes('gas')) {
          errorMessage = 'Insufficient gas to complete transaction';
        }
      }

      setValidationError(errorMessage);
    } finally {
      setTransferring(false);
      setTransferStep('');
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-xl max-w-md">
          <CardContent className="pt-6 text-center">
            <Wallet className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Connect Your Wallet
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Connect your wallet to view your balances across all testnet chains
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalUsdc = balances.reduce((sum, b) => sum + parseFloat(b.usdcBalance || '0'), 0);

  // Chains supported by Circle Gateway
  const gatewaySupported = ['ARC Testnet', 'Avalanche Fuji', 'Base Sepolia', 'Ethereum Sepolia'];

  return (
    <div className="space-y-6">
      {/* Transfer Form - Shows at top when active */}
      {transferModalOpen && selectedChain && (
        <Card className="dark:bg-gray-800 dark:border-gray-700 border-0 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Move USDC to Gateway</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Transfer USDC from {selectedChain.chain} to Circle Gateway
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeTransferModal}
                className="dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Chain Info */}
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">From Chain</p>
              <p className="font-semibold dark:text-white">{selectedChain.chain}</p>
            </div>

            {/* Available Balance */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Available USDC:</span>
              <span className="font-semibold dark:text-white">
                ${selectedChain.chain === 'ARC Testnet'
                  ? parseFloat(selectedChain.nativeBalance || '0').toFixed(2)
                  : parseFloat(selectedChain.usdcBalance || '0').toFixed(2)}
              </span>
            </div>

            {/* Gas Balance Warning */}
            {selectedChain.chain !== 'ARC Testnet' && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Gas ({selectedChain.nativeToken}):</span>
                <span className={`font-semibold ${parseFloat(selectedChain.nativeBalance || '0') < 0.001 ? 'text-red-500' : 'dark:text-white'}`}>
                  {parseFloat(selectedChain.nativeBalance || '0').toFixed(6)} {selectedChain.nativeToken}
                </span>
              </div>
            )}

            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USDC)</Label>
              <div className="flex gap-2">
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={transferAmount}
                  onChange={(e) => {
                    setTransferAmount(e.target.value);
                    setValidationError(null);
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const maxAmount = selectedChain.chain === 'ARC Testnet'
                      ? selectedChain.nativeBalance || '0'
                      : selectedChain.usdcBalance || '0';
                    setTransferAmount(maxAmount);
                    setValidationError(null);
                  }}
                >
                  Max
                </Button>
              </div>
            </div>

            {/* Validation Error */}
            {validationError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span>{validationError}</span>
                  {(() => {
                    console.log('Rendering error div, wrongChain:', wrongChain);
                    return wrongChain ? (
                      <Button
                        size="sm"
                        onClick={handleSwitchChain}
                        className="bg-red-600 hover:bg-red-700 text-white shrink-0"
                      >
                        Switch Network
                      </Button>
                    ) : null;
                  })()}
                </div>
              </div>
            )}

            {/* Transfer Progress */}
            {transferring && transferStep && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 p-3 rounded-lg text-sm flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{transferStep}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={closeTransferModal}
                disabled={transferring}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleTransferToGateway}
                disabled={transferring || !transferAmount || parseFloat(transferAmount) <= 0 || wrongChain}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {transferring ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    Transfer to Gateway
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header Card */}
      <Card className="dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 bg-gradient-to-br from-white to-gray-50 border-0 shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl mb-2">My Wallet Balances</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
              {lastUpdate && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total USDC</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  ${totalUsdc.toFixed(2)}
                </p>
              </div>
              <Button
                onClick={fetchBalances}
                disabled={loading}
                variant="outline"
                size="icon"
                className="dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Balances Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {balances.map((balance) => (
          <Card
            key={balance.chain}
            className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-lg hover:shadow-xl transition-shadow"
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{balance.chain}</span>
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                  {balance.network}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {balance.chain === 'ARC Testnet' ? (
                // For ARC, USDC is the native gas token
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {balance.nativeToken} Balance (Gas Token)
                  </p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    ${parseFloat(balance.nativeBalance || '0').toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    USDC is used for gas on ARC
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">USDC Balance</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      ${parseFloat(balance.usdcBalance || '0').toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {balance.nativeToken} Balance (Gas)
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {parseFloat(balance.nativeBalance || '0').toFixed(6)} {balance.nativeToken}
                    </p>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between pt-2">
                <a
                  href={`${balance.explorerUrl}/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  View on Explorer →
                </a>
                {gatewaySupported.includes(balance.chain) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openTransferModal(balance)}
                    className="text-xs h-7 dark:border-gray-600 dark:hover:bg-gray-700"
                  >
                    <ArrowUpRight className="w-3 h-3 mr-1" />
                    Move to Gateway
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading && balances.length === 0 && (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400">Loading balances...</p>
        </div>
      )}
    </div>
  );
}
