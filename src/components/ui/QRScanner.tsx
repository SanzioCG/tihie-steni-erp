import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Camera } from 'lucide-react';
import BarcodeScannerComponent from "react-qr-barcode-scanner";

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
}

export default function QRScanner({ isOpen, onClose, onScan }: QRScannerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative max-w-md w-full bg-white rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera size={20} className="text-emerald-500" />
            <h3 className="font-bold text-slate-900">Scan QR Code</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="aspect-square w-full bg-slate-900 relative">
          <BarcodeScannerComponent
            width="100%"
            height="100%"
            onUpdate={(err, result) => {
              if (result) {
                onScan(result.getText());
                onClose();
              }
            }}
          />
          <div className="absolute inset-0 border-2 border-emerald-500/50 pointer-events-none m-12 rounded-2xl">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-lg"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-lg"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-lg"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-lg"></div>
          </div>
        </div>
        
        <div className="p-6 text-center">
          <p className="text-sm text-slate-500">
            Position the QR code within the frame to scan automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
