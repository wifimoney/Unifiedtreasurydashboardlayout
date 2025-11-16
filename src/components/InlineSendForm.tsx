import { useState, useEffect } from 'react';
import { useAccount, useSwitchChain, useSendTransaction, useWaitForTransactionReceipt, useBalance, useWriteContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
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
import { useTreasuryAddress } from '../lib/contracts';

interface InlineSendFormProps {
  onClose: () => void;
  networkId?: number;
  tokenAddress?: string;
  tokenSymbol?: string;
  tokenDecimals?: number;
  tokenBalance?: string;
}

// Map chain IDs to viem chain objects
const CHAIN_MAP: Record<number, any> = {
  [arcTestnet.id]: arcTestnet,
  [sepolia.id]: sepolia,
  [avalancheFuji.id]: avalancheFuji,
  [baseSepolia.id]: baseSepolia,
};

// ERC-20 ABI for transfer function
const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export function InlineSendForm({ onClose, networkId, tokenAddress, tokenSymbol, tokenDecimals, tokenBalance }: InlineSendFormProps) {
  const { address, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const { sendTransaction, data: nativeTxHash, isPending: isNativePending, isSuccess: isNativeSuccess, error: nativeError } = useSendTransaction();
  const { writeContract, data: tokenTxHash, isPending: isTokenPending, isSuccess: isTokenSuccess, error: tokenError } = useWriteContract();
  const treasuryAddress = useTreasuryAddress();

  const isERC20Transfer = !!tokenAddress;
  const txHash = isERC20Transfer ? tokenTxHash : nativeTxHash;
  const isPending = isERC20Transfer ? isTokenPending : isNativePending;
  const isSuccess = isERC20Transfer ? isTokenSuccess : isNativeSuccess;
  const error = isERC20Transfer ? tokenError : nativeError;

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const [recipientType, setRecipientType] = useState<'treasury' | 'custom'>('treasury');
  const [customRecipient, setCustomRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedNetworkId, setSelectedNetworkId] = useState<number>(networkId || chain?.id || arcTestnet.id);
  const [networkSwitching, setNetworkSwitching] = useState(false);
  const [formError, setFormError] = useState('');
  const [estimatedGas, setEstimatedGas] = useState<bigint | null>(null);

  const selectedNetwork = getNetworkByChainId(selectedNetworkId);
  const needsNetworkSwitch = chain?.id !== selectedNetworkId;

  // Get recipient address based on type (use active treasury from context)
  const recipient = recipientType === 'treasury' ? (treasuryAddress || '') : customRecipient;

  // Fetch user's balance on selected network (native currency for gas)
  const { data: balanceData } = useBalance({
    address: address,
    chainId: selectedNetworkId,
  });

  // For ERC-20 transfers, use provided token balance; for native, use fetched balance
  const availableBalance = isERC20Transfer && tokenBalance && tokenDecimals
    ? parseFloat(formatUnits(BigInt(tokenBalance), tokenDecimals))
    : balanceData
    ? parseFloat(formatUnits(balanceData.value, balanceData.decimals))
    : 0;

  const displaySymbol = isERC20Transfer && tokenSymbol ? tokenSymbol : selectedNetwork?.nativeCurrency.symbol;

  // Estimate gas when amount and recipient change
  useEffect(() => {
    if (amount && recipient && !needsNetworkSwitch && selectedNetwork) {
      try {
        // ERC-20 transfers use more gas than native transfers
        setEstimatedGas(isERC20Transfer ? 65000n : 21000n);
      } catch (e) {
        setEstimatedGas(null);
      }
    } else {
      setEstimatedGas(null);
    }
  }, [amount, recipient, needsNetworkSwitch, selectedNetwork, isERC20Transfer]);

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

    if (!amount || parseFloat(amount) <= 0) {
      setFormError('Please enter a valid amount');
      return false;
    }

    const amountNum = parseFloat(amount);

    if (amountNum > availableBalance) {
      setFormError(`Insufficient balance. Available: ${availableBalance.toFixed(6)} ${displaySymbol}`);
      return false;
    }

    if (amountNum < 0.000001) {
      setFormError('Amount is too small');
      return false;
    }

    // Gas validation - for ERC-20 transfers, check native balance separately
    if (estimatedGas && selectedNetwork && balanceData) {
      const gasPrice = 20000000000n;
      const estimatedGasCost = parseFloat(formatUnits(estimatedGas * gasPrice, selectedNetwork.nativeCurrency.decimals));
      const nativeBalance = parseFloat(formatUnits(balanceData.value, balanceData.decimals));

      if (isERC20Transfer) {
        // For ERC-20, only check if user has enough native currency for gas
        if (nativeBalance < estimatedGasCost) {
          setFormError(`Insufficient ${selectedNetwork.nativeCurrency.symbol} for gas. Need ~${estimatedGasCost.toFixed(6)} ${selectedNetwork.nativeCurrency.symbol}`);
          return false;
        }
      } else {
        // For native transfers, check amount + gas
        if (amountNum + estimatedGasCost > availableBalance) {
          setFormError(`Insufficient balance for amount + gas. Need ~${estimatedGasCost.toFixed(6)} ${selectedNetwork.nativeCurrency.symbol} for gas`);
          return false;
        }
      }
    }

    setFormError('');
    return true;
  };

  const handleSend = async () => {
    if (!validateForm()) return;
    if (!address || !selectedNetwork) return;

    try {
      if (isERC20Transfer && tokenAddress && tokenDecimals) {
        // ERC-20 transfer
        const value = parseUnits(amount, tokenDecimals);
        await writeContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [recipient as `0x${string}`, value],
        });
      } else {
        // Native currency transfer
        const value = parseUnits(amount, selectedNetwork.nativeCurrency.decimals);
        await sendTransaction({
          to: recipient as `0x${string}`,
          value,
        });
      }
    } catch (error: any) {
      console.error('Transaction failed:', error);
      setFormError(error.message || 'Transaction failed. Please try again.');
    }
  };

  const getExplorerUrl = (hash: string) => {
    if (!selectedNetwork) return '#';
    return `${selectedNetwork.explorerUrl}/tx/${hash}`;
  };

  if (isConfirmed && txHash) {
    return (
      <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
        <div className="flex items-start gap-3">
          <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">
              Transaction Confirmed!
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
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900/40 dark:to-gray-900/20 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 mb-0.5 border-b border-gray-200 dark:border-gray-700">
        <div className="text-sm font-semibold text-gray-900 dark:text-white">Send Funds</div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-7 w-7 p-0 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Transaction Pending */}
      {(isPending || isConfirming) && (
        <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin flex-shrink-0" />
            <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
              {isPending ? 'Waiting for confirmation...' : 'Processing transaction...'}
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {(formError || error) && !isConfirmed && (
        <div className="p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 dark:text-red-300">
              {formError || error?.message || 'An error occurred'}
            </p>
          </div>
        </div>
      )}

      {/* Network Selector */}
      <div className="space-y-1.5">
        <Label htmlFor="network" className="text-xs font-medium text-gray-700 dark:text-gray-300">Network</Label>
        <Select
          value={selectedNetworkId.toString()}
          onValueChange={(value) => setSelectedNetworkId(parseInt(value))}
          disabled={isPending || isConfirming}
        >
          <SelectTrigger id="network" className="h-9 text-sm bg-white dark:bg-gray-950">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(NETWORK_CONFIGS).map((network) => (
              <SelectItem key={network.id} value={network.id.toString()}>
                <div className="flex items-center gap-2">
                  <span>{network.displayName}</span>
                  {chain?.id === network.id && (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">
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
        <div className="p-2.5 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-2 font-medium">
            Switch to {selectedNetwork?.displayName}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSwitchNetwork}
            disabled={networkSwitching}
            className="w-full h-8 text-xs bg-white dark:bg-gray-950 hover:bg-yellow-100 dark:hover:bg-yellow-900/20"
          >
            {networkSwitching ? (
              <>
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                Switching...
              </>
            ) : (
              `Switch Network`
            )}
          </Button>
        </div>
      )}

      {/* Recipient Type */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">Send To</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="radio"
              name="recipientType"
              value="treasury"
              checked={recipientType === 'treasury'}
              onChange={(e) => setRecipientType('treasury')}
              disabled={isPending || isConfirming}
              className="w-4 h-4 text-blue-600 cursor-pointer accent-blue-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Treasury</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="radio"
              name="recipientType"
              value="custom"
              checked={recipientType === 'custom'}
              onChange={(e) => setRecipientType('custom')}
              disabled={isPending || isConfirming}
              className="w-4 h-4 text-blue-600 cursor-pointer accent-blue-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Custom</span>
          </label>
        </div>
      </div>

      {/* Custom Recipient Address */}
      {recipientType === 'custom' && (
        <div className="space-y-1.5">
          <Label htmlFor="recipient" className="text-xs font-medium text-gray-700 dark:text-gray-300">Recipient Address</Label>
          <Input
            id="recipient"
            placeholder="0x..."
            value={customRecipient}
            onChange={(e) => setCustomRecipient(e.target.value)}
            disabled={isPending || isConfirming}
            className="font-mono text-xs h-9 bg-white dark:bg-gray-950"
          />
        </div>
      )}

      {/* Amount */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="amount" className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Amount ({displaySymbol})
          </Label>
          <button
            type="button"
            onClick={() => setAmount(availableBalance.toString())}
            disabled={isPending || isConfirming}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {availableBalance.toFixed(6)} (Max)
          </button>
        </div>
        <Input
          id="amount"
          type="number"
          step="0.000001"
          placeholder="0.0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={isPending || isConfirming}
          className="h-9 text-sm bg-white dark:bg-gray-950"
        />
      </div>

      {/* Gas Estimation */}
      {estimatedGas && selectedNetwork && (
        <div className="p-2 bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-md">
          <div className="flex items-center gap-2">
            <Fuel className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Est. Gas: {formatUnits(estimatedGas * 20000000000n, selectedNetwork.nativeCurrency.decimals).slice(0, 8)} {selectedNetwork.nativeCurrency.symbol}
            </span>
          </div>
        </div>
      )}

      {/* Send Button */}
      <Button
        className="w-full h-9 text-sm font-semibold bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors mt-1"
        onClick={handleSend}
        disabled={isPending || isConfirming || needsNetworkSwitch}
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            Confirming...
          </>
        ) : isConfirming ? (
          <>
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            Processing...
          </>
        ) : (
          'Send Transaction'
        )}
      </Button>
    </div>
  );
}
