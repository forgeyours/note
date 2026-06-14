/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, HardDrive, Eye, Cloud, Check, Sparkles, BookOpen, RefreshCw } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { getStorageUsage } from '../../lib/db';
import { performPwaUpdateCheck } from '../../lib/updateChecker';
import toast from 'react-hot-toast';

interface SettingsModalProps {
  onClear: () => void;
}

export default function SettingsModal({ onClear }: SettingsModalProps) {
  const store = useAppStore();

  const [storageStats, setStorageStats] = useState({ bytes: 0, human: 'Estimating...' });
  const [userGeminiKey, setUserGeminiKey] = useState(localStorage.getItem('user_gemini_key') || '');
  const [palmRejection, setPalmRejection] = useState(localStorage.getItem('palm_rejection_level') || 'smart');
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [checkingUpdates, setCheckingUpdates] = useState(false);

  useEffect(() => {
    getStorageUsage().then(setStorageStats);
  }, []);

  const handleCheckUpdates = async () => {
    if (checkingUpdates) return;
    setCheckingUpdates(true);
    const toastId = toast.loading('Checking for updates...');
    try {
      const result = await performPwaUpdateCheck();
      if (result.updated) {
        toast.success('Update complete! Reloading application...', { id: toastId });
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.success(result.message, { id: toastId });
      }
    } catch (err) {
      toast.error('Could not complete update check. Try again!', { id: toastId });
    } finally {
      setCheckingUpdates(false);
    }
  };

  const handleSaveAIKey = () => {
    localStorage.setItem('user_gemini_key', userGeminiKey);
    toast.success('AI API Key configured successfully!');
  };

  const handleWipeData = () => {
    if (!showWipeConfirm) {
      setShowWipeConfirm(true);
      toast.error('⚠️ Tap/click "Confirm Factory Reset" again to wipe your workspace!');
      setTimeout(() => setShowWipeConfirm(false), 5000);
      return;
    }
    indexedDB.deleteDatabase('forgeyours-note');
    toast.error('Local workspace wiped successfully.');
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  return (
    <div className="flex flex-col space-y-4 text-left p-1" id="settings-management-panel">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#2E303B] pb-2">
        <div className="flex items-center space-x-1.5 text-brand-primary">
          <HardDrive size={18} />
          <h2 className="text-sm font-bold uppercase tracking-wider">Device Settings & Storage</h2>
        </div>
        <button 
          onClick={onClear} 
          className="p-1 hover:bg-bg-secondary rounded text-text-muted hover:text-text-primary focus:outline-none"
        >
          <X size={16} />
        </button>
      </div>

      {/* Theme selection */}
      <div className="flex flex-col space-y-2 p-2.5 bg-bg-secondary rounded-xl border border-transparent dark:border-[#2E303B] ivory:border-[#E8E1CE]">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-text-primary">Application Theme</span>
          <span className="text-[10px] text-text-muted">Choose your preferred canvas and UI styling</span>
        </div>
        <div className="flex bg-gray-200 dark:bg-[#12131A] p-1 rounded-lg">
          {(['light', 'dark', 'ivory'] as const).map((t) => (
            <button
              key={t}
              onClick={() => store.setAppTheme(t)}
              className={`flex-1 py-1 text-xs font-semibold rounded-md capitalize transition-colors ${
                store.appTheme === t
                  ? 'bg-white dark:bg-[#2A2D35] ivory:bg-[#FCFBF7] text-brand-primary shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Palm Rejection Option */}
      <div className="flex flex-col space-y-2 p-2.5 bg-bg-secondary rounded-xl border border-transparent dark:border-[#2E303B] ivory:border-[#E8E1CE]">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-text-primary">Palm Rejection & Drawing input</span>
          <span className="text-[10px] text-text-muted">Adjust touchscreen and active stylus behavior for tablets</span>
        </div>
        <div className="flex bg-gray-200 dark:bg-[#12131A] p-1 rounded-lg">
          {([
            { id: 'smart', label: 'Smart Palm' },
            { id: 'stylus', label: 'Pen Only' },
            { id: 'none', label: 'None (Fingertip)' }
          ] as const).map((mode) => (
            <button
              key={mode.id}
              onClick={() => {
                localStorage.setItem('palm_rejection_level', mode.id);
                setPalmRejection(mode.id);
                toast.success(`Palm Rejection: configured to "${mode.label}"`);
              }}
              className={`flex-1 py-1.5 text-[11px] font-semibold rounded-md transition-colors ${
                palmRejection === mode.id
                  ? 'bg-white dark:bg-[#2A2D35] ivory:bg-[#FCFBF7] text-brand-primary shadow-sm font-bold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-text-muted leading-relaxed mt-0.5 px-0.5">
          {palmRejection === 'stylus' 
            ? '🔒 Stylus Pen Only: Ink strokes are restricted to stylus tips. Touch inputs are ignored to guarantee zero palm errors.' 
            : palmRejection === 'none' 
              ? '💡 None (Fingertip): Open touchscreen drawing. Works with generic capacitive pens and fingertips.' 
              : '⚡ Smart Palm: Combines touch size thresholding (>24px) & native hover suppression to block resting palms.'}
        </p>
      </div>

      {/* Storage estimator stats */}
      <div className="flex flex-col space-y-1.5 p-3.5 bg-bg-secondary rounded-xl border border-gray-150 dark:border-[#2E303B] ivory:border-[#E8E1CE]">
        <span className="text-xs font-bold text-text-primary flex items-center space-x-1.5">
          <HardDrive size={13} className="text-brand-primary" />
          <span>Local Database Footprint</span>
        </span>
        <div className="flex justify-between items-center text-xs mt-1">
          <span className="text-text-secondary">IndexedDB Allocated size:</span>
          <span className="font-mono font-bold text-brand-primary">{storageStats.human}</span>
        </div>
        <p className="text-[10px] text-text-muted leading-normal mt-1.5">
          ForgeYours digital notebook works local-first. Drawings, text layers, attachments and cards are recorded locally without accounts.
        </p>
      </div>

      {/* Custom key overrides configurations */}
      <div className="flex flex-col space-y-2 p-3.5 bg-bg-secondary rounded-xl border border-gray-150 dark:border-[#2E303B] ivory:border-[#E8E1CE]">
        <span className="text-xs font-bold text-text-primary flex items-center space-x-1.5">
          <Sparkles size={13} className="text-brand-primary" />
          <span>Local Client API Overrides</span>
        </span>
        <p className="text-[10px] text-text-secondary leading-normal mb-1">
          By default, AI features utilize our built-in secure server-side Gemini API keys. To supply your own custom client keys, enter it below:
        </p>
        <div className="flex space-x-1.5">
          <input
            type="password"
            placeholder="AI Studio Gemini API Key..."
            className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-[#12131A] text-text-primary dark:text-gray-100 border border-gray-300 dark:border-[#2E303B] rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary"
            value={userGeminiKey}
            onChange={(e) => setUserGeminiKey(e.target.value)}
          />
          <button
            onClick={handleSaveAIKey}
            className="px-3 py-1 text-xs bg-brand-primary text-white font-semibold rounded-lg hover:bg-brand-hover"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Dynamic PWA updates */}
      <div className="flex flex-col space-y-2.5 p-3.5 bg-bg-secondary rounded-xl border border-gray-150 dark:border-[#2E303B] ivory:border-[#E8E1CE]">
        <span className="text-xs font-bold text-text-primary flex items-center space-x-1.5">
          <RefreshCw size={13} className={`text-brand-primary ${checkingUpdates ? 'animate-spin' : ''}`} />
          <span>Application Version & Updates</span>
        </span>
        <div className="flex justify-between items-center text-xs mt-1">
          <span className="text-text-secondary">PWA Deployment Version:</span>
          <span className="font-mono font-bold text-brand-primary">v2.1.0</span>
        </div>
        <p className="text-[10px] text-text-muted leading-normal">
          Running high performance local-first with offline Service Worker. Tap below to query the server for fresh system updates.
        </p>
        <button
          onClick={handleCheckUpdates}
          disabled={checkingUpdates}
          className="w-full py-2 bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold rounded-lg shadow-sm transition-all duration-150 flex items-center justify-center space-x-1.5 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={13} className={checkingUpdates ? 'animate-spin' : ''} />
          <span>{checkingUpdates ? 'Checking for updates...' : 'Check & Update App'}</span>
        </button>
      </div>

      {/* Wipe tool deletes DB */}
      <div className="flex items-center justify-between p-2 pt-3 border-t border-gray-250 dark:border-[#2E303B] flex-wrap gap-2">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-red-600">Factory Wipe Notebooks</span>
          <span className="text-[10px] text-text-muted">Erase all digital notebooks locally</span>
        </div>
        <button
          onClick={handleWipeData}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg focus:outline-none transition-colors ${
            showWipeConfirm ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse' : 'bg-red-50 text-red-600 hover:bg-red-100 dark:hover:bg-red-950/20'
          }`}
        >
          {showWipeConfirm ? 'Confirm Factory Reset ⚠️' : 'Wipe Workspace'}
        </button>
      </div>
    </div>
  );
}
