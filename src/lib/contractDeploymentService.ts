/**
 * Service for managing user's deployed contract addresses
 * Stores contract addresses in localStorage per wallet address
 */

export interface UserContracts {
  walletAddress: string;
  ruleEngine?: string;
  treasuryCore?: string;
  budgetAllocator?: string;
  scheduledPayments?: string;
  complianceTracker?: string;
  deployedAt: number;
  chainId: number;
}

const STORAGE_KEY = 'arcboard_user_contracts';

export class ContractDeploymentService {
  /**
   * Get all stored user contracts
   */
  static getAllContracts(): Record<string, UserContracts> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error reading contracts from localStorage:', error);
      return {};
    }
  }

  /**
   * Get contracts for a specific wallet address
   */
  static getUserContracts(walletAddress: string, chainId: number): UserContracts | null {
    const allContracts = this.getAllContracts();
    const key = `${walletAddress.toLowerCase()}_${chainId}`;
    return allContracts[key] || null;
  }

  /**
   * Check if user has deployed contracts
   */
  static hasDeployedContracts(walletAddress: string, chainId: number): boolean {
    const contracts = this.getUserContracts(walletAddress, chainId);
    return contracts !== null && !!contracts.ruleEngine;
  }

  /**
   * Save user's deployed contract addresses
   */
  static saveUserContracts(contracts: UserContracts): void {
    try {
      const allContracts = this.getAllContracts();
      const key = `${contracts.walletAddress.toLowerCase()}_${contracts.chainId}`;
      allContracts[key] = {
        ...contracts,
        deployedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allContracts));
      console.log('✅ Saved user contracts:', contracts);
    } catch (error) {
      console.error('Error saving contracts to localStorage:', error);
      throw error;
    }
  }

  /**
   * Update a specific contract address
   */
  static updateContractAddress(
    walletAddress: string,
    chainId: number,
    contractName: keyof Omit<UserContracts, 'walletAddress' | 'deployedAt' | 'chainId'>,
    address: string
  ): void {
    const contracts = this.getUserContracts(walletAddress, chainId) || {
      walletAddress,
      chainId,
      deployedAt: Date.now(),
    };

    contracts[contractName] = address;
    this.saveUserContracts(contracts);
  }

  /**
   * Clear all contracts for a user (for testing/reset)
   */
  static clearUserContracts(walletAddress: string, chainId: number): void {
    try {
      const allContracts = this.getAllContracts();
      const key = `${walletAddress.toLowerCase()}_${chainId}`;
      delete allContracts[key];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allContracts));
      console.log('🗑️ Cleared contracts for', walletAddress);
    } catch (error) {
      console.error('Error clearing contracts:', error);
    }
  }

  /**
   * Export all contracts (for backup)
   */
  static exportContracts(): string {
    return JSON.stringify(this.getAllContracts(), null, 2);
  }

  /**
   * Import contracts (from backup)
   */
  static importContracts(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      console.log('✅ Imported contracts');
    } catch (error) {
      console.error('Error importing contracts:', error);
      throw error;
    }
  }
}

