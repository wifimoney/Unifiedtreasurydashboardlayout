import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { toast } from 'sonner@2.0.3';

interface SettingsPanelProps {
  onSave: () => void;
}

export function SettingsPanel({ onSave }: SettingsPanelProps) {
  const [settings, setSettings] = useState({
    rebalanceThreshold: '10',
    minBalanceAlert: '100000',
    autoRebalance: false,
    alertsEnabled: true,
    refreshInterval: '30',
    preferredStablecoin: 'USDC',
    slippageTolerance: '0.5',
  });

  const handleSave = () => {
    // In a real app, this would save to backend/local storage
    toast.success('Settings saved successfully');
    onSave();
  };

  const handleReset = () => {
    setSettings({
      rebalanceThreshold: '10',
      minBalanceAlert: '100000',
      autoRebalance: false,
      alertsEnabled: true,
      refreshInterval: '30',
      preferredStablecoin: 'USDC',
      slippageTolerance: '0.5',
    });
    toast.success('Settings reset to defaults');
  };

  return (
    <div className="max-w-3xl space-y-6">
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Rebalancing Settings</CardTitle>
          <CardDescription className="dark:text-gray-400">Configure automatic rebalancing parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="rebalanceThreshold" className="dark:text-gray-200">Rebalance Threshold (%)</Label>
            <Input
              id="rebalanceThreshold"
              type="number"
              value={settings.rebalanceThreshold}
              onChange={(e) => setSettings({ ...settings, rebalanceThreshold: e.target.value })}
              placeholder="10"
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Trigger rebalancing when chain balance deviates by this percentage
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="autoRebalance" className="dark:text-gray-200">Auto-Rebalance</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">Automatically rebalance when threshold is reached</p>
            </div>
            <Switch
              id="autoRebalance"
              checked={settings.autoRebalance}
              onCheckedChange={(checked) => setSettings({ ...settings, autoRebalance: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slippageTolerance" className="dark:text-gray-200">Slippage Tolerance (%)</Label>
            <Input
              id="slippageTolerance"
              type="number"
              step="0.1"
              value={settings.slippageTolerance}
              onChange={(e) => setSettings({ ...settings, slippageTolerance: e.target.value })}
              placeholder="0.5"
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Maximum acceptable slippage for rebalancing transactions
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferredStablecoin" className="dark:text-gray-200">Preferred Stablecoin</Label>
            <Select
              value={settings.preferredStablecoin}
              onValueChange={(value) => setSettings({ ...settings, preferredStablecoin: value })}
            >
              <SelectTrigger id="preferredStablecoin" className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <SelectValue placeholder="Select stablecoin" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-600">
                <SelectItem value="USDC" className="dark:text-white dark:hover:bg-gray-700">USDC</SelectItem>
                <SelectItem value="USDT" className="dark:text-white dark:hover:bg-gray-700">USDT</SelectItem>
                <SelectItem value="DAI" className="dark:text-white dark:hover:bg-gray-700">DAI</SelectItem>
                <SelectItem value="BUSD" className="dark:text-white dark:hover:bg-gray-700">BUSD</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Default stablecoin for rebalancing operations
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="dark:text-white">Alerts & Notifications</CardTitle>
          <CardDescription className="dark:text-gray-400">Manage your notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="alertsEnabled" className="dark:text-gray-200">Enable Alerts</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">Receive notifications for important events</p>
            </div>
            <Switch
              id="alertsEnabled"
              checked={settings.alertsEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, alertsEnabled: checked })}
            />
          </div>

          <Separator className="dark:bg-gray-700" />

          <div className="space-y-2">
            <Label htmlFor="minBalanceAlert" className="dark:text-gray-200">Minimum Balance Alert (USD)</Label>
            <Input
              id="minBalanceAlert"
              type="number"
              value={settings.minBalanceAlert}
              onChange={(e) => setSettings({ ...settings, minBalanceAlert: e.target.value })}
              placeholder="100000"
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Get notified when chain balance falls below this amount
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="refreshInterval" className="dark:text-gray-200">Dashboard Refresh Interval (seconds)</Label>
            <Select
              value={settings.refreshInterval}
              onValueChange={(value) => setSettings({ ...settings, refreshInterval: value })}
            >
              <SelectTrigger id="refreshInterval" className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <SelectValue placeholder="Select interval" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-600">
                <SelectItem value="15" className="dark:text-white dark:hover:bg-gray-700">15 seconds</SelectItem>
                <SelectItem value="30" className="dark:text-white dark:hover:bg-gray-700">30 seconds</SelectItem>
                <SelectItem value="60" className="dark:text-white dark:hover:bg-gray-700">1 minute</SelectItem>
                <SelectItem value="300" className="dark:text-white dark:hover:bg-gray-700">5 minutes</SelectItem>
                <SelectItem value="0" className="dark:text-white dark:hover:bg-gray-700">Manual only</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              How often to automatically refresh balance data
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button onClick={handleSave} className="flex-1">
          Save Settings
        </Button>
        <Button onClick={handleReset} variant="outline" className="dark:border-gray-600 dark:hover:bg-gray-700">
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}