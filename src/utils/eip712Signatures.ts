import type { Address, Hex } from "viem";
import type { WalletClient } from "viem";

export interface SignSetAllocationRuleParams {
  walletClient: WalletClient;
  signerAddress: Address;
  chainId: number;
  treasuryAddress: Address;
  ruleId: bigint;
  target: Address;
  amount: bigint;
  nonce: bigint;
  deadline: bigint;
  name?: string;
  version?: string;
}

export async function signSetAllocationRule({
  walletClient,
  signerAddress,
  chainId,
  treasuryAddress,
  ruleId,
  target,
  amount,
  nonce,
  deadline,
  name = "TreasuryCore",
  version = "1",
}: SignSetAllocationRuleParams): Promise<Hex> {
  const domain = {
    name,
    version,
    chainId,
    verifyingContract: treasuryAddress,
  } as const;

  const types = {
    SetAllocationRule: [
      { name: "ruleId", type: "uint256" },
      { name: "target", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  } as const;

  const message = {
    ruleId,
    target,
    amount,
    nonce,
    deadline,
  } as const;

  return walletClient.signTypedData({
    account: signerAddress,
    domain,
    types,
    primaryType: "SetAllocationRule",
    message,
  });
}

