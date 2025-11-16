import { useState, useEffect } from 'react';
import { useAccount, useSwitchChain, useSendTransaction, useWaitForTransactionReceipt, useBalance, useEstimateGas } from 'wagmi';
import { parseEther, parseUnits, formatUnits } from 'viem';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { X, AlertCircle, Check, Loader2, ExternalLink, Fuel } from 'lucide-react';
import { NETWORK_CONFIGS, getNetworkByChainId } from '../lib/walletApi';
import { arcTestnet } from '../lib/chains';
import { sepolia, avalancheFuji, baseSepolia } from 'viem/chains';
import { contracts } from '../lib/contracts';

interface SendModalProps {
  open: boolean;
  onClose: () => void;
}

// Map chain IDs to viem chain objects
const CHAIN_MAP: Record<number, any> = {
  [arcTestnet.id]: arcTestnet,
  [sepolia.id]: sepolia,
  [avalancheFuji.id]: avalancheFuji,
  [baseSepolia.id]: baseSepolia,
};

export function SendModal({ open, onClose }: SendModalProps) {
  const { address, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { sendTransaction, data: txHash, isPending, isSuccess, error } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const [recipientType, setRecipientType] = useState<'treasury' | 'custom'>('treasury');
  const [customRecipient, setCustomRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedNetworkId, setSelectedNetworkId] = useState<number>(chain?.id || arcTestnet.id);
  const [networkSwitching, setNetworkSwitching] = useState(false);
  const [formError, setFormError] = useState('');
  const [estimatedGas, setEstimatedGas] = useState<bigint | null>(null);

  const selectedNetwork = getNetworkByChainId(selectedNetworkId);
  const needsNetworkSwitch = chain?.id !== selectedNetworkId;

  // Get recipient address based on type
  const recipient = recipientType === 'treasury' ? contracts.TreasuryCore.address : customRecipient;

  // Fetch user's balance on selected network
  const { data: balanceData } = useBalance({
    address: address,
    chainId: selectedNetworkId,
  });

  const availableBalance = balanceData ? parseFloat(formatUnits(balanceData.value, balanceData.decimals)) : 0;

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setRecipientType('treasury');
      setCustomRecipient('');
      setAmount('');
      setFormError('');
      setEstimatedGas(null);
    }
  }, [open]);

  // Estimate gas when amount and recipient change
  useEffect(() => {
    if (amount && recipient && !needsNetworkSwitch && selectedNetwork) {
      try {
        const value = parseUnits(amount, selectedNetwork.nativeCurrency.decimals);
        // Simple gas estimation (21000 for basic transfer)
        setEstimatedGas(21000n);
      } catch (e) {
        setEstimatedGas(null);
      }
    } else {
      setEstimatedGas(null);
    }
  }, [amount, recipient, needsNetworkSwitch, selectedNetwork]);

  // Update selected network when chain changes
  useEffect(() => {
    if (chain?.id) {
      setSelectedNetworkId(chain.id);
    }
  }, [chain?.id]);

  const handleSwitchNetwork = async () => {
    if (!selectedNetwork) return;

    setNetworkSwitching(true);
    try {
      const targetChain = CHAIN_MAP[selectedNetworkId];
      if (targetChain) {
        await switchChain({ chainId: selectedNetworkId });
      }
    } catch (error) {
      console.error('Failed to switch network:', error);
      setFormError('Failed to switch network. Please try again.');
    } finally {
      setNetworkSwitching(false);
    }
  };

  const validateForm = () => {
    // Check recipient for custom type
    if (recipientType === 'custom') {
      if (!customRecipient) {
        setFormError('Please enter a recipient address');
        return false;
      }

      if (!customRecipient.match(/^0x[a-fA-F0-9]{40}$/)) {
        setFormError('Invalid recipient address format');
        return false;
      }
    }

    // Check amount
    if (!amount || parseFloat(amount) <= 0) {
      setFormError('Please enter a valid amount');
      return false;
    }

    const amountNum = parseFloat(amount);

    // Check if amount exceeds balance
    if (amountNum > availableBalance) {
      setFormError(`Insufficient balance. Available: ${availableBalance.toFixed(6)} ${selectedNetwork?.nativeCurrency.symbol}`);
      return false;
    }

    // Check if amount is too small
    if (amountNum < 0.000001) {
      setFormError('Amount is too small');
      return false;
    }

    // Estimate gas cost and check if user has enough for gas + amount
    if (estimatedGas && selectedNetwork) {
      const gasPrice = 20000000000n; // 20 gwei estimate
      const estimatedGasCost = parseFloat(formatUnits(estimatedGas * gasPrice, selectedNetwork.nativeCurrency.decimals));

      if (amountNum + estimatedGasCost > availableBalance) {
        setFormError(`Insufficient balance for amount + gas. Need ~${estimatedGasCost.toFixed(6)} ${selectedNetwork.nativeCurrency.symbol} for gas`);
        return false;
      }
    }

    setFormError('');
    return true;
  };

  const handleSend = async () => {
    if (!validateForm()) return;
    if (!address || !selectedNetwork) return;

    try {
      // Parse amount based on network's native currency decimals
      const value = parseUnits(amount, selectedNetwork.nativeCurrency.decimals);

      await sendTransaction({
        to: recipient as `0x${string}`,
        value,
      });
    } catch (error: any) {
      console.error('Transaction failed:', error);
      setFormError(error.message || 'Transaction failed. Please try again.');
    }
  };

  const handleClose = () => {
    if (!isPending && !isConfirming) {
      onClose();
    }
  };

  const getExplorerUrl = (hash: string) => {
    if (!selectedNetwork) return '#';
    return `${selectedNetwork.explorerUrl}/tx/${hash}`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Send Funds</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={isPending || isConfirming}
              className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Send {selectedNetwork?.nativeCurrency.symbol || 'tokens'} to any address
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Transaction Success */}
          {isConfirmed && txHash && (
            <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">
                    Transaction Confirmed!
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mb-2">
                    Your transaction has been successfully sent
                  </p>
                  <a
                    href={getExplorerUrl(txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
                  >
                    View on Explorer
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Transaction Pending */}
          {(isPending || isConfirming) && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {isPending ? 'Waiting for confirmation...' : 'Processing transaction...'}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {isPending ? 'Please confirm in your wallet' : 'This may take a few moments'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {(formError || error) && !isConfirmed && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">
                  {formError || error?.message || 'An error occurred'}
                </p>
              </div>
            </div>
          )}

          {/* Network Selector */}
          {!isConfirmed && (
            <>
              <div className="space-y-2">
                <Label htmlFor="network">Network</Label>
                <Select
                  value={selectedNetworkId.toString()}
                  onValueChange={(value) => setSelectedNetworkId(parseInt(value))}
                  disabled={isPending || isConfirming}
                >
                  <SelectTrigger id="network">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(NETWORK_CONFIGS).map((network) => (
                      <SelectItem key={network.id} value={network.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span>{network.displayName}</span>
                          {chain?.id === network.id && (
                            <span className="text-xs text-green-600 dark:text-green-400">
                              (Current)
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Network Switch Warning */}
              {needsNetworkSwitch && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
                    You need to switch to {selectedNetwork?.displayName} to send this transaction
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSwitchNetwork}
                    disabled={networkSwitching}
                    className="w-full"
                  >
                    {networkSwitching ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Switching...
                      </>
                    ) : (
                      `Switch to ${selectedNetwork?.displayName}`
                    )}
                  </Button>
                </div>
              )}

              {/* Recipient Type */}
              <div className="space-y-2">
                <Label>Send To</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="recipientType"
                      value="treasury"
                      checked={recipientType === 'treasury'}
                      onChange={(e) => setRecipientType('treasury')}
                      disabled={isPending || isConfirming}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Treasury</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="recipientType"
                      value="custom"
                      checked={recipientType === 'custom'}
                      onChange={(e) => setRecipientType('custom')}
                      disabled={isPending || isConfirming}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Custom Address</span>
                  </label>
                </div>
              </div>

              {/* Custom Recipient Address */}
              {recipientType === 'custom' && (
                <div className="space-y-2">
                  <Label htmlFor="recipient">Recipient Address</Label>
                  <Input
                    id="recipient"
                    placeholder="0x..."
                    value={customRecipient}
                    onChange={(e) => setCustomRecipient(e.target.value)}
                    disabled={isPending || isConfirming}
                    className="font-mono text-sm"
                  />
                </div>
              )}

              {/* Treasury Address Display */}
              {recipientType === 'treasury' && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>Treasury:</strong> {contracts.TreasuryCore.address.slice(0, 10)}...{contracts.TreasuryCore.address.slice(-8)}
                  </p>
                </div>
              )}

              {/* Amount */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="amount">
                    Amount ({selectedNetwork?.nativeCurrency.symbol})
                  </Label>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Available: {availableBalance.toFixed(6)}
                  </span>
                </div>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    step="0.000001"
                    placeholder="0.0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={isPending || isConfirming}
                    className="pr-16"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setAmount(availableBalance.toString())}
                    disabled={isPending || isConfirming}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 text-xs"
                  >
                    Max
                  </Button>
                </div>
              </div>

              {/* Gas Estimation */}
              {estimatedGas && selectedNetwork && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center gap-2 text-xs">
                    <Fuel className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600 dark:text-gray-400">
                      Estimated Gas: ~{formatUnits(estimatedGas * 20000000000n, selectedNetwork.nativeCurrency.decimals).slice(0, 10)} {selectedNetwork.nativeCurrency.symbol}
                    </span>
                  </div>
                </div>
              )}

              {/* Send Button */}
              <Button
                className="w-full"
                onClick={handleSend}
                disabled={isPending || isConfirming || needsNetworkSwitch}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Confirming...
                  </>
                ) : isConfirming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Send'
                )}
              </Button>
            </>
          )}

          {/* Close Button After Success */}
          {isConfirmed && (
            <Button className="w-full" onClick={handleClose}>
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
