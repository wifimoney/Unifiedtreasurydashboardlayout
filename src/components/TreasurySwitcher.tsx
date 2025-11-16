import { useTreasury } from '../contexts/TreasuryContext';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus } from 'lucide-react';

export function TreasurySwitcher() {
  const { activeTreasury, allTreasuries, setActiveTreasury } = useTreasury();
  const navigate = useNavigate();

  const handleValueChange = (value: string) => {
    if (value === '__new__') {
      navigate('/deploy');
    } else {
      setActiveTreasury(value);
      // Refresh the page to load new treasury data
      window.location.reload();
    }
  };

  if (allTreasuries.length === 0) {
    return null;
  }

  return (
    <Select value={activeTreasury?.id || ''} onValueChange={handleValueChange}>
      <SelectTrigger className="w-[200px] dark:bg-gray-800 dark:border-gray-700 dark:text-white">
        <SelectValue placeholder="Select Treasury">
          {activeTreasury?.name || 'No Treasury'}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
        {allTreasuries.map((treasury) => (
          <SelectItem
            key={treasury.id}
            value={treasury.id}
            className="dark:text-white dark:hover:bg-gray-700"
          >
            <div>
              <div>{treasury.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                {treasury.contracts.treasuryCore.slice(0, 10)}...
              </div>
            </div>
          </SelectItem>
        ))}
        <SelectItem value="__new__" className="dark:text-white dark:hover:bg-gray-700">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Deploy New Treasury
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

