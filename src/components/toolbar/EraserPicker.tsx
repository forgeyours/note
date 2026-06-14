/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Compass } from 'lucide-react';

interface EraserPickerProps {
  width: number;
  onWidthChange: (width: number) => void;
  mode: 'part' | 'full';
  onModeChange: (mode: 'part' | 'full') => void;
  darkMode?: boolean;
}

export default function EraserPicker({
  width,
  onWidthChange,
  mode,
  onModeChange,
  darkMode = false,
}: EraserPickerProps) {
  const presets = [
    { value: 10, label: 'Precision' },
    { value: 22, label: 'Standard' },
    { value: 40, label: 'Broad' },
    { value: 65, label: 'Slam Sweep' },
  ];

  return (
    <div
      className="flex flex-col space-y-3.5 p-3.5 bg-white dark:bg-[#1E2028] border border-gray-150 dark:border-gray-800 rounded-2xl shadow-xl w-[210px] select-none text-text-primary dark:text-gray-100"
      id="eraser-picker-popup"
    >
      {/* Eraser Type Segment Selector */}
      <div className="flex flex-col space-y-1.5 pb-2.5 border-b border-gray-100 dark:border-gray-800">
        <div className="text-[10px] uppercase font-bold text-text-muted dark:text-gray-400 tracking-wider">
          Eraser Type
        </div>
        <div className="flex bg-gray-100 dark:bg-[#12131A] p-0.5 rounded-lg border border-gray-200/50 dark:border-gray-800/80">
          <button
            type="button"
            onClick={() => onModeChange('part')}
            className={`flex-1 py-1 rounded-md text-[10px] font-bold uppercase transition-all whitespace-nowrap cursor-pointer text-center ${
              mode === 'part'
                ? 'bg-white dark:bg-[#2E303B] text-rose-500 dark:text-rose-450 shadow-3xs'
                : 'text-text-muted dark:text-gray-400 hover:text-text-primary dark:hover:text-white'
            }`}
          >
            Part
          </button>
          <button
            type="button"
            onClick={() => onModeChange('full')}
            className={`flex-1 py-1 rounded-md text-[10px] font-bold uppercase transition-all whitespace-nowrap cursor-pointer text-center ${
              mode === 'full'
                ? 'bg-white dark:bg-[#2E303B] text-rose-500 dark:text-rose-450 shadow-3xs'
                : 'text-text-muted dark:text-gray-400 hover:text-text-primary dark:hover:text-white'
            }`}
          >
            Full
          </button>
        </div>
      </div>

      <div className="text-[10px] uppercase font-bold text-text-muted dark:text-gray-400 tracking-wider">
        Eraser Size Presets
      </div>

      {/* Styled Preset Cards */}
      <div className="grid grid-cols-2 gap-2">
        {presets.map((p) => (
          <button
            key={p.value}
            type="button"
            className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
              width === p.value
                ? 'bg-red-50 dark:bg-red-500/10 border-red-350 dark:border-red-500/30 text-red-600 dark:text-red-400 font-bold'
                : 'bg-bg-secondary dark:bg-[#12131A] border-gray-100 dark:border-gray-800 text-text-secondary dark:text-gray-400 hover:bg-bg-tertiary hover:border-gray-250 dark:hover:border-gray-700'
            }`}
            onClick={() => onWidthChange(p.value)}
          >
            <span className="text-[10px] uppercase font-bold tracking-tight">
              {p.label}
            </span>
            <span className="text-xs font-mono font-extrabold mt-0.5">
              {p.value}px
            </span>
          </button>
        ))}
      </div>

      {/* Precision Slider */}
      <div className="flex flex-col space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
        <div className="flex justify-between items-center">
          <span className="text-[10px] uppercase font-bold text-text-muted dark:text-gray-400 tracking-wider">
            Custom Slider
          </span>
          <span className="text-xs font-mono font-bold text-text-primary dark:text-white px-1.5 py-0.5 bg-bg-secondary dark:bg-[#12131A] rounded">
            {width}px
          </span>
        </div>
        <input
          type="range"
          min="4"
          max="100"
          value={width}
          onChange={(e) => onWidthChange(Number(e.target.value))}
          className="w-full h-1.5 bg-gray-200 dark:bg-gray-750 rounded-lg appearance-none cursor-pointer accent-red-500"
        />
      </div>

      {/* Visual Circle Area Preview */}
      <div className="flex flex-col space-y-1.5 pt-2 border-t border-gray-100 dark:border-gray-800">
        <label className="text-[10px] uppercase font-bold text-text-muted dark:text-gray-400 tracking-wider">
          Erase Diameter
        </label>
        <div className="relative h-16 rounded-xl bg-gray-50 dark:bg-[#12131A] border border-gray-100 dark:border-gray-850 flex items-center justify-center overflow-hidden">
          {/* Faded dot grid helper inside the square */}
          <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 p-2 opacity-15 select-none pointer-events-none">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-gray-400" />
              </div>
            ))}
          </div>

          {/* Dotted target circle showing actual eraser scope proportional within bounds */}
          <div
            className="rounded-full border-2 border-dashed border-red-500 dark:border-red-400 bg-red-500/5 transition-all duration-75 flex items-center justify-center"
            style={{
              width: `${Math.min(56, Math.max(8, width * 0.7))}px`,
              height: `${Math.min(56, Math.max(8, width * 0.7))}px`,
            }}
          >
            <span className="text-[8px] font-mono text-red-500 opacity-60">e</span>
          </div>
        </div>
      </div>
    </div>
  );
}
