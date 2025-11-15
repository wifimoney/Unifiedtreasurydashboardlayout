// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC2771Context} from "@openzeppelin/contracts/metatx/ERC2771Context.sol";

/**
 * @title BudgetAllocator
 * @notice Department budget management and allocation system
 * @dev Manages department budgets, spending, and fund requests
 */
contract BudgetAllocator is ERC2771Context {
    event TrustedForwarderUpdated(address indexed forwarder, address indexed updater);
    // Structs
    struct Department {
        uint256 id;
        string name;
        uint256 totalBudget;
        uint256 spentAmount;
        uint256 availableBalance;
        address manager;
        bool active;
        uint256 createdAt;
    }

    struct FundRequest {
        uint256 id;
        uint256 departmentId;
        address requester;
        uint256 amount;
        string reason;
        bool approved;
        bool rejected;
        bool executed;
        uint256 requestedAt;
        address approvedBy;
    }

    struct Expense {
        uint256 id;
        uint256 departmentId;
        uint256 amount;
        string description;
        address spentBy;
        uint256 timestamp;
    }

    // State variables
    address public treasury;
    address public admin;
    IERC20 public usdc;
    address private _trustedForwarder;

    mapping(uint256 => Department) public departments;
    uint256 public departmentCount;

    mapping(uint256 => FundRequest) public fundRequests;
    uint256 public requestCount;

    mapping(uint256 => Expense[]) public departmentExpenses;
    Expense[] public allExpenses;

    // Events
    event DepartmentCreated(uint256 indexed departmentId, string name, uint256 budget, address manager);
    event BudgetAllocated(uint256 indexed departmentId, uint256 amount);
    event BudgetUpdated(uint256 indexed departmentId, uint256 newBudget);
    event FundRequested(uint256 indexed requestId, uint256 indexed departmentId, uint256 amount, string reason);
    event RequestApproved(uint256 indexed requestId, address indexed approver);
    event RequestRejected(uint256 indexed requestId, address indexed rejector);
    event FundsTransferred(uint256 indexed departmentId, address indexed recipient, uint256 amount);
    event ExpenseRecorded(uint256 indexed departmentId, uint256 amount, string description);
    event DepartmentDeactivated(uint256 indexed departmentId);

    // Modifiers
    modifier onlyAdmin() {
        _onlyAdmin();
        _;
    }

    modifier onlyTreasury() {
        _onlyTreasury();
        _;
    }

    modifier departmentExists(uint256 _departmentId) {
        _departmentExists(_departmentId);
        _;
    }

    modifier onlyDepartmentManager(uint256 _departmentId) {
        _onlyDepartmentManager(_departmentId);
        _;
    }

    // Internal modifier functions
    function _onlyAdmin() internal view {
        require(_msgSender() == admin, "Only admin can call");
    }

    function _onlyTreasury() internal view {
        require(_msgSender() == treasury, "Only treasury can call");
    }

    function _departmentExists(uint256 _departmentId) internal view {
        require(_departmentId < departmentCount, "Department does not exist");
        require(departments[_departmentId].active, "Department is inactive");
    }

    function _onlyDepartmentManager(uint256 _departmentId) internal view {
        require(departments[_departmentId].manager == _msgSender(), "Only department manager");
    }

    /**
     * @notice Initialize budget allocator
     */
    constructor(address trustedForwarder) ERC2771Context(trustedForwarder) {
        require(trustedForwarder != address(0), "Invalid forwarder");
        _trustedForwarder = trustedForwarder;
        admin = _msgSender();
    }

    function setTrustedForwarder(address newForwarder) external onlyAdmin {
        require(newForwarder != address(0), "Invalid forwarder");
        _trustedForwarder = newForwarder;
        emit TrustedForwarderUpdated(newForwarder, _msgSender());
    }

    function trustedForwarder() external view returns (address) {
        return _trustedForwarder;
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
     * @notice Create a new department
     * @param _name Department name
     * @param _budget Initial budget allocation
     * @param _manager Department manager address
     * @return departmentId New department ID
     */
    function createDepartment(
        string memory _name,
        uint256 _budget,
        address _manager
    ) external onlyAdmin returns (uint256) {
        require(bytes(_name).length > 0, "Name required");
        require(_manager != address(0), "Invalid manager");

        uint256 departmentId = departmentCount;

        departments[departmentId] = Department({
            id: departmentId,
            name: _name,
            totalBudget: _budget,
            spentAmount: 0,
            availableBalance: _budget,
            manager: _manager,
            active: true,
            createdAt: block.timestamp
        });

        departmentCount++;

        emit DepartmentCreated(departmentId, _name, _budget, _manager);

        return departmentId;
    }

    /**
     * @notice Allocate additional funds to a department
     * @param _departmentId Department ID
     * @param _amount Amount to allocate
     */
    function allocateFunds(uint256 _departmentId, uint256 _amount)
        external
        onlyAdmin
        departmentExists(_departmentId)
    {
        require(_amount > 0, "Amount must be greater than 0");

        Department storage dept = departments[_departmentId];
        dept.totalBudget += _amount;
        dept.availableBalance += _amount;

        emit BudgetAllocated(_departmentId, _amount);
    }

    /**
     * @notice Request additional funds for a department
     * @param _departmentId Department ID
     * @param _amount Amount requested
     * @param _reason Reason for request
     * @return requestId Fund request ID
     */
    function requestFunds(
        uint256 _departmentId,
        uint256 _amount,
        string memory _reason
    ) external departmentExists(_departmentId) returns (uint256) {
        require(_amount > 0, "Amount must be greater than 0");
        require(bytes(_reason).length > 0, "Reason required");

        uint256 requestId = requestCount;

        fundRequests[requestId] = FundRequest({
            id: requestId,
            departmentId: _departmentId,
            requester: _msgSender(),
            amount: _amount,
            reason: _reason,
            approved: false,
            rejected: false,
            executed: false,
            requestedAt: block.timestamp,
            approvedBy: address(0)
        });

        requestCount++;

        emit FundRequested(requestId, _departmentId, _amount, _reason);

        return requestId;
    }

    /**
     * @notice Approve a fund request
     * @param _requestId Request ID
     */
    function approveFundRequest(uint256 _requestId) external onlyAdmin {
        require(_requestId < requestCount, "Request does not exist");

        FundRequest storage request = fundRequests[_requestId];
        require(!request.approved && !request.rejected, "Request already processed");
        require(!request.executed, "Request already executed");

        request.approved = true;
        request.approvedBy = _msgSender();

        // Automatically allocate funds
        Department storage dept = departments[request.departmentId];
        dept.totalBudget += request.amount;
        dept.availableBalance += request.amount;

        request.executed = true;

        emit RequestApproved(_requestId, _msgSender());
        emit BudgetAllocated(request.departmentId, request.amount);
    }

    /**
     * @notice Reject a fund request
     * @param _requestId Request ID
     */
    function rejectFundRequest(uint256 _requestId) external onlyAdmin {
        require(_requestId < requestCount, "Request does not exist");

        FundRequest storage request = fundRequests[_requestId];
        require(!request.approved && !request.rejected, "Request already processed");

        request.rejected = true;

        emit RequestRejected(_requestId, _msgSender());
    }

    /**
     * @notice Record an expense for a department
     * @param _departmentId Department ID
     * @param _amount Expense amount
     * @param _description Expense description
     */
    function recordExpense(
        uint256 _departmentId,
        uint256 _amount,
        string memory _description
    ) external departmentExists(_departmentId) onlyDepartmentManager(_departmentId) {
        require(_amount > 0, "Amount must be greater than 0");

        Department storage dept = departments[_departmentId];
        require(dept.availableBalance >= _amount, "Insufficient budget");

        dept.spentAmount += _amount;
        dept.availableBalance -= _amount;

        Expense memory expense = Expense({
            id: allExpenses.length,
            departmentId: _departmentId,
            amount: _amount,
            description: _description,
            spentBy: _msgSender(),
            timestamp: block.timestamp
        });

        departmentExpenses[_departmentId].push(expense);
        allExpenses.push(expense);

        emit ExpenseRecorded(_departmentId, _amount, _description);
    }

    /**
     * @notice Transfer funds from department budget
     * @param _departmentId Department ID
     * @param _recipient Recipient address
     * @param _amount Amount to transfer
     */
    function transferFunds(
        uint256 _departmentId,
        address _recipient,
        uint256 _amount
    ) external departmentExists(_departmentId) onlyDepartmentManager(_departmentId) {
        require(_recipient != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be greater than 0");

        Department storage dept = departments[_departmentId];
        require(dept.availableBalance >= _amount, "Insufficient budget");
        require(address(this).balance >= _amount, "Insufficient contract balance");

        dept.spentAmount += _amount;
        dept.availableBalance -= _amount;

        (bool success, ) = _recipient.call{value: _amount}("");
        require(success, "Transfer failed");

        emit FundsTransferred(_departmentId, _recipient, _amount);
    }

    /**
     * @notice Get department details
     * @param _departmentId Department ID
     * @return name Department name
     * @return totalBudget Total budget allocated
     * @return spentAmount Amount spent
     * @return availableBalance Available balance
     * @return manager Department manager
     * @return active Department active status
     */
    function getDepartmentDetails(uint256 _departmentId)
        external
        view
        returns (
            string memory name,
            uint256 totalBudget,
            uint256 spentAmount,
            uint256 availableBalance,
            address manager,
            bool active
        )
    {
        Department memory dept = departments[_departmentId];
        return (
            dept.name,
            dept.totalBudget,
            dept.spentAmount,
            dept.availableBalance,
            dept.manager,
            dept.active
        );
    }

    /**
     * @notice Get department balance
     * @param _departmentId Department ID
     * @return balance Available balance
     */
    function getDepartmentBalance(uint256 _departmentId)
        external
        view
        departmentExists(_departmentId)
        returns (uint256)
    {
        return departments[_departmentId].availableBalance;
    }

    /**
     * @notice Get department expenses
     * @param _departmentId Department ID
     * @return expenses Array of expenses
     */
    function getDepartmentExpenses(uint256 _departmentId)
        external
        view
        returns (Expense[] memory)
    {
        return departmentExpenses[_departmentId];
    }

    /**
     * @notice Get total budget across all active departments
     * @return total Total budget
     */
    function getTotalBudget() external view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < departmentCount; i++) {
            if (departments[i].active) {
                total += departments[i].totalBudget;
            }
        }
        return total;
    }

    /**
     * @notice Get total spent across all departments
     * @return total Total spent
     */
    function getTotalSpent() external view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < departmentCount; i++) {
            if (departments[i].active) {
                total += departments[i].spentAmount;
            }
        }
        return total;
    }

    /**
     * @notice Get pending fund requests
     * @return requests Array of pending request IDs
     */
    function getPendingRequests() external view returns (uint256[] memory) {
        uint256 pendingCount = 0;

        // Count pending requests
        for (uint256 i = 0; i < requestCount; i++) {
            if (!fundRequests[i].approved && !fundRequests[i].rejected) {
                pendingCount++;
            }
        }

        // Populate array
        uint256[] memory pending = new uint256[](pendingCount);
        uint256 index = 0;

        for (uint256 i = 0; i < requestCount; i++) {
            if (!fundRequests[i].approved && !fundRequests[i].rejected) {
                pending[index] = i;
                index++;
            }
        }

        return pending;
    }

    /**
     * @notice Deactivate a department
     * @param _departmentId Department ID
     */
    function deactivateDepartment(uint256 _departmentId)
        external
        onlyAdmin
        departmentExists(_departmentId)
    {
        departments[_departmentId].active = false;
        emit DepartmentDeactivated(_departmentId);
    }

    /**
     * @notice Update department manager
     * @param _departmentId Department ID
     * @param _newManager New manager address
     */
    function updateDepartmentManager(uint256 _departmentId, address _newManager)
        external
        onlyAdmin
        departmentExists(_departmentId)
    {
        require(_newManager != address(0), "Invalid manager");
        departments[_departmentId].manager = _newManager;
    }

    /**
     * @notice Receive funds from treasury
     */
    receive() external payable {}

    /**
     * @notice Get USDC balance of this contract
     * @return balance Current USDC balance
     */
    function getBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    function _msgSender() internal view override returns (address sender) {
        return ERC2771Context._msgSender();
    }

    function _msgData() internal view override returns (bytes calldata) {
        return ERC2771Context._msgData();
    }

    function isTrustedForwarder(address forwarder) public view override returns (bool) {
        return forwarder == _trustedForwarder;
    }
}
