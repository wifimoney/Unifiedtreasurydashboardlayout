import { useMemo } from "react";
import { useContractEvent } from "wagmi";
import type { Log } from "viem";

import { contracts } from "../lib/contracts";
import { getRecipientComplianceStatus } from "../utils/circleSdkMocks";

type ComplianceRecordCreatedArgs = [
  recordId: bigint,
  transactionHash: string,
  recipient: `0x${string}`,
  amount: bigint,
  source: string,
];

export function useComplianceEvents() {
  const treasuryContract = useMemo(() => contracts.TreasuryCore, []);

  useContractEvent({
    address: treasuryContract.address,
    abi: treasuryContract.abi,
    eventName: "ComplianceRecordCreated",
    listener: async (...eventData: unknown[]) => {
      const log = eventData[eventData.length - 1] as Log;
      const [
        recordId,
        transactionHash,
        recipient,
        amount,
        source,
      ] = eventData.slice(0, -1) as ComplianceRecordCreatedArgs;

      const complianceStatus = await getRecipientComplianceStatus(recipient);

      console.log("✅ ComplianceRecordCreated event received (enriched):", {
        event: {
          recordId,
          transactionHash,
          recipient,
          amount,
          source,
          log,
        },
        complianceStatus,
      });
    },
  });
}

