import { createPublicClient, http, formatEther } from 'viem';
import { readFileSync } from 'fs';

const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: ['https://arc-testnet.g.alchemy.com/v2/CXvHG0j6A1Fv6mI2y-iIKxGtWbiW7HN4'] } },
  testnet: true,
};

const ruleEngineData = JSON.parse(readFileSync('src/lib/deployments/arcTestnet/RuleEngine.json', 'utf8'));

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

async function getRules() {
  console.log('🔍 Fetching Rules from RuleEngine...\n');

  const ruleCount = await publicClient.readContract({
    address: ruleEngineData.address,
    abi: ruleEngineData.abi,
    functionName: 'ruleCount',
  });

  console.log(`📋 Total Rules: ${ruleCount.toString()}\n`);

  for (let i = 0; i < Number(ruleCount); i++) {
    const rule = await publicClient.readContract({
      address: ruleEngineData.address,
      abi: ruleEngineData.abi,
      functionName: 'getRule',
      args: [BigInt(i)],
    });

    console.log(`\n========== Rule ${i} ==========`);
    console.log('Raw rule data:', rule);

    // The rule is returned as an array, not an object
    const [name, description, ruleType, status, triggerAmount, timesExecuted, totalDistributed, lastExecuted] = rule;

    console.log(`Name: ${name}`);
    console.log(`Description: ${description}`);
    console.log(`Type: ${ruleType} (0=THRESHOLD, 1=PERCENTAGE, 2=SCHEDULED, 3=HYBRID)`);
    console.log(`Status: ${status} (0=ACTIVE, 1=PAUSED, 2=DISABLED)`);
    console.log(`Trigger Amount: ${formatEther(triggerAmount)} ETH`);
    console.log(`Times Executed: ${timesExecuted.toString()}`);
    console.log(`Total Distributed: ${formatEther(totalDistributed)} ETH`);
    console.log(`Last Executed: ${lastExecuted.toString()}`);

    // Get distribution details
    const distribution = await publicClient.readContract({
      address: ruleEngineData.address,
      abi: ruleEngineData.abi,
      functionName: 'getRuleDistribution',
      args: [BigInt(i)],
    });

    console.log(`\nDistribution data:`, distribution);
    const [recipients, values, usePercentages] = distribution;

    console.log(`\nDistribution:`);
    console.log(`  Recipients: ${recipients.length}`);
    recipients.forEach((recipient, idx) => {
      console.log(`  - ${recipient}: ${formatEther(values[idx])} ETH`);
    });
    console.log(`  Use Percentages: ${usePercentages}`);
  }

  // Get active rules
  const activeRules = await publicClient.readContract({
    address: ruleEngineData.address,
    abi: ruleEngineData.abi,
    functionName: 'getActiveRules',
  });

  console.log(`\n\n📊 Active Rules: ${activeRules.map(r => r.toString()).join(', ')}`);
}

getRules().catch(console.error);

