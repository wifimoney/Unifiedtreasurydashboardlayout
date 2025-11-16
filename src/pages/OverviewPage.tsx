import { USDCTreasuryOverview } from "../components/USDCTreasuryOverview";
import { NetworkBalances } from "../components/NetworkBalances";

export function OverviewPage() {
  return (
    <div className="space-y-8">
      <USDCTreasuryOverview />
      <NetworkBalances />
    </div>
  );
}

