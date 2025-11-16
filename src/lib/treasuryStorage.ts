export interface Treasury {
  id: string;
  name: string;
  owner: string;
  network: string;
  contracts: {
    treasuryCore: string;
    budgetAllocator: string;
    payrollManager: string;
    complianceTracker: string;
    ruleEngine: string;
  };
  deployedAt: number;
  isActive: boolean;
}

export interface TreasuryStore {
  treasuries: Treasury[];
  activeTreasuryId: string | null;
}

const STORAGE_KEY = 'arcboard-treasuries';

export function getTreasuryStore(): TreasuryStore {
  if (typeof window === 'undefined') {
    return { treasuries: [], activeTreasuryId: null };
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return { treasuries: [], activeTreasuryId: null };
  }

  try {
    return JSON.parse(stored);
  } catch {
    return { treasuries: [], activeTreasuryId: null };
  }
}

export function saveTreasuryStore(store: TreasuryStore) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function addTreasury(treasury: Treasury) {
  const store = getTreasuryStore();
  store.treasuries.push(treasury);

  // Set as active if it's the first one
  if (!store.activeTreasuryId) {
    store.activeTreasuryId = treasury.id;
  }

  saveTreasuryStore(store);
}

export function getActiveTreasury(): Treasury | null {
  const store = getTreasuryStore();
  if (!store.activeTreasuryId) return null;

  return store.treasuries.find(t => t.id === store.activeTreasuryId) || null;
}

export function setActiveTreasury(id: string) {
  const store = getTreasuryStore();
  store.activeTreasuryId = id;
  saveTreasuryStore(store);
}

export function getAllTreasuries(): Treasury[] {
  return getTreasuryStore().treasuries;
}

export function removeTreasury(id: string) {
  const store = getTreasuryStore();
  store.treasuries = store.treasuries.filter(t => t.id !== id);

  // If we removed the active one, switch to first available
  if (store.activeTreasuryId === id) {
    store.activeTreasuryId = store.treasuries[0]?.id || null;
  }

  saveTreasuryStore(store);
}

