export async function getRecipientComplianceStatus(address: string) {
  console.log(`🔍 Mocking Circle SDK compliance lookup for ${address}`);

  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    kycStatusFlag: "VERIFIED_ENTERPRISE",
    amlStatusFlag: "CLEARED",
  } as const;
}

