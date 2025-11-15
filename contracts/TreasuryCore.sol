// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title TreasuryCore
 * @notice Core treasury management contract with multi-signature functionality
 * @dev Manages treasury funds, proposals, and multi-sig approvals
 */
contract TreasuryCore {
    // Events
    event FundsDeposited(address indexed from, uint256 amount, uint256 timestamp);
    event TransactionProposed(uint256 indexed txId, address indexed proposer, address to, uint256 amount);
    event TransactionApproved(uint256 indexed txId, address indexed approver);
    event TransactionExecuted(uint256 indexed txId, address indexed executor);
    event TransactionCancelled(uint256 indexed txId, address indexed canceller);
    event OwnerAdded(address indexed owner);
    event OwnerRemoved(address indexed owner);
    event ThresholdChanged(uint256 newThreshold);
    event Paused(address indexed by);
    event Unpaused(address indexed by);

    // Structs
    struct Transaction {
        address to;
        uint256 amount;
        bytes data;
        bool executed;
        bool cancelled;
        uint256 approvalCount;
        uint256 proposedAt;
        address proposer;
    }

    // State variables
    mapping(address => bool) public isOwner;
    address[] public owners;
    uint256 public threshold;

    Transaction[] public transactions;
    mapping(uint256 => mapping(address => bool)) public hasApproved;

    bool public paused;

    // Modifiers
    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    modifier txExists(uint256 _txId) {
        _txExists(_txId);
        _;
    }

    modifier notExecuted(uint256 _txId) {
        _notExecuted(_txId);
        _;
    }

    modifier notCancelled(uint256 _txId) {
        _notCancelled(_txId);
        _;
    }

    modifier notApproved(uint256 _txId) {
        _notApproved(_txId);
        _;
    }

    modifier whenNotPaused() {
        _whenNotPaused();
        _;
    }

    modifier whenPaused() {
        _whenPaused();
        _;
    }

    // Internal modifier functions
    function _onlyOwner() internal view {
        require(isOwner[msg.sender], "Not an owner");
    }

    function _txExists(uint256 _txId) internal view {
        require(_txId < transactions.length, "Transaction does not exist");
    }

    function _notExecuted(uint256 _txId) internal view {
        require(!transactions[_txId].executed, "Transaction already executed");
    }

    function _notCancelled(uint256 _txId) internal view {
        require(!transactions[_txId].cancelled, "Transaction cancelled");
    }

    function _notApproved(uint256 _txId) internal view {
        require(!hasApproved[_txId][msg.sender], "Transaction already approved");
    }

    function _whenNotPaused() internal view {
        require(!paused, "Contract is paused");
    }

    function _whenPaused() internal view {
        require(paused, "Contract is not paused");
    }

    /**
     * @notice Initialize the treasury with deployer as owner
     */
    constructor() {
        isOwner[msg.sender] = true;
        owners.push(msg.sender);
        threshold = 1;
    }

    /**
     * @notice Receive USDC deposits
     */
    receive() external payable {
        emit FundsDeposited(msg.sender, msg.value, block.timestamp);
    }

    /**
     * @notice Get the current treasury balance
     * @return balance Current balance in wei
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Propose a new transaction
     * @param _to Recipient address
     * @param _amount Amount to send
     * @param _data Additional data for the transaction
     * @return txId Transaction ID
     */
    function proposeTransaction(
        address _to,
        uint256 _amount,
        bytes memory _data
    ) external onlyOwner whenNotPaused returns (uint256) {
        require(_to != address(0), "Invalid recipient");

        uint256 txId = transactions.length;

        transactions.push(Transaction({
            to: _to,
            amount: _amount,
            data: _data,
            executed: false,
            cancelled: false,
            approvalCount: 0,
            proposedAt: block.timestamp,
            proposer: msg.sender
        }));

        emit TransactionProposed(txId, msg.sender, _to, _amount);

        return txId;
    }

    /**
     * @notice Approve a proposed transaction
     * @param _txId Transaction ID to approve
     */
    function approveTransaction(uint256 _txId)
        external
        onlyOwner
        txExists(_txId)
        notExecuted(_txId)
        notCancelled(_txId)
        notApproved(_txId)
        whenNotPaused
    {
        hasApproved[_txId][msg.sender] = true;
        transactions[_txId].approvalCount += 1;

        emit TransactionApproved(_txId, msg.sender);
    }

    /**
     * @notice Execute an approved transaction
     * @param _txId Transaction ID to execute
     */
    function executeTransaction(uint256 _txId)
        external
        onlyOwner
        txExists(_txId)
        notExecuted(_txId)
        notCancelled(_txId)
        whenNotPaused
    {
        Transaction storage txn = transactions[_txId];

        require(txn.approvalCount >= threshold, "Insufficient approvals");
        require(address(this).balance >= txn.amount, "Insufficient balance");

        txn.executed = true;

        (bool success, ) = txn.to.call{value: txn.amount}(txn.data);
        require(success, "Transaction execution failed");

        emit TransactionExecuted(_txId, msg.sender);
    }

    /**
     * @notice Cancel a proposed transaction
     * @param _txId Transaction ID to cancel
     */
    function cancelTransaction(uint256 _txId)
        external
        onlyOwner
        txExists(_txId)
        notExecuted(_txId)
        notCancelled(_txId)
    {
        Transaction storage txn = transactions[_txId];
        require(txn.proposer == msg.sender, "Only proposer can cancel");

        txn.cancelled = true;

        emit TransactionCancelled(_txId, msg.sender);
    }

    /**
     * @notice Pause the contract (emergency)
     */
    function pause() external onlyOwner whenNotPaused {
        paused = true;
        emit Paused(msg.sender);
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner whenPaused {
        paused = false;
        emit Unpaused(msg.sender);
    }

    /**
     * @notice Get transaction details
     * @param _txId Transaction ID
     * @return to Recipient address
     * @return amount Transaction amount
     * @return data Transaction data
     * @return executed Execution status
     * @return cancelled Cancellation status
     * @return approvalCount Number of approvals
     */
    function getTransaction(uint256 _txId)
        external
        view
        txExists(_txId)
        returns (
            address to,
            uint256 amount,
            bytes memory data,
            bool executed,
            bool cancelled,
            uint256 approvalCount
        )
    {
        Transaction memory txn = transactions[_txId];
        return (
            txn.to,
            txn.amount,
            txn.data,
            txn.executed,
            txn.cancelled,
            txn.approvalCount
        );
    }

    /**
     * @notice Get total number of transactions
     * @return count Transaction count
     */
    function getTransactionCount() external view returns (uint256) {
        return transactions.length;
    }

    /**
     * @notice Get all owners
     * @return Array of owner addresses
     */
    function getOwners() external view returns (address[] memory) {
        return owners;
    }

    /**
     * @notice Check if transaction is approved by an owner
     * @param _txId Transaction ID
     * @param _owner Owner address
     * @return bool Approval status
     */
    function isApproved(uint256 _txId, address _owner) external view returns (bool) {
        return hasApproved[_txId][_owner];
    }

    /**
     * @notice Get total number of transactions
     * @return count Total transactions
     */
    function transactionCount() external view returns (uint256) {
        return transactions.length;
    }
}
