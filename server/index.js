import express from 'express';
import cors from 'cors';
import { createWalletClient, http, decodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import TreasuryCoreDeployment from '../src/lib/deployments/arcTestnet/TreasuryCore.json' assert { type: 'json' };

const app = express();
const PORT = process.env.PORT || 4000;

const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;
const ARC_TESTNET_RPC = process.env.ARC_TESTNET_RPC || 'https://arc-testnet.g.alchemy.com/v2/demo';

if (!RELAYER_PRIVATE_KEY) {
  throw new Error('RELAYER_PRIVATE_KEY env var is required');
}

const relayerAccount = privateKeyToAccount(`0x${RELAYER_PRIVATE_KEY.replace(/^0x/, '')}`);
const walletClient = createWalletClient({
  account: relayerAccount,
  chain: {
    id: TreasuryCoreDeployment.chainId || 5042002,
    name: 'Arc Testnet',
    network: 'arc-testnet',
    nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
    rpcUrls: {
      default: { http: [ARC_TESTNET_RPC] },
      public: { http: [ARC_TESTNET_RPC] },
    },
  },
  transport: http(ARC_TESTNET_RPC),
});

app.use(cors());
app.use(express.json());

app.post('/api/relay-tx', async (req, res) => {
  try {
    const { signature, payload } = req.body;

    if (!signature || !payload) {
      return res.status(400).json({ message: 'Missing signature or payload' });
    }

    console.log('📬 Received meta-transaction:', { signature, payload });

    const { ruleId, target, amount, nonce, deadline, metadata } = payload || {};
    if (!ruleId || !target || !amount || !nonce || !deadline) {
      return res.status(400).json({ message: 'Invalid payload structure' });
    }

    const { name, description, ruleType, checkInterval, minExecutionGap, recipients, values, usePercentages, maxPerExecution } = metadata || {};
    if (!name || ruleType === undefined || !recipients || !values) {
      return res.status(400).json({ message: 'Invalid metadata structure' });
    }

    const functionFragment = TreasuryCoreDeployment.abi.find((item) => item.name === 'setAllocationRule');
    if (!functionFragment) {
      return res.status(500).json({ message: 'setAllocationRule ABI not found' });
    }

    const calldata = walletClient?.abi?.encodeFunctionData
      ? walletClient.abi.encodeFunctionData({
          abi: TreasuryCoreDeployment.abi,
          functionName: 'setAllocationRule',
          args: [
            BigInt(ruleId),
            target,
            BigInt(amount),
            BigInt(nonce),
            BigInt(deadline),
            metadata,
          ],
        })
      : decodeFunctionData({
          abi: TreasuryCoreDeployment.abi,
          data: {
            ruleId,
            target,
            amount,
            nonce,
            deadline,
            metadata,
          },
        });

    const txHash = await walletClient.sendTransaction({
      to: TreasuryCoreDeployment.address,
      data: calldata,
    });

    console.log('🚀 Relayer submitted transaction:', txHash);

    return res.json({ status: 'submitted', txHash });
  } catch (error) {
    console.error('Relayer endpoint error:', error);
    return res.status(500).json({ message: 'Internal relayer error' });
  }
});

app.listen(PORT, () => {
  console.log(`Relayer service listening on port ${PORT}`);
});

