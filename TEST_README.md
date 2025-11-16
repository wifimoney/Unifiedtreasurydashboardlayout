# Contract Testing Script

This test script tests 1-2 **read functions** AND 1 **write function (transaction)** from each deployed contract on the Arc Testnet.

## 🔥 What's Tested

- **Read Operations**: View/pure functions that don't modify state
- **Write Operations**: Transactions that modify blockchain state
- **State Verification**: Confirms changes were applied correctly

## Contracts Tested

### 1. **TreasuryCore** (`0xda51feda9cc07143639b88ec1bd4d08bd1a3f50d`)
**Read Operations:**
- `getOwners()` - Returns the list of owners
- `getTransactionCount()` - Returns the total number of transactions

**Write Operations:**
- `deposit()` - Send 0.001 ETH to the treasury ✅

---

### 2. **PayrollManager** (`0x43c82bcd545756843f885c36ed2ace832b0e8015`)
**Read Operations:**
- `activeEmployees()` - Returns the number of active employees
- `admin()` - Returns the admin address

**Write Operations:**
- `addEmployee()` - Add a test employee with 1000 ETH monthly salary ✅

---

### 3. **BudgetAllocator** (`0x4da9d22d5556069b1e3ccecc166cf56b84020687`)
**Read Operations:**
- `departmentCount()` - Returns the total number of departments
- `admin()` - Returns the admin address

**Write Operations:**
- `createDepartment()` - Create "Engineering" department with 50,000 ETH budget ✅

---

### 4. **ScheduledPayments** (`0x6be303cc9138c6ff7dac734ce0244e7dfb44fb91`)
**Read Operations:**
- `getTotalPendingAmount()` - Returns the total pending payment amount
- `getUpcomingPayments()` - Returns array of upcoming payment IDs

**Write Operations:**
- `schedulePayment()` - Schedule a 500 ETH payment for 24 hours later ✅

---

### 5. **RuleEngine** (`0x3b41d199e653ef8b62bf5e0266e522783293ba02`)
**Read Operations:**
- `ruleCount()` - Returns the total number of rules
- `getActiveRules()` - Returns array of active rule IDs

**Write Operations:**
- `createRule()` - Create "Weekly Distribution" rule with 2 recipients ✅

---

### 6. **ComplianceTracker** (`0xa3a673aa006a96a9e0e69a84a892e1abf5090d39`)
**Read Operations:**
- `paused()` - Returns whether the contract is paused
- `blacklistedAddresses()` - Checks if an address is blacklisted

**Write Operations:**
- _(None tested - read-only verification contract)_

---

### 7. **TreasuryAggregator** (`0x8fae9af125e47e5925af95189e88459608362766`)
**Read Operations:**
- `treasuryCore()` - Returns the TreasuryCore contract address
- `payrollManager()` - Returns the PayrollManager contract address

**Write Operations:**
- _(None tested - aggregator contract, needs configuration first)_

## Running the Tests

### Prerequisites

Make sure you have Node.js installed and all dependencies:

```bash
npm install
```

### Run the Test Script

You can run the test script in two ways:

#### Option 1: Using npm script
```bash
npm run test:contracts
```

#### Option 2: Direct execution
```bash
node test-contracts.mjs
```

## Configuration

The test script uses the following configuration:

- **Private Key**: `5f9b16d8121078c8e051b8062073645478809d11639f12938ac0eb594dde8fd9`
- **Wallet Address**: `0x18314572f1D7669043f9659EDAB96490035dD232` (derived from the private key)
- **Chain**: Arc Testnet (Chain ID: 5042002)
- **RPC URL**: `https://arc-testnet.g.alchemy.com/v2/x9KWnxVYhNfjC0Yr8llKf`

## Test Results

The script will output:
- ✅ Success messages for passing tests
- ❌ Error messages for failing tests (with error details)
- Contract addresses being tested
- Function results (formatted for readability)

## Example Output

```
🔧 Testing Treasury Contracts
============================

📝 Testing with account: 0x18314572f1D7669043f9659EDAB96490035dD232


📦 Testing TreasuryCore...
   Address: 0xda51feda9cc07143639b88ec1bd4d08bd1a3f50d

✅ TreasuryCore.getOwners()
   Result: [ '0x18314572f1D7669043f9659EDAB96490035dD232' ]

✅ TreasuryCore.getTransactionCount()
   Result: 0

...
```

## Technologies Used

- **viem**: Ethereum library for contract interactions
- **Node.js**: Runtime environment
- **ES Modules**: Modern JavaScript module system

## Notes

- **⚠️ This script makes REAL transactions on Arc Testnet** - it will modify contract state
- Some tests may fail if the contracts haven't been fully initialized or configured
- The test account (derived from the private key) is the owner of most contracts
- All contracts are deployed on Arc Testnet
- The script includes both read-only operations AND state-modifying transactions
- Each transaction waits for confirmation before proceeding
- Transaction hashes and explorer links are displayed for verification

## Troubleshooting

If you encounter errors:

1. **Network Issues**: Ensure you have internet connectivity
2. **Contract Not Found**: Verify the contract addresses are correct
3. **Function Reverts**: Some functions may require specific contract state to work
4. **RPC Issues**: The Alchemy RPC endpoint must be accessible

## Adding More Tests

To add more tests, edit `test-contracts.mjs` and follow the pattern:

```javascript
try {
  const result = await publicClient.readContract({
    address: contracts.ContractName.address,
    abi: contracts.ContractName.abi,
    functionName: 'yourFunctionName',
    args: [], // if the function requires arguments
  });
  logTest('ContractName', 'yourFunctionName', result);
} catch (error) {
  logError('ContractName', 'yourFunctionName', error);
}
```

