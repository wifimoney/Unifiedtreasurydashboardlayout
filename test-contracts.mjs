import { createWalletClient, createPublicClient, http, parseEther, formatEther, defineChain, getAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define Arc Testnet chain
const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://arc-testnet.g.alchemy.com/v2/CXvHG0j6A1Fv6mI2y-iIKxGtWbiW7HN4'],
    },
  },
  blockExplorers: {
    default: {
      name: 'ArcScan',
      url: 'https://testnet.arcscan.app',
    },
  },
  testnet: true,
});

// Load contract deployments
const loadContract = (name) => {
  const path = join(__dirname, `src/lib/deployments/arcTestnet/${name}.json`);
  const data = JSON.parse(readFileSync(path, 'utf8'));
  return {
    address: data.address,
    abi: data.abi,
  };
};

const contracts = {
  TreasuryCore: loadContract('TreasuryCore'),
  PayrollManager: loadContract('PayrollManager'),
  BudgetAllocator: loadContract('BudgetAllocator'),
  ScheduledPayments: loadContract('ScheduledPayments'),
  RuleEngine: loadContract('RuleEngine'),
  ComplianceTracker: loadContract('ComplianceTracker'),
  TreasuryAggregator: loadContract('TreasuryAggregatorSimple'),
};

// Configuration
const PRIVATE_KEY = '0x5f9b16d8121078c8e051b8062073645478809d11639f12938ac0eb594dde8fd9';
const account = privateKeyToAccount(PRIVATE_KEY);

// Create clients
const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

const walletClient = createWalletClient({
  account,
  chain: arcTestnet,
  transport: http(),
});

console.log('🔧 Testing Treasury Contracts');
console.log('============================\n');
console.log(`📝 Testing with account: ${account.address}\n`);

// Helper function to format test output
function logTest(contractName, functionName, result) {
  console.log(`\n✅ ${contractName}.${functionName}()`);
  console.log(`   Result:`, result);
}

function logError(contractName, functionName, error) {
  console.error(`\n❌ ${contractName}.${functionName}() FAILED`);
  console.error(`   Error:`, error.message);
}

function logTransaction(contractName, functionName, txHash) {
  console.log(`\n📝 ${contractName}.${functionName}() - Transaction Sent`);
  console.log(`   TX Hash: ${txHash}`);
  console.log(`   Explorer: https://testnet.arcscan.app/tx/${txHash}`);
}

async function waitForTransaction(txHash) {
  console.log(`   ⏳ Waiting for confirmation...`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);
  return receipt;
}

async function testContract() {
  try {
    // ============================================
    // 1. TreasuryCore Tests
    // ============================================
    console.log('\n📦 Testing TreasuryCore...');
    console.log(`   Address: ${contracts.TreasuryCore.address}`);

    try {
      // Test 1: Get owners
      const owners = await publicClient.readContract({
        address: contracts.TreasuryCore.address,
        abi: contracts.TreasuryCore.abi,
        functionName: 'getOwners',
      });
      logTest('TreasuryCore', 'getOwners', owners);
    } catch (error) {
      logError('TreasuryCore', 'getOwners', error);
    }

    try {
      // Test 2: Get transaction count
      const txCount = await publicClient.readContract({
        address: contracts.TreasuryCore.address,
        abi: contracts.TreasuryCore.abi,
        functionName: 'getTransactionCount',
      });
      logTest('TreasuryCore', 'getTransactionCount', txCount.toString());
    } catch (error) {
      logError('TreasuryCore', 'getTransactionCount', error);
    }

    try {
      // Transaction Test: Deposit funds to TreasuryCore
      const depositAmount = parseEther('0.001'); // 0.001 ETH
      const txHash = await walletClient.sendTransaction({
        to: contracts.TreasuryCore.address,
        value: depositAmount,
      });
      logTransaction('TreasuryCore', 'deposit (via transfer)', txHash);
      await waitForTransaction(txHash);

      // Verify the balance increased
      const newBalance = await publicClient.readContract({
        address: contracts.TreasuryCore.address,
        abi: contracts.TreasuryCore.abi,
        functionName: 'getBalance',
      });
      console.log(`   💰 New Treasury Balance: ${formatEther(newBalance)} ETH`);
    } catch (error) {
      logError('TreasuryCore', 'deposit', error);
    }

    // ============================================
    // 2. PayrollManager Tests
    // ============================================
    console.log('\n\n📦 Testing PayrollManager...');
    console.log(`   Address: ${contracts.PayrollManager.address}`);

    try {
      // Test 1: Get active employees
      const activeEmployees = await publicClient.readContract({
        address: contracts.PayrollManager.address,
        abi: contracts.PayrollManager.abi,
        functionName: 'activeEmployees',
      });
      logTest('PayrollManager', 'activeEmployees', activeEmployees.toString());
    } catch (error) {
      logError('PayrollManager', 'activeEmployees', error);
    }

    try {
      // Test 2: Get admin
      const admin = await publicClient.readContract({
        address: contracts.PayrollManager.address,
        abi: contracts.PayrollManager.abi,
        functionName: 'admin',
      });
      logTest('PayrollManager', 'admin', admin);
    } catch (error) {
      logError('PayrollManager', 'admin', error);
    }

    try {
      // Transaction Test: Add an employee
      const testEmployeeAddress = getAddress('0x742d35cc6634c0532925a3b844bc9e7595f0beb2'); // Random test address
      const employeeName = 'John Doe';
      const salary = parseEther('1000'); // 1000 USDC per payment
      const frequency = 2; // MONTHLY (assuming 0=DAILY, 1=WEEKLY, 2=MONTHLY)

      const { request } = await publicClient.simulateContract({
        account,
        address: contracts.PayrollManager.address,
        abi: contracts.PayrollManager.abi,
        functionName: 'addEmployee',
        args: [testEmployeeAddress, employeeName, salary, frequency],
      });
      const txHash = await walletClient.writeContract(request);
      logTransaction('PayrollManager', 'addEmployee', txHash);
      await waitForTransaction(txHash);

      // Verify employee was added
      const newEmployeeCount = await publicClient.readContract({
        address: contracts.PayrollManager.address,
        abi: contracts.PayrollManager.abi,
        functionName: 'activeEmployees',
      });
      console.log(`   👥 New Active Employees Count: ${newEmployeeCount.toString()}`);
    } catch (error) {
      logError('PayrollManager', 'addEmployee', error);
    }

    // ============================================
    // 3. BudgetAllocator Tests
    // ============================================
    console.log('\n\n📦 Testing BudgetAllocator...');
    console.log(`   Address: ${contracts.BudgetAllocator.address}`);

    try {
      // Test 1: Get department count
      const departmentCount = await publicClient.readContract({
        address: contracts.BudgetAllocator.address,
        abi: contracts.BudgetAllocator.abi,
        functionName: 'departmentCount',
      });
      logTest('BudgetAllocator', 'departmentCount', departmentCount.toString());
    } catch (error) {
      logError('BudgetAllocator', 'departmentCount', error);
    }

    try {
      // Test 2: Get admin
      const admin = await publicClient.readContract({
        address: contracts.BudgetAllocator.address,
        abi: contracts.BudgetAllocator.abi,
        functionName: 'admin',
      });
      logTest('BudgetAllocator', 'admin', admin);
    } catch (error) {
      logError('BudgetAllocator', 'admin', error);
    }

    try {
      // Transaction Test: Create a department
      const departmentName = 'Engineering';
      const budget = parseEther('50000'); // 50,000 USDC budget
      const managerAddress = account.address; // Use test account as manager

      const { request } = await publicClient.simulateContract({
        account,
        address: contracts.BudgetAllocator.address,
        abi: contracts.BudgetAllocator.abi,
        functionName: 'createDepartment',
        args: [departmentName, budget, managerAddress],
      });
      const txHash = await walletClient.writeContract(request);
      logTransaction('BudgetAllocator', 'createDepartment', txHash);
      await waitForTransaction(txHash);

      // Verify department was created
      const newDeptCount = await publicClient.readContract({
        address: contracts.BudgetAllocator.address,
        abi: contracts.BudgetAllocator.abi,
        functionName: 'departmentCount',
      });
      console.log(`   🏢 New Department Count: ${newDeptCount.toString()}`);
    } catch (error) {
      logError('BudgetAllocator', 'createDepartment', error);
    }

    // ============================================
    // 4. ScheduledPayments Tests
    // ============================================
    console.log('\n\n📦 Testing ScheduledPayments...');
    console.log(`   Address: ${contracts.ScheduledPayments.address}`);

    try {
      // Test 1: Get total pending amount
      const pendingAmount = await publicClient.readContract({
        address: contracts.ScheduledPayments.address,
        abi: contracts.ScheduledPayments.abi,
        functionName: 'getTotalPendingAmount',
      });
      logTest('ScheduledPayments', 'getTotalPendingAmount', `${formatEther(pendingAmount)} ETH`);
    } catch (error) {
      logError('ScheduledPayments', 'getTotalPendingAmount', error);
    }

    try {
      // Test 2: Get upcoming payments
      const upcomingPayments = await publicClient.readContract({
        address: contracts.ScheduledPayments.address,
        abi: contracts.ScheduledPayments.abi,
        functionName: 'getUpcomingPayments',
      });
      logTest('ScheduledPayments', 'getUpcomingPayments', upcomingPayments.map(p => p.toString()));
    } catch (error) {
      logError('ScheduledPayments', 'getUpcomingPayments', error);
    }

    try {
      // Transaction Test: Schedule a payment
      const recipient = getAddress('0x742d35cc6634c0532925a3b844bc9e7595f0beb2');
      const amount = parseEther('500'); // 500 USDC
      const executeAt = Math.floor(Date.now() / 1000) + (60 * 60 * 24); // 24 hours from now
      const recurring = false;
      const interval = 0;
      const maxExecutions = 1;
      const description = 'Test Payment';

      const { request } = await publicClient.simulateContract({
        account,
        address: contracts.ScheduledPayments.address,
        abi: contracts.ScheduledPayments.abi,
        functionName: 'schedulePayment',
        args: [recipient, amount, executeAt, recurring, interval, maxExecutions, description],
      });
      const txHash = await walletClient.writeContract(request);
      logTransaction('ScheduledPayments', 'schedulePayment', txHash);
      await waitForTransaction(txHash);

      // Verify payment was scheduled
      const pendingPayments = await publicClient.readContract({
        address: contracts.ScheduledPayments.address,
        abi: contracts.ScheduledPayments.abi,
        functionName: 'getPendingPaymentIds',
      });
      console.log(`   📅 Pending Payments: ${pendingPayments.map(p => p.toString()).join(', ')}`);
    } catch (error) {
      logError('ScheduledPayments', 'schedulePayment', error);
    }

    // ============================================
    // 5. RuleEngine Tests
    // ============================================
    console.log('\n\n📦 Testing RuleEngine...');
    console.log(`   Address: ${contracts.RuleEngine.address}`);

    try {
      // Test 1: Get rule count
      const ruleCount = await publicClient.readContract({
        address: contracts.RuleEngine.address,
        abi: contracts.RuleEngine.abi,
        functionName: 'ruleCount',
      });
      logTest('RuleEngine', 'ruleCount', ruleCount.toString());
    } catch (error) {
      logError('RuleEngine', 'ruleCount', error);
    }

    try {
      // Test 2: Get active rules
      const activeRules = await publicClient.readContract({
        address: contracts.RuleEngine.address,
        abi: contracts.RuleEngine.abi,
        functionName: 'getActiveRules',
      });
      logTest('RuleEngine', 'getActiveRules', activeRules.map(r => r.toString()));
    } catch (error) {
      logError('RuleEngine', 'getActiveRules', error);
    }

    try {
      // Transaction Test: Create a rule
      const ruleName = 'Weekly Distribution';
      const ruleDescription = 'Distribute funds weekly to team members';
      const ruleType = 2; // SCHEDULED
      const triggerAmount = parseEther('1000');
      const checkInterval = 60 * 60 * 24 * 7; // 7 days
      const minExecutionGap = 60 * 60 * 24; // 1 day
      const recipients = [
        getAddress('0x742d35cc6634c0532925a3b844bc9e7595f0beb2'),
        getAddress('0x8626f6940e2eb28930efb4cef49b2d1f2c9c1199')
      ];
      const values = [parseEther('500'), parseEther('500')];
      const usePercentages = false;
      const maxPerExecution = parseEther('2000');

      const { request } = await publicClient.simulateContract({
        account,
        address: contracts.RuleEngine.address,
        abi: contracts.RuleEngine.abi,
        functionName: 'createRule',
        args: [ruleName, ruleDescription, ruleType, triggerAmount, checkInterval, minExecutionGap, recipients, values, usePercentages, maxPerExecution],
      });
      const txHash = await walletClient.writeContract(request);
      logTransaction('RuleEngine', 'createRule', txHash);
      await waitForTransaction(txHash);

      // Verify rule was created
      const newRuleCount = await publicClient.readContract({
        address: contracts.RuleEngine.address,
        abi: contracts.RuleEngine.abi,
        functionName: 'ruleCount',
      });
      console.log(`   📋 New Rule Count: ${newRuleCount.toString()}`);
    } catch (error) {
      logError('RuleEngine', 'createRule', error);
    }

    // ============================================
    // 6. ComplianceTracker Tests
    // ============================================
    console.log('\n\n📦 Testing ComplianceTracker...');
    console.log(`   Address: ${contracts.ComplianceTracker.address}`);

    try {
      // Test 1: Check if paused
      const isPaused = await publicClient.readContract({
        address: contracts.ComplianceTracker.address,
        abi: contracts.ComplianceTracker.abi,
        functionName: 'paused',
      });
      logTest('ComplianceTracker', 'paused', isPaused);
    } catch (error) {
      logError('ComplianceTracker', 'paused', error);
    }

    try {
      // Test 2: Check if address is blacklisted
      const isBlacklisted = await publicClient.readContract({
        address: contracts.ComplianceTracker.address,
        abi: contracts.ComplianceTracker.abi,
        functionName: 'blacklistedAddresses',
        args: [account.address],
      });
      logTest('ComplianceTracker', 'blacklistedAddresses', isBlacklisted);
    } catch (error) {
      logError('ComplianceTracker', 'blacklistedAddresses', error);
    }

    // ============================================
    // 7. TreasuryAggregator Tests
    // ============================================
    console.log('\n\n📦 Testing TreasuryAggregator...');
    console.log(`   Address: ${contracts.TreasuryAggregator.address}`);

    try {
      // Test 1: Get treasury core address
      const treasuryCoreAddr = await publicClient.readContract({
        address: contracts.TreasuryAggregator.address,
        abi: contracts.TreasuryAggregator.abi,
        functionName: 'treasuryCore',
      });
      logTest('TreasuryAggregator', 'treasuryCore', treasuryCoreAddr);
    } catch (error) {
      logError('TreasuryAggregator', 'treasuryCore', error);
    }

    try {
      // Test 2: Get payroll manager address
      const payrollManagerAddr = await publicClient.readContract({
        address: contracts.TreasuryAggregator.address,
        abi: contracts.TreasuryAggregator.abi,
        functionName: 'payrollManager',
      });
      logTest('TreasuryAggregator', 'payrollManager', payrollManagerAddr);
    } catch (error) {
      logError('TreasuryAggregator', 'payrollManager', error);
    }

    console.log('\n\n============================');
    console.log('✨ Testing Complete!');
    console.log('============================\n');

  } catch (error) {
    console.error('\n❌ Fatal Error:', error);
    process.exit(1);
  }
}

// Run tests
testContract();

