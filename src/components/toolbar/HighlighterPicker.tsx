/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Star } from 'lucide-react';

interface HighlighterPickerProps {
  color: string;
  width: number;
  onColorChange: (color: string) => void;
  onWidthChange: (width: number) => void;
  darkMode?: boolean;
  onAddToFavorites?: () => void;
}

export default function HighlighterPicker({
  color,
  width,
  onColorChange,
  onWidthChange,
  darkMode = false,
  onAddToFavorites,
}: HighlighterPickerProps) {
  const presets = [
    '#FFEB3B', // Fluorescent Yellow
    '#4CAF50', // Mint Green
    '#00BCD4', // Electric Cyan
    '#2196F3', // Sky Blue
    '#E91E63', // Neon Rose Pink
    '#FF9800', // Tangerine Orange
    '#9C27B0', // Purple Iris
    '#8BC34A', // Soft Lime
  ];

  return (
    <div
      className="flex flex-col space-y-3.5 p-3.5 bg-white dark:bg-[#1E2028] border border-gray-150 dark:border-gray-800 rounded-2xl shadow-xl w-[220px] select-none text-text-primary dark:text-gray-100"
      id="highlighter-picker-popup"
    >
      {/* Highlighter Presets */}
      <div className="flex flex-col space-y-1.5">
        <div className="text-[10px] uppercase font-bold text-text-muted dark:text-gray-400 tracking-wider">
          Highlight Color
        </div>
        <div className="grid grid-cols-4 gap-2">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xs flex items-center justify-center transition-transform hover:scale-110 active:scale-95 focus:outline-none cursor-pointer relative"
              style={{ backgroundColor: preset }}
              onClick={() => onColorChange(preset)}
              title={preset}
            >
              {color.toUpperCase() === preset.toUpperCase() && (
                <span className="absolute inset-0 border-2 border-brand-primary dark:border-[#38bdf8] rounded-lg" />
              )}
              {/* Highlight transparent effect overlay */}
              <span className="absolute inset-0 bg-white/20 hover:bg-transparent transition-colors rounded-lg" />
            </button>
          ))}
        </div>
      </div>

      {/* Highlighter Width Slider */}
      <div className="flex flex-col space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
        <div className="flex justify-between items-center">
          <span className="text-[10px] uppercase font-bold text-text-muted dark:text-gray-400 tracking-wider">
            Marker Width
          </span>
          <span className="text-xs font-mono font-bold text-text-primary dark:text-white px-1.5 py-0.5 bg-bg-secondary dark:bg-[#12131A] rounded">
            {width}px
          </span>
        </div>
        <input
          type="range"
          min="5"
          max="60"
          value={width}
          onChange={(e) => onWidthChange(Number(e.target.value))}
          className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-primary"
        />
      </div>

      {/* Highlighter Stroke Preview */}
      <div className="flex flex-col space-y-1 pt-2 border-t border-gray-100 dark:border-gray-800">
        <label className="text-[10px] uppercase font-bold text-text-muted dark:text-gray-400 tracking-wider">
          Stroke Preview
        </label>
        <div className="relative h-12 rounded-xl bg-gray-50 dark:bg-[#12131A] border border-gray-100 dark:border-gray-850 flex items-center justify-center overflow-hidden">
          {/* Mock background ruled lines to show the transparent effect */}
          <div className="absolute inset-0 flex flex-col justify-around py-2 px-4 opacity-30 select-none pointer-events-none">
            <div className="text-[10px] font-sans font-medium text-text-muted dark:text-gray-500">
              Highlighted text review...
            </div>
            <div className="w-full h-px bg-gray-300 dark:bg-gray-700" />
          </div>
          {/* Highlighter overlay preview */}
          <div
            className="absolute left-4 right-4 h-3 rounded-full transition-all duration-110"
            style={{
              backgroundColor: color,
              opacity: 0.45,
              height: `${Math.max(4, width / 2.2)}px`,
            }}
          />
        </div>
      </div>

      {onAddToFavorites && (
        <button
          type="button"
          onClick={onAddToFavorites}
          className="w-full mt-1.5 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl text-center text-[11px] transition-colors cursor-pointer flex items-center justify-center space-x-1.5 border border-indigo-100 dark:border-indigo-900/30"
        >
          <Star size={12} className="fill-indigo-600/10 dark:fill-indigo-400/15" />
          <span>Add to Favorites</span>
        </button>
      )}
    </div>
  );
}
