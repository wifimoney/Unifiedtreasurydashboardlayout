import { useState } from 'react';
import QRCode from 'react-qr-code';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Copy, Check, X } from 'lucide-react';

interface ReceiveModalProps {
  open: boolean;
  onClose: () => void;
  address: string;
}

export function ReceiveModal({ open, onClose, address }: ReceiveModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Receive Funds</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Send funds to this address from any network
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4 py-4">
          {/* QR Code */}
          <div className="p-4 bg-white rounded-lg border-2 border-gray-200 dark:border-gray-700">
            <QRCode
              value={address}
              size={200}
              level="H"
            />
          </div>

          {/* Address Display */}
          <div className="w-full">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 text-center">
              Your Wallet Address
            </p>
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <code className="flex-1 text-sm font-mono text-gray-900 dark:text-white break-all">
                {address}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="flex-shrink-0 h-8 w-8 p-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Info Message */}
          <div className="w-full p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-300 text-center">
              This address works across all supported networks. Make sure to send funds on the correct network to avoid loss.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
