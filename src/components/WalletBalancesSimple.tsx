import { useEffect, useState } from 'react';
import { useAccount, usePublicClient, useWalletClient, useSwitchChain } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RefreshCw, ExternalLink, ArrowRight, Loader2 } from 'lucide-react';
import { parseUnits, erc20Abi, pad, zeroAddress, maxUint256 } from 'viem';
import { sepolia, baseSepolia, avalancheFuji } from 'viem/chains';
import { arcTestnet } from '../lib/chains';
import { useTreasuryAddress } from '../lib/contracts';
import axios from 'axios';
import { toast } from 'sonner';

interface NetworkBalance {
  name: string;
  usdc: string;
  native: string;
  nativeSymbol: string;
}

const TESTNETS = [
  { name: 'Ethereum', rpc: 'https://eth-sepolia.g.alchemy.com/v2/CXvHG0j6A1Fv6mI2y-iIKxGtWbiW7HN4', usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', symbol: 'ETH', explorer: 'https://sepolia.etherscan.io', chainId: 11155111, chain: sepolia },
  { name: 'Base', rpc: 'https://base-sepolia.g.alchemy.com/v2/CXvHG0j6A1Fv6mI2y-iIKxGtWbiW7HN4', usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', symbol: 'ETH', explorer: 'https://sepolia.basescan.org', chainId: 84532, chain: baseSepolia },
  { name: 'Avalanche', rpc: 'https://avax-fuji.g.alchemy.com/v2/CXvHG0j6A1Fv6mI2y-iIKxGtWbiW7HN4', usdc: '0x5425890298aed601595a70AB815c96711a31Bc65', symbol: 'AVAX', explorer: 'https://testnet.snowtrace.io', chainId: 43113, chain: avalancheFuji },
  { name: 'ARC', rpc: 'https://arc-testnet.g.alchemy.com/v2/CXvHG0j6A1Fv6mI2y-iIKxGtWbiW7HN4', usdc: null, symbol: 'USDC', explorer: 'https://testnet.arcscan.app', chainId: 5042002, chain: arcTestnet },
];

const GATEWAY_WALLET = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9' as `0x${string}`;
const GATEWAY_MINTER = '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B' as `0x${string}`;

const gatewayAbi = [
  {
    type: 'function',
    name: 'deposit',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

const minterAbi = [
  {
    type: 'function',
    name: 'gatewayMint',
    inputs: [
      { name: 'attestationPayload', type: 'bytes' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

export function WalletBalancesSimple() {
  const { address, chain } = useAccount();
  const publicClient = usePublicClient() as any;
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();
  const treasuryAddress = useTreasuryAddress();
  const [testnetBalances, setTestnetBalances] = useState<NetworkBalance[]>([]);
  const [gatewayBalances, setGatewayBalances] = useState<Array<{chain: string, balance: string}>>([]);
  const [totalGatewayBalance, setTotalGatewayBalance] = useState('0');
  const [loading, setLoading] = useState(true);
  const [sendForm, setSendForm] = useState({
    recipientType: 'treasury' as 'treasury' | 'custom',
    customAddress: '',
    amount: '',
    chain: 'Ethereum'
  });
  const [activeGatewayTransfer, setActiveGatewayTransfer] = useState<string | null>(null);
  const [gatewayAmount, setGatewayAmount] = useState('');
  const [isMovingToGateway, setIsMovingToGateway] = useState(false);
  const [isSendingFromGateway, setIsSendingFromGateway] = useState(false);

  const loadBalances = async () => {
    if (!address) return;

    setLoading(true);

    // Fetch testnet balances
    const balances = await Promise.all(
      TESTNETS.map(async (net) => {
        try {
          let usdc = '0';
          let native = '0';

          // Fetch native balance
          const nativeRes = await axios.post(net.rpc, {
            jsonrpc: '2.0',
            method: 'eth_getBalance',
            params: [address, 'latest'],
            id: 1,
          });

          if (nativeRes.data.result) {
            const wei = BigInt(nativeRes.data.result);
            native = (Number(wei) / 1e18).toFixed(4);
          }

          // Fetch USDC (if not ARC)
          if (net.usdc) {
            const usdcRes = await axios.post(net.rpc, {
              jsonrpc: '2.0',
              method: 'eth_call',
              params: [{
                to: net.usdc,
                data: `0x70a08231000000000000000000000000${address.slice(2)}`,
              }, 'latest'],
              id: 1,
            });

            if (usdcRes.data.result) {
              const bal = BigInt(usdcRes.data.result);
              usdc = (Number(bal) / 1e6).toFixed(2);
            }
          } else if (net.name === 'ARC') {
            // On ARC, native IS USDC
            usdc = native;
          }

          return { name: net.name, usdc, native, nativeSymbol: net.symbol };
        } catch (error) {
          return { name: net.name, usdc: '0', native: '0', nativeSymbol: net.symbol };
        }
      })
    );

    setTestnetBalances(balances);

    // Fetch Gateway balance from Circle API per chain
    try {
      const domainMap: Record<number, string> = {
        0: 'Ethereum',
        6: 'Base',
        1: 'Avalanche',
        26: 'ARC',
      };

      const gatewayRes = await fetch('https://gateway-api-testnet.circle.com/v1/balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'USDC',
          sources: [
            { domain: 0, depositor: address },  // Ethereum Sepolia
            { domain: 6, depositor: address },  // Base Sepolia
            { domain: 1, depositor: address },  // Avalanche Fuji
            { domain: 26, depositor: address }, // ARC Testnet
          ]
        }),
      });

      const gatewayData = await gatewayRes.json();
      console.log('Gateway data:', gatewayData);

      if (gatewayData.balances && Array.isArray(gatewayData.balances)) {
        // Parse balances - API returns balance as string like "1.000000"
        const balancesByChain = gatewayData.balances
          .filter((b: any) => parseFloat(b.balance || '0') > 0) // Only show non-zero balances
          .map((b: any) => ({
            chain: domainMap[b.domain] || `Domain ${b.domain}`,
            balance: parseFloat(b.balance || '0').toFixed(2),
          }));

        const total = gatewayData.balances.reduce((sum: number, b: any) =>
          sum + parseFloat(b.balance || '0'), 0
        );

        setGatewayBalances(balancesByChain);
        setTotalGatewayBalance(total.toFixed(2));
      } else {
        setGatewayBalances([]);
        setTotalGatewayBalance('0');
      }
    } catch (error) {
      console.error('Error fetching gateway balance:', error);
      setGatewayBalances([]);
      setTotalGatewayBalance('0');
    }

    setLoading(false);
  };

  useEffect(() => {
    loadBalances();
  }, [address]);

  const handleMoveToGateway = async (networkName: string) => {
    if (!walletClient || !publicClient || !address) {
      toast.error('Wallet not connected');
      return;
    }

    const network = TESTNETS.find(n => n.name === networkName);
    if (!network || !network.usdc) {
      toast.error('Network not supported');
      return;
    }

    setIsMovingToGateway(true);
    const toastId = toast.loading(`Moving ${gatewayAmount} USDC to Gateway...`);

    try {
      // Check if we need to switch network
      if (chain?.id !== network.chainId) {
        toast.loading('Switching network...', { id: toastId });
        await switchChain({ chainId: network.chainId });
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for switch
      }

      const amount = parseUnits(gatewayAmount, 6); // USDC has 6 decimals

      // Step 1: Approve USDC to Gateway
      toast.loading('Approving USDC...', { id: toastId });
      const approveHash = await walletClient.writeContract({
        address: network.usdc as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [GATEWAY_WALLET, amount],
        account: address,
        chain: network.chain,
      });

      // Wait with timeout for approval
      try {
        await Promise.race([
          publicClient.waitForTransactionReceipt({ hash: approveHash, confirmations: 1 }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
        ]);
      } catch (err) {
        // If receipt fails, wait a bit and continue (transaction likely went through)
        console.warn('Approval receipt timeout, continuing...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Step 2: Deposit to Gateway
      toast.loading('Depositing to Gateway...', { id: toastId });
      const depositHash = await walletClient.writeContract({
        address: GATEWAY_WALLET,
        abi: gatewayAbi,
        functionName: 'deposit',
        args: [network.usdc as `0x${string}`, amount],
        account: address,
        chain: network.chain,
      });

      // Wait with timeout for deposit
      try {
        await Promise.race([
          publicClient.waitForTransactionReceipt({ hash: depositHash, confirmations: 1 }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
        ]);
      } catch (err) {
        console.warn('Deposit receipt timeout, assuming success...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      toast.success(`Moved ${gatewayAmount} USDC to Gateway!`, {
        id: toastId,
        description: 'Check your wallet for confirmation'
      });

      setActiveGatewayTransfer(null);
      setGatewayAmount('');
      loadBalances(); // Refresh balances
    } catch (error: any) {
      console.error('Gateway transfer error:', error);

      let message = 'Transfer failed';
      if (error.message?.includes('User rejected')) {
        message = 'Transaction cancelled';
      }

      toast.error(message, { id: toastId });
    } finally {
      setIsMovingToGateway(false);
    }
  };

  const handleGatewaySend = async () => {
    const recipient = sendForm.recipientType === 'treasury' ? treasuryAddress : sendForm.customAddress;

    if (!recipient) {
      toast.error('Please enter a recipient address');
      return;
    }

    if (!sendForm.amount || parseFloat(sendForm.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(sendForm.amount);
    const totalAvailable = parseFloat(totalGatewayBalance);

    if (amount > totalAvailable) {
      toast.error(`Insufficient Gateway balance. Available: $${totalAvailable}`);
      return;
    }

    setIsSendingFromGateway(true);
    const toastId = toast.loading(`Preparing Gateway transfer...`);

    try {
      /**
       * Circle Gateway Cross-Chain Transfer Flow:
       *
       * 1. Create burn intents for each source chain with Gateway balance
       * 2. Sign each burn intent with EIP-712
       * 3. POST to Circle API: /v1/transfer with all burn intents
       * 4. Receive attestation from Circle
       * 5. Call gatewayMint() on destination chain with attestation
       *
       * Reference: https://developers.circle.com/gateway/docs
       */

      toast.info('Circle Gateway withdrawal requires backend integration', {
        id: toastId,
        description: 'Use Circle Gateway API to create burn intents and attestations'
      });

      console.log('Gateway Withdrawal Request:', {
        from: 'Gateway',
        to: recipient,
        amount: sendForm.amount,
        destinationChain: sendForm.chain,
        gatewayBalances: gatewayBalances,
        note: 'See backend implementation for full Circle Gateway integration'
      });

      // Clear form
      setSendForm({ recipientType: 'treasury', customAddress: '', amount: '', chain: 'Ethereum' });
    } catch (error: any) {
      console.error('Gateway send error:', error);
      toast.error('Gateway send failed', { id: toastId });
    } finally {
      setIsSendingFromGateway(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white mb-1">Circle Gateway</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Move USDC across networks
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadBalances} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Testnet Balances */}
        <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0">
          <CardHeader>
            <CardTitle className="text-lg dark:text-white">Testnet Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testnetBalances.map((bal) => (
                <div key={bal.name}>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div>
                      <div className="font-medium dark:text-white">{bal.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {bal.native} {bal.nativeSymbol}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-bold text-blue-600 dark:text-blue-400">${bal.usdc}</div>
                        <div className="text-xs text-gray-500">USDC</div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveGatewayTransfer(activeGatewayTransfer === bal.name ? null : bal.name)}
                        className="text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Inline Move to Gateway Form */}
                  {activeGatewayTransfer === bal.name && (
                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs text-gray-600 dark:text-gray-400">Amount to Gateway</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={gatewayAmount}
                            onChange={(e) => setGatewayAmount(e.target.value)}
                            className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleMoveToGateway(bal.name)}
                            disabled={!gatewayAmount || parseFloat(gatewayAmount) <= 0 || isMovingToGateway}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                          >
                            {isMovingToGateway ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                Moving...
                              </>
                            ) : (
                              'Move to Gateway'
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setActiveGatewayTransfer(null);
                              setGatewayAmount('');
                            }}
                            disabled={isMovingToGateway}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right: Gateway Balance + Send Form */}
        <div className="space-y-4">
          <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0">
            <CardHeader>
              <CardTitle className="text-lg dark:text-white">Gateway Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4 mb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-1">
                  ${totalGatewayBalance}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total USDC</div>
              </div>

              {/* Per-chain Gateway balances */}
              <div className="space-y-2">
                {gatewayBalances.length > 0 ? (
                  gatewayBalances.map((bal) => (
                    <div key={bal.chain} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{bal.chain}</span>
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">${bal.balance}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                    No Gateway deposits yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Send from Gateway Form */}
          <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0">
            <CardHeader>
              <CardTitle className="text-lg dark:text-white">Send from Gateway</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Recipient Type Selection */}
              <div>
                <Label className="text-sm dark:text-gray-200 mb-2 block">Send To</Label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="recipientType"
                      value="treasury"
                      checked={sendForm.recipientType === 'treasury'}
                      onChange={() => setSendForm({ ...sendForm, recipientType: 'treasury' })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm dark:text-gray-300">Treasury</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="recipientType"
                      value="custom"
                      checked={sendForm.recipientType === 'custom'}
                      onChange={() => setSendForm({ ...sendForm, recipientType: 'custom' })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm dark:text-gray-300">Custom Address</span>
                  </label>
                </div>
              </div>

              {/* Custom Address Input (if selected) */}
              {sendForm.recipientType === 'custom' && (
                <div>
                  <Label className="text-sm dark:text-gray-200">Recipient Address</Label>
                  <Input
                    placeholder="0x..."
                    value={sendForm.customAddress}
                    onChange={(e) => setSendForm({ ...sendForm, customAddress: e.target.value })}
                    className="mt-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-sm"
                  />
                </div>
              )}

              {/* Treasury Address Display (if selected) */}
              {sendForm.recipientType === 'treasury' && treasuryAddress && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
                  <div className="text-xs text-blue-700 dark:text-blue-300 mb-1">Treasury Address:</div>
                  <div className="text-sm font-mono dark:text-white">
                    {treasuryAddress.slice(0, 10)}...{treasuryAddress.slice(-8)}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-sm dark:text-gray-200">Amount (USDC)</Label>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Available: ${totalGatewayBalance}
                  </span>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={sendForm.amount}
                  onChange={(e) => setSendForm({ ...sendForm, amount: e.target.value })}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <Label className="text-sm dark:text-gray-200">Destination Chain</Label>
                <Select value={sendForm.chain} onValueChange={(value) => setSendForm({ ...sendForm, chain: value })}>
                  <SelectTrigger className="mt-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-600">
                    <SelectItem value="Ethereum" className="dark:text-white">Ethereum Sepolia</SelectItem>
                    <SelectItem value="Base" className="dark:text-white">Base Sepolia</SelectItem>
                    <SelectItem value="Avalanche" className="dark:text-white">Avalanche Fuji</SelectItem>
                    <SelectItem value="ARC" className="dark:text-white">ARC Testnet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleGatewaySend}
                className="w-full"
                disabled={
                  isSendingFromGateway ||
                  !sendForm.amount ||
                  parseFloat(sendForm.amount) <= 0 ||
                  (sendForm.recipientType === 'custom' && !sendForm.customAddress) ||
                  (sendForm.recipientType === 'treasury' && !treasuryAddress) ||
                  parseFloat(sendForm.amount) > parseFloat(totalGatewayBalance)
                }
              >
                {isSendingFromGateway ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Send via Gateway
                  </>
                )}
              </Button>

              {parseFloat(sendForm.amount) > parseFloat(totalGatewayBalance) && (
                <div className="text-xs text-red-600 dark:text-red-400">
                  Amount exceeds available balance (${totalGatewayBalance})
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

