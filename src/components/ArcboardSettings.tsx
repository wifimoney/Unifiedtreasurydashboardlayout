import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Settings, Shield, Bell, Zap, Users, Save } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface ArcboardSettingsProps {
  onSave: () => void;
}

export function ArcboardSettings({ onSave }: ArcboardSettingsProps) {
  const [settings, setSettings] = useState({
    treasuryName: 'ARCBOARD Treasury',
    refreshInterval: '30',
    enableNotifications: true,
    notificationEmail: 'treasury@company.com',
    multiSigThreshold: '3',
    gasOptimization: true,
    autoRebalancing: false,
    complianceAlerts: true,
    dataRetention: '365',
    apiAccess: true,
  });

  const handleSave = () => {
    toast.success('Settings saved successfully');
    onSave();
  };

  const handleReset = () => {
    setSettings({
      treasuryName: 'ARCBOARD Treasury',
      refreshInterval: '30',
      enableNotifications: true,
      notificationEmail: 'treasury@company.com',
      multiSigThreshold: '3',
      gasOptimization: true,
      autoRebalancing: false,
      complianceAlerts: true,
      dataRetention: '365',
      apiAccess: true,
    });
    toast.success('Settings reset to defaults');
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* General Settings */}
      <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950 rounded-xl flex items-center justify-center">
              <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="dark:text-white">General Settings</CardTitle>
              <CardDescription className="dark:text-gray-400">
                Configure your ARCBOARD treasury preferences
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="treasuryName" className="dark:text-gray-200">Treasury Name</Label>
            <Input
              id="treasuryName"
              value={settings.treasuryName}
              onChange={(e) => setSettings({ ...settings, treasuryName: e.target.value })}
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="refreshInterval" className="dark:text-gray-200">Data Refresh Interval</Label>
            <Select
              value={settings.refreshInterval}
              onValueChange={(value) => setSettings({ ...settings, refreshInterval: value })}
            >
              <SelectTrigger id="refreshInterval" className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-600">
                <SelectItem value="15" className="dark:text-white dark:hover:bg-gray-700">15 seconds</SelectItem>
                <SelectItem value="30" className="dark:text-white dark:hover:bg-gray-700">30 seconds</SelectItem>
                <SelectItem value="60" className="dark:text-white dark:hover:bg-gray-700">1 minute</SelectItem>
                <SelectItem value="300" className="dark:text-white dark:hover:bg-gray-700">5 minutes</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              How often to refresh balance and transaction data
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dataRetention" className="dark:text-gray-200">Data Retention Period (days)</Label>
            <Input
              id="dataRetention"
              type="number"
              value={settings.dataRetention}
              onChange={(e) => setSettings({ ...settings, dataRetention: e.target.value })}
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Historical data retention for audit logs
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-950 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <CardTitle className="dark:text-white">Security & Multi-Signature</CardTitle>
              <CardDescription className="dark:text-gray-400">
                Manage security protocols and approval requirements
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="multiSigThreshold" className="dark:text-gray-200">Default Multi-Sig Threshold</Label>
            <Select
              value={settings.multiSigThreshold}
              onValueChange={(value) => setSettings({ ...settings, multiSigThreshold: value })}
            >
              <SelectTrigger id="multiSigThreshold" className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-600">
                <SelectItem value="2" className="dark:text-white dark:hover:bg-gray-700">2 of N signatures</SelectItem>
                <SelectItem value="3" className="dark:text-white dark:hover:bg-gray-700">3 of N signatures</SelectItem>
                <SelectItem value="4" className="dark:text-white dark:hover:bg-gray-700">4 of N signatures</SelectItem>
                <SelectItem value="5" className="dark:text-white dark:hover:bg-gray-700">5 of N signatures</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div className="space-y-0.5">
              <Label className="dark:text-gray-200">Compliance Alerts</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Receive alerts for flagged transactions
              </p>
            </div>
            <Switch
              checked={settings.complianceAlerts}
              onCheckedChange={(checked) => setSettings({ ...settings, complianceAlerts: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div className="space-y-0.5">
              <Label className="dark:text-gray-200">API Access</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Enable programmatic access to treasury data
              </p>
            </div>
            <Switch
              checked={settings.apiAccess}
              onCheckedChange={(checked) => setSettings({ ...settings, apiAccess: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-950 rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle className="dark:text-white">Notifications</CardTitle>
              <CardDescription className="dark:text-gray-400">
                Configure alert and notification preferences
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div className="space-y-0.5">
              <Label className="dark:text-gray-200">Enable Notifications</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Receive email notifications for important events
              </p>
            </div>
            <Switch
              checked={settings.enableNotifications}
              onCheckedChange={(checked) => setSettings({ ...settings, enableNotifications: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notificationEmail" className="dark:text-gray-200">Notification Email</Label>
            <Input
              id="notificationEmail"
              type="email"
              value={settings.notificationEmail}
              onChange={(e) => setSettings({ ...settings, notificationEmail: e.target.value })}
              className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Optimization */}
      <Card className="dark:bg-gray-800/50 dark:border-gray-700 border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-950 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <CardTitle className="dark:text-white">Optimization & Automation</CardTitle>
              <CardDescription className="dark:text-gray-400">
                Automated treasury management features
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div className="space-y-0.5">
              <Label className="dark:text-gray-200">Gas Optimization</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Automatically optimize USDC gas costs
              </p>
            </div>
            <Switch
              checked={settings.gasOptimization}
              onCheckedChange={(checked) => setSettings({ ...settings, gasOptimization: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div className="space-y-0.5">
              <Label className="dark:text-gray-200">Auto-Rebalancing</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Automatically rebalance across networks
              </p>
            </div>
            <Switch
              checked={settings.autoRebalancing}
              onCheckedChange={(checked) => setSettings({ ...settings, autoRebalancing: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button onClick={handleSave} size="lg" className="flex-1">
          <Save className="w-5 h-5 mr-2" />
          Save Settings
        </Button>
        <Button onClick={handleReset} variant="outline" size="lg" className="dark:border-gray-600 dark:hover:bg-gray-700">
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}
