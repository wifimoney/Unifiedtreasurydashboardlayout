import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Treasury,
  TreasuryStore,
  getTreasuryStore,
  saveTreasuryStore,
  addTreasury as addTreasuryToStore,
  getActiveTreasury as getStoredActiveTreasury,
  setActiveTreasury as setStoredActiveTreasury,
  getAllTreasuries as getStoredTreasuries,
  removeTreasury as removeTreasuryFromStore,
} from '../lib/treasuryStorage';

interface TreasuryContextType {
  activeTreasury: Treasury | null;
  allTreasuries: Treasury[];
  setActiveTreasury: (id: string) => void;
  addTreasury: (treasury: Treasury) => void;
  removeTreasury: (id: string) => void;
  hasAnyTreasury: boolean;
  isLoading: boolean;
}

const TreasuryContext = createContext<TreasuryContextType | undefined>(undefined);

export function TreasuryProvider({ children }: { children: ReactNode }) {
  const [activeTreasury, setActiveTreasuryState] = useState<Treasury | null>(null);
  const [allTreasuries, setAllTreasuries] = useState<Treasury[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    const active = getStoredActiveTreasury();
    const all = getStoredTreasuries();

    setActiveTreasuryState(active);
    setAllTreasuries(all);
    setIsLoading(false);
  }, []);

  const setActiveTreasury = (id: string) => {
    setStoredActiveTreasury(id);
    const treasury = allTreasuries.find(t => t.id === id);
    setActiveTreasuryState(treasury || null);
  };

  const addTreasury = (treasury: Treasury) => {
    addTreasuryToStore(treasury);
    setAllTreasuries([...allTreasuries, treasury]);

    // Set as active if it's the first one
    if (allTreasuries.length === 0) {
      setActiveTreasuryState(treasury);
    }
  };

  const removeTreasury = (id: string) => {
    removeTreasuryFromStore(id);
    const newTreasuries = allTreasuries.filter(t => t.id !== id);
    setAllTreasuries(newTreasuries);

    // Update active if we removed it
    if (activeTreasury?.id === id) {
      const newActive = newTreasuries[0] || null;
      setActiveTreasuryState(newActive);
    }
  };

  const hasAnyTreasury = allTreasuries.length > 0;

  return (
    <TreasuryContext.Provider
      value={{
        activeTreasury,
        allTreasuries,
        setActiveTreasury,
        addTreasury,
        removeTreasury,
        hasAnyTreasury,
        isLoading,
      }}
    >
      {children}
    </TreasuryContext.Provider>
  );
}

export function useTreasury() {
  const context = useContext(TreasuryContext);
  if (context === undefined) {
    throw new Error('useTreasury must be used within a TreasuryProvider');
  }
  return context;
}

