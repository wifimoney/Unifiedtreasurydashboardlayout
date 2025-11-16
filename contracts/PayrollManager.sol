// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PayrollManager
 * @notice Automated payroll management for treasury operations
 * @dev Handles employee management, salary payments, and payment scheduling
 */
contract PayrollManager {
    // Enums
    enum PaymentFrequency {
        WEEKLY,      // Every 7 days
        BIWEEKLY,    // Every 14 days
        MONTHLY,     // Every 30 days
        QUARTERLY    // Every 90 days
    }

    // Structs
    struct Employee {
        address wallet;
        uint256 salary;
        PaymentFrequency frequency;
        uint256 lastPaymentTime;
        uint256 totalPaid;
        bool active;
        string name;
        uint256 addedAt;
        uint256 departmentId; // Department employee belongs to
    }

    struct PaymentRecord {
        address employee;
        uint256 amount;
        uint256 timestamp;
        uint256 paymentId;
    }

    // State variables
    address public treasury;
    address public admin;
    address public budgetAllocator;
    IERC20 public usdc;

    mapping(address => Employee) public employees;
    address[] public employeeList;
    PaymentRecord[] public paymentHistory;

    uint256 public totalEmployees;
    uint256 public activeEmployees;
    uint256 public totalPayrollCost;

    // Events
    event EmployeeAdded(address indexed employee, string name, uint256 salary, PaymentFrequency frequency);
    event EmployeeRemoved(address indexed employee);
    event SalaryUpdated(address indexed employee, uint256 oldSalary, uint256 newSalary);
    event PaymentProcessed(address indexed employee, uint256 amount, uint256 timestamp);
    event PayrollExecuted(uint256 employeesPaid, uint256 totalAmount, uint256 timestamp);
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);

    // Modifiers
    modifier onlyAdmin() {
        _onlyAdmin();
        _;
    }

    modifier onlyTreasury() {
        _onlyTreasury();
        _;
    }

    modifier employeeExists(address _employee) {
        _employeeExists(_employee);
        _;
    }

    // Internal modifier functions
    function _onlyAdmin() internal view {
        require(msg.sender == admin, "Only admin can call");
    }

    function _onlyTreasury() internal view {
        require(msg.sender == treasury, "Only treasury can call");
    }

    function _employeeExists(address _employee) internal view {
        require(employees[_employee].active, "Employee does not exist");
    }

    /**
     * @notice Initialize payroll manager
     */
    constructor() {
        admin = msg.sender;
    }

    /**
     * @notice Set treasury address
     * @param _treasury Treasury contract address
     */
    function setTreasury(address _treasury) external onlyAdmin {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
    }

    /**
     * @notice Set USDC token address
     * @param _usdc USDC token address
     */
    function setUsdc(address _usdc) external onlyAdmin {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
    }

    /**
     * @notice Set BudgetAllocator address
     * @param _budgetAllocator BudgetAllocator contract address
     */
    function setBudgetAllocator(address _budgetAllocator) external onlyAdmin {
        require(_budgetAllocator != address(0), "Invalid budget allocator");
        budgetAllocator = _budgetAllocator;
    }

    /**
     * @notice Add a new employee
     * @param _employee Employee wallet address
     * @param _name Employee name
     * @param _salary Annual salary amount
     * @param _frequency Payment frequency
     */
    function addEmployee(
        address _employee,
        string memory _name,
        uint256 _salary,
        PaymentFrequency _frequency,
        uint256 _departmentId
    ) external onlyAdmin {
        require(_employee != address(0), "Invalid employee address");
        require(!employees[_employee].active, "Employee already exists");
        require(_salary > 0, "Salary must be greater than 0");
        require(bytes(_name).length > 0, "Name required");
        require(budgetAllocator != address(0), "Budget allocator not set");

        // Check department budget availability
        (bool success, bytes memory result) = budgetAllocator.call(
            abi.encodeWithSignature("checkBudgetAvailable(uint256,uint256)", _departmentId, _salary)
        );
        require(success && abi.decode(result, (bool)), "Insufficient department budget");

        employees[_employee] = Employee({
            wallet: _employee,
            salary: _salary,
            frequency: _frequency,
            lastPaymentTime: 0,
            totalPaid: 0,
            active: true,
            name: _name,
            addedAt: block.timestamp,
            departmentId: _departmentId
        });

        // Assign employee to department in BudgetAllocator
        (bool assigned, ) = budgetAllocator.call(
            abi.encodeWithSignature("assignEmployeeToDepartment(address,uint256)", _employee, _departmentId)
        );
        require(assigned, "Failed to assign employee to department");

        employeeList.push(_employee);
        totalEmployees++;
        activeEmployees++;

        emit EmployeeAdded(_employee, _name, _salary, _frequency);
    }

    /**
     * @notice Remove an employee
     * @param _employee Employee address to remove
     */
    function removeEmployee(address _employee) external onlyAdmin employeeExists(_employee) {
        employees[_employee].active = false;
        activeEmployees--;

        emit EmployeeRemoved(_employee);
    }

    /**
     * @notice Update employee salary
     * @param _employee Employee address
     * @param _newSalary New salary amount
     */
    function updateSalary(address _employee, uint256 _newSalary)
        external
        onlyAdmin
        employeeExists(_employee)
    {
        require(_newSalary > 0, "Salary must be greater than 0");

        uint256 oldSalary = employees[_employee].salary;
        employees[_employee].salary = _newSalary;

        emit SalaryUpdated(_employee, oldSalary, _newSalary);
    }

    /**
     * @notice Process payroll for all eligible employees
     * @return employeesPaid Number of employees paid
     * @return totalPaid Total amount paid
     */
    function processPayroll() external returns (uint256 employeesPaid, uint256 totalPaid) {
        uint256 count = 0;
        uint256 total = 0;

        for (uint256 i = 0; i < employeeList.length; i++) {
            address empAddress = employeeList[i];
            Employee storage emp = employees[empAddress];

            if (emp.active && isPaymentDue(empAddress)) {
                uint256 paymentAmount = calculatePaymentAmount(empAddress);

                // Note: Balance check removed - TreasuryCore will validate
                _processPayment(empAddress, paymentAmount);
                count++;
                total += paymentAmount;
            }
        }

        if (count > 0) {
            emit PayrollExecuted(count, total, block.timestamp);
        }

        return (count, total);
    }

    /**
     * @notice Process payment for a specific employee
     * @param _employee Employee address
     */
    function processEmployeePayment(address _employee)
        external
        employeeExists(_employee)
        returns (bool)
    {
        require(isPaymentDue(_employee), "Payment not due yet");

        uint256 paymentAmount = calculatePaymentAmount(_employee);
        // Note: Balance check removed - TreasuryCore will check when executing

        _processPayment(_employee, paymentAmount);
        return true;
    }

    /**
     * @notice Internal function to process payment
     * @param _employee Employee address
     * @param _amount Payment amount
     */
    function _processPayment(address _employee, uint256 _amount) internal {
        Employee storage emp = employees[_employee];

        require(treasury != address(0), "Treasury not set");
        require(budgetAllocator != address(0), "Budget allocator not set");

        // Check department budget
        uint256 deptId = emp.departmentId;
        (bool hasBudget, bytes memory result) = budgetAllocator.call(
            abi.encodeWithSignature("checkBudgetAvailable(uint256,uint256)", deptId, _amount)
        );
        require(hasBudget && abi.decode(result, (bool)), "Department budget exceeded");

        // Submit transaction to TreasuryCore for multisig approval
        (bool submitted, ) = treasury.call(
            abi.encodeWithSignature("submitTransaction(address,uint256,bytes)", _employee, _amount, "")
        );
        require(submitted, "Failed to submit to treasury");

        // Record expense in department budget
        (bool recorded, ) = budgetAllocator.call(
            abi.encodeWithSignature(
                "recordExpense(uint256,uint256,string)",
                deptId,
                _amount,
                string(abi.encodePacked("Payroll: ", emp.name))
            )
        );
        // Don't revert if expense recording fails

        // Update employee records
        emp.lastPaymentTime = block.timestamp;
        emp.totalPaid += _amount;
        totalPayrollCost += _amount;

        paymentHistory.push(PaymentRecord({
            employee: _employee,
            amount: _amount,
            timestamp: block.timestamp,
            paymentId: paymentHistory.length
        }));

        emit PaymentProcessed(_employee, _amount, block.timestamp);
    }

    /**
     * @notice Check if payment is due for an employee
     * @param _employee Employee address
     * @return bool Payment due status
     */
    function isPaymentDue(address _employee) public view returns (bool) {
        Employee memory emp = employees[_employee];

        if (!emp.active) return false;
        if (emp.lastPaymentTime == 0) return true;

        uint256 timeElapsed = block.timestamp - emp.lastPaymentTime;
        uint256 paymentInterval = getPaymentInterval(emp.frequency);

        return timeElapsed >= paymentInterval;
    }

    /**
     * @notice Calculate payment amount based on frequency
     * @param _employee Employee address
     * @return amount Payment amount
     */
    function calculatePaymentAmount(address _employee) public view returns (uint256) {
        Employee memory emp = employees[_employee];

        if (emp.frequency == PaymentFrequency.WEEKLY) {
            return emp.salary / 52; // Weekly
        } else if (emp.frequency == PaymentFrequency.BIWEEKLY) {
            return emp.salary / 26; // Bi-weekly
        } else if (emp.frequency == PaymentFrequency.MONTHLY) {
            return emp.salary / 12; // Monthly
        } else {
            return emp.salary / 4; // Quarterly
        }
    }

    /**
     * @notice Get payment interval in seconds
     * @param _frequency Payment frequency
     * @return interval Interval in seconds
     */
    function getPaymentInterval(PaymentFrequency _frequency) public pure returns (uint256) {
        if (_frequency == PaymentFrequency.WEEKLY) {
            return 7 days;
        } else if (_frequency == PaymentFrequency.BIWEEKLY) {
            return 14 days;
        } else if (_frequency == PaymentFrequency.MONTHLY) {
            return 30 days;
        } else {
            return 90 days;
        }
    }

    /**
     * @notice Get employee details
     * @param _employee Employee address
     * @return name Employee name
     * @return salary Employee salary
     * @return frequency Payment frequency
     * @return lastPaymentTime Last payment timestamp
     * @return totalPaid Total amount paid
     * @return active Employee active status
     */
    function getEmployeeDetails(address _employee)
        external
        view
        returns (
            string memory name,
            uint256 salary,
            PaymentFrequency frequency,
            uint256 lastPaymentTime,
            uint256 totalPaid,
            bool active
        )
    {
        Employee memory emp = employees[_employee];
        return (
            emp.name,
            emp.salary,
            emp.frequency,
            emp.lastPaymentTime,
            emp.totalPaid,
            emp.active
        );
    }

    /**
     * @notice Get total active payroll cost (annual)
     * @return cost Total annual payroll cost
     */
    function getTotalActivePayrollCost() external view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < employeeList.length; i++) {
            if (employees[employeeList[i]].active) {
                total += employees[employeeList[i]].salary;
            }
        }
        return total;
    }

    /**
     * @notice Get payment history count
     * @return count Number of payments
     */
    function getPaymentHistoryCount() external view returns (uint256) {
        return paymentHistory.length;
    }

    /**
     * @notice Get all active employees
     * @return addresses Array of active employee addresses
     */
    function getActiveEmployees() external view returns (address[] memory) {
        address[] memory active = new address[](activeEmployees);
        uint256 index = 0;

        for (uint256 i = 0; i < employeeList.length; i++) {
            if (employees[employeeList[i]].active) {
                active[index] = employeeList[i];
                index++;
            }
        }

        return active;
    }

    /**
     * @notice Receive funds from treasury
     */
    receive() external payable {}

    /**
     * @notice Change admin
     * @param _newAdmin New admin address
     */
    function changeAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Invalid admin");
        address oldAdmin = admin;
        admin = _newAdmin;
        emit AdminChanged(oldAdmin, _newAdmin);
    }

    /**
     * @notice Get USDC balance of this contract
     * @return balance Current USDC balance
     */
    function getBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    /**
     * @notice Get total payments made to all employees
     * @return total Total amount paid out
     */
    function totalPaymentsMade() external view returns (uint256) {
        return totalPayrollCost;
    }

    /**
     * @notice Calculate next payment time for an employee
     * @param employeeIndex Index in employeeList
     * @return nextPayment Time of next payment
     */
    function getNextPaymentTime(uint256 employeeIndex) external view returns (uint256) {
        require(employeeIndex < employeeList.length, "Invalid index");

        address empAddr = employeeList[employeeIndex];
        Employee storage emp = employees[empAddr];

        if (!emp.active || emp.lastPaymentTime == 0) {
            return block.timestamp;
        }

        uint256 interval;
        if (emp.frequency == PaymentFrequency.WEEKLY) {
            interval = 7 days;
        } else if (emp.frequency == PaymentFrequency.BIWEEKLY) {
            interval = 14 days;
        } else if (emp.frequency == PaymentFrequency.MONTHLY) {
            interval = 30 days;
        } else {
            interval = 90 days;
        }

        return emp.lastPaymentTime + interval;
    }
}
