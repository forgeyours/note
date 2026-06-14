/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Cpu, Check, Download, Monitor, Laptop, Smartphone, HelpCircle, HardDrive, Info } from 'lucide-react';
import toast from 'react-hot-toast';

interface InstallModalProps {
  onClose: () => void;
}

export default function InstallModal({ onClose }: InstallModalProps) {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is running in installed mode (standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    // Check if PWA install prompt is cached and active
    if ((window as any).deferredPrompt) {
      setCanInstall(true);
    }

    // Set listener in case it arrives late
    const handlePrompt = () => setCanInstall(true);
    window.addEventListener('beforeinstallprompt', handlePrompt);
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, []);

  const handleNativeInstall = async () => {
    const promptEvent = (window as any).deferredPrompt;
    if (!promptEvent) {
      toast.error("Install shortcut isn't active on your current browser. Please see the manual steps below!");
      return;
    }

    // Trigger standard browser dialog
    try {
      promptEvent.prompt();
      const choiceResult = await promptEvent.userChoice;
      if (choiceResult.outcome === 'accepted') {
        toast.success('Successfully installed ForgeYours Notes on your device!');
        setIsInstalled(true);
      }
      (window as any).deferredPrompt = null;
      setCanInstall(false);
    } catch (err: any) {
      console.error('Install flow cancelled or failed:', err);
    }
  };

  return (
    <div className="flex flex-col space-y-4 text-left p-1" id="pwa-install-modal">
      
      {/* Pop title */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#2E303B] pb-2.5">
        <div className="flex items-center space-x-1.5 text-brand-primary">
          <Monitor size={18} />
          <h2 className="text-sm font-bold uppercase tracking-wider">Install Standalone App</h2>
        </div>
        <button 
          onClick={onClose} 
          className="p-1 hover:bg-bg-secondary rounded text-text-muted hover:text-text-primary focus:outline-none"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-col space-y-3.5">
        {/* Status Section */}
        <div className="p-3.5 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-bg-secondary flex flex-col space-y-1.5">
          <div className="flex items-start space-x-2.5">
            <Cpu className="text-orange-500 scale-100 shrink-0 mt-0.5" size={16} />
            <div className="flex flex-col space-y-0.5">
              <span className="text-xs font-bold text-text-primary">
                {isInstalled ? '✓ ForgeYours is in Native Workspace Mode' : 'PWA Desktop App Support'}
              </span>
              <p className="text-[10px] text-text-muted leading-relaxed">
                {isInstalled 
                  ? 'Awesome! You are running ForgeYours in a secure, isolated sandboxed window. Your drawings, pages, and flashcards save 100% locally to your disk and work perfectly offline without any connection.' 
                  : 'Get a clean, dedicated app window that registers on your desktop, macOS dock, or mobile home-screen. It runs at hardware speed, bypasses internet requirements, and loads instantly offline.'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button Segment */}
        {canInstall && !isInstalled ? (
          <div className="p-4 bg-orange-50/50 dark:bg-orange-950/10 border border-orange-200/50 dark:border-orange-900/30 rounded-2xl flex flex-col items-center space-y-3 text-center">
            <div className="flex flex-col space-y-0.5">
              <span className="text-xs font-extrabold text-orange-600 dark:text-orange-400">One-Tap Quick Install Available!</span>
              <p className="text-[10px] text-text-muted max-w-xs leading-relaxed">
                Click below to instantly install the app icon onto your launcher deck for standalone local offline running.
              </p>
            </div>
            <button
              onClick={handleNativeInstall}
              className="w-full max-w-xs py-2 bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold rounded-xl shadow-md transform hover:-translate-y-0.5 transition-all duration-150 flex items-center justify-center space-x-2"
            >
              <Download size={14} strokeWidth={2.5} />
              <span>Install ForgeYours Notes</span>
            </button>
          </div>
        ) : null}

        {/* Manual Addition Instructions */}
        <div className="flex flex-col space-y-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">Manual System Guides</span>
          
          <div className="grid grid-cols-1 gap-2">
            
            {/* Desktop OS (macOS / Windows / Linux) */}
            <div className="p-3 bg-bg-secondary rounded-xl border border-gray-100 dark:border-[#2E303B] flex flex-col space-y-1">
              <div className="flex items-center space-x-2 text-text-primary">
                <Laptop size={13} className="text-brand-primary" />
                <span className="text-xs font-bold">Desktop Installation (Chrome / Edge / Safari/ PC)</span>
              </div>
              <ul className="text-[10px] text-text-muted leading-relaxed list-disc list-inside space-y-0.5 pl-1.5">
                <li><strong>Chrome/Edge:</strong> Look at the right side of your URL Address Bar. Click the <span className="font-semibold text-text-primary">Install Monitor Icon</span> (or select <span className="font-semibold text-text-primary">Install ForgeYours</span> in the menu).</li>
                <li><strong>Safari (Mac):</strong> Select <span className="text-text-primary font-semibold">File ➔ Add to Dock...</span> in top utility menu.</li>
              </ul>
            </div>

            {/* Mobile Devices (iPhone / iPad / Google Pixel) */}
            <div className="p-3 bg-bg-secondary rounded-xl border border-gray-100 dark:border-[#2E303B] flex flex-col space-y-1">
              <div className="flex items-center space-x-2 text-text-primary">
                <Smartphone size={13} className="text-brand-primary" />
                <span className="text-xs font-bold">Mobile & Tablet Setup (iOS Safari / iPad / Android)</span>
              </div>
              <ul className="text-[10px] text-text-muted leading-relaxed list-disc list-inside space-y-0.5 pl-1.5">
                <li><strong>iOS (iPhone/iPad Safari):</strong> Tap the share sheet button <span className="font-bold text-text-primary">[↑]</span> at bottom browser bar, scroll down and select <span className="font-semibold text-text-primary">Add to Home Screen</span>.</li>
                <li><strong>Android (Chrome):</strong> Tap settings <span className="font-bold text-text-primary">⋮</span> in top-right and select <span className="font-semibold text-text-primary">Install App</span> (or <span className="font-semibold text-text-primary">Add to Home Screen</span>).</li>
              </ul>
            </div>

            {/* Storage Info */}
            <div className="p-3 bg-bg-secondary rounded-xl border border-gray-100 dark:border-[#2E303B] flex flex-col space-y-1">
              <div className="flex items-center space-x-2 text-text-primary">
                <HardDrive size={13} className="text-brand-primary" />
                <span className="text-xs font-bold">Automatic Offline Local Syncing</span>
              </div>
              <p className="text-[10px] text-text-muted leading-relaxed pl-1">
                Your laptop or phone will automatically allocate dedicated, highly performant sandboxed disk sector (IndexedDB) for note records. Even if you don't install the PWA, loading the web link offline works instantly.
              </p>
            </div>

          </div>
        </div>

        {/* Footer info banner */}
        <div className="flex items-center space-x-1.5 pl-1 text-[10px] text-text-muted">
          <Info size={11} className="text-brand-primary shrink-0" />
          <span>Need backup? Use <strong>Export ➔ Notebook ZIP</strong> in the menu at anytime!</span>
        </div>

      </div>
    </div>
  );
}
