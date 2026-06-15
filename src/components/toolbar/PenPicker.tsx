/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect } from 'react';
import { Star } from 'lucide-react';

interface PenPickerProps {
  color: string;
  width: number;
  brushType: 'normal' | 'calligraphy' | 'dashed' | 'dotted';
  onColorChange: (color: string) => void;
  onWidthChange: (width: number) => void;
  onBrushTypeChange: (type: 'normal' | 'calligraphy' | 'dashed' | 'dotted') => void;
  onAddToFavorites?: () => void;
}

// Convert Hex to HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let sanitized = hex.replace(/^#/, '');
  if (sanitized.length === 3) {
    sanitized = sanitized.split('').map((c) => c + c).join('');
  }
  if (sanitized.length !== 6) {
    return { h: 0, s: 0, l: 0 }; // default to black
  }
  const r = parseInt(sanitized.substring(0, 2), 16) / 255;
  const g = parseInt(sanitized.substring(2, 4), 16) / 255;
  const b = parseInt(sanitized.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// Convert HSL to Hex
function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

export default function PenPicker({ 
  color, 
  width, 
  brushType, 
  onColorChange, 
  onWidthChange, 
  onBrushTypeChange,
  onAddToFavorites
}: PenPickerProps) {
  const presets = [
    '#1A1D23', // Charcoal Black
    '#37474F', // Slate Gray
    '#7F8C8D', // Cool Gray
    '#FFFFFF', // White
    '#E53935', // Deep Red
    '#D81B60', // Rose Pink
    '#8E24AA', // Rich Purple
    '#5E35B1', // Deep Indigo
    '#1E88E5', // Ocean Blue
    '#00ACC1', // Cyan/Teal
    '#00897B', // Pine Teal
    '#43A047', // Emerald Green
    '#7CB342', // Lime Green
    '#FDD835', // Bright Yellow
    '#FFB300', // Amber Gold
    '#E85D00', // ForgeYours Orange
  ];

  // Derive current HSL from color prop
  const { h, s, l } = useMemo(() => hexToHsl(color), [color]);

  // Local state for free text hex keypresses
  const [typedValue, setTypedValue] = useState(color);

  // Sync state when color updates externally
  useEffect(() => {
    setTypedValue(color);
  }, [color]);

  const handleInputChange = (val: string) => {
    setTypedValue(val);
    let clean = val.trim();
    if (!clean.startsWith('#')) {
      clean = '#' + clean;
    }
    const isValidHex = /^#([0-9A-Fa-f]{3}){1,2}$/.test(clean);
    if (isValidHex) {
      onColorChange(clean.toUpperCase());
    }
  };

  return (
    <div className="flex flex-col space-y-3.5 p-3.5 bg-white dark:bg-[#1E2028] border border-gray-150 dark:border-gray-800 rounded-2xl shadow-xl w-[250px] select-none text-text-primary dark:text-gray-100" id="pen-picker-popup">
      {/* Brush Type Selector */}
      <div className="flex flex-col space-y-1.5 pb-2 border-b border-gray-100 dark:border-gray-800">
        <div className="text-[10px] uppercase font-bold text-text-muted dark:text-gray-400 tracking-wider">Brush Type</div>
        <div className="grid grid-cols-2 gap-1.5">
          {([
            { id: 'normal', name: 'Normal Pen' },
            { id: 'calligraphy', name: 'Calligraphy' },
            { id: 'dashed', name: 'Dashed' },
            { id: 'dotted', name: 'Dotted' },
          ] as const).map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => onBrushTypeChange(b.id)}
              className={`p-1.5 rounded-xl border text-center text-[10px] font-bold transition-all transition-duration-100 select-none cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                brushType === b.id
                  ? 'bg-brand-primary/10 border-brand-primary text-brand-primary dark:bg-brand-primary/20 dark:border-brand-primary dark:text-brand-primary'
                  : 'bg-bg-secondary dark:bg-[#12131A] border-gray-100 dark:border-gray-800 text-text-secondary dark:text-gray-400 hover:bg-bg-tertiary hover:border-gray-250 dark:hover:border-gray-700'
              }`}
            >
              <span>{b.name}</span>
              {/* Visual mini-indicator explaining the line look */}
              <div className="w-full h-1 flex items-center justify-center">
                {b.id === 'normal' && <div className="w-12 h-0.75 bg-current rounded-full" />}
                {b.id === 'calligraphy' && <div className="w-12 h-1 bg-current rounded-full transform skew-x-12 opacity-85" />}
                {b.id === 'dashed' && <div className="w-12 h-1 border-b border-dashed border-current transform scale-y-75" />}
                {b.id === 'dotted' && <div className="w-12 h-1 border-b border-dotted border-current transform scale-y-125" style={{ borderWidth: '2px' }} />}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Quick presets */}
      <div className="flex flex-col space-y-1.5">
        <div className="text-[10px] uppercase font-bold text-text-muted dark:text-gray-400 tracking-wider">Quick Presets</div>
        <div className="grid grid-cols-8 gap-1.5">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              className="w-5.5 h-5.5 rounded-full border border-gray-200 dark:border-gray-700 shadow-2xs flex items-center justify-center transition-transform hover:scale-115 active:scale-95 focus:outline-none cursor-pointer"
              style={{ backgroundColor: preset }}
              onClick={() => onColorChange(preset)}
              title={preset}
            >
              {color.toUpperCase() === preset.toUpperCase() && (
                <span className={`w-1.5 h-1.5 rounded-full ${preset.toUpperCase() === '#FFFFFF' ? 'bg-black' : 'bg-white'}`} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Hex Text Box and visual swatch (with native input fallback) */}
      <div className="flex flex-col space-y-1.5 pt-2 border-t border-gray-100 dark:border-gray-800">
        <label className="text-[10px] uppercase font-bold text-text-muted dark:text-gray-400 tracking-wider">Custom Color</label>
        <div className="flex items-center space-x-2">
          {/* Swatch & native backup click mechanism block wrapper */}
          <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-gray-250 dark:border-gray-700 flex items-center justify-center shadow-2xs group shrink-0">
            <input
              type="color"
              value={color.toUpperCase() === '#FFFFFF' ? '#FFFFFF' : color}
              onChange={(e) => onColorChange(e.target.value.toUpperCase())}
              className="absolute inset-0 w-full h-full opacity-100 cursor-pointer border-0 p-0"
              style={{ padding: 0 }}
            />
          </div>
          <div className="flex flex-col flex-1">
            <input
              type="text"
              value={typedValue}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="#E85D00"
              maxLength={7}
              className="px-2 py-1 text-xs font-mono font-semibold text-text-primary dark:text-white bg-bg-secondary dark:bg-[#12131A] border border-gray-200 dark:border-gray-700 rounded-lg uppercase focus:outline-none focus:ring-1 focus:ring-brand-primary w-full"
            />
          </div>
        </div>
      </div>

      {/* Color Spectrum analog sliders (perfect for iframe environments) */}
      <div className="flex flex-col space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
        <span className="text-[10px] uppercase font-bold text-text-muted dark:text-gray-400 tracking-wider">Analog Tuner (Iframe-Safe)</span>
        
        {/* Hue Slider */}
        <div className="flex flex-col space-y-1">
          <div className="flex justify-between text-[9px] font-bold text-text-muted dark:text-gray-400 uppercase">
            <span>Hue</span>
            <span>{h}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            value={h}
            onChange={(e) => {
              const newHex = hslToHex(Number(e.target.value), s, l);
              onColorChange(newHex);
            }}
            style={{
              background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
            }}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer border-0"
          />
        </div>

        {/* Saturation Slider */}
        <div className="flex flex-col space-y-1">
          <div className="flex justify-between text-[9px] font-bold text-text-muted dark:text-gray-400 uppercase">
            <span>Saturation</span>
            <span>{s}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={s}
            onChange={(e) => {
              const newHex = hslToHex(h, Number(e.target.value), l);
              onColorChange(newHex);
            }}
            style={{
              background: `linear-gradient(to right, #808080, ${hslToHex(h, 100, 50)})`
            }}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer border-0"
          />
        </div>

        {/* Lightness Slider */}
        <div className="flex flex-col space-y-1">
          <div className="flex justify-between text-[9px] font-bold text-text-muted dark:text-gray-400 uppercase">
            <span>Lightness</span>
            <span>{l}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={l}
            onChange={(e) => {
              const newHex = hslToHex(h, s, Number(e.target.value));
              onColorChange(newHex);
            }}
            style={{
              background: `linear-gradient(to right, #000000, ${hslToHex(h, s, 50)}, #ffffff)`
            }}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer border-0"
          />
        </div>
      </div>

      {/* Brush Size Adjustment */}
      <div className="flex flex-col space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
        <div className="flex justify-between items-center">
          <span className="text-[10px] uppercase font-bold text-text-muted dark:text-gray-400 tracking-wider">Brush Size</span>
          <span className="text-xs font-bold text-text-primary dark:text-white px-1.5 py-0.5 bg-bg-secondary dark:bg-[#12131A] rounded">
            {width}px
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="20"
          value={width}
          onChange={(e) => onWidthChange(Number(e.target.value))}
          className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-primary"
        />
        {/* Brush preview dot */}
        <div className="flex justify-center items-center py-1">
          <div 
            className="rounded-full transition-all duration-75" 
            style={{ 
              width: `${Math.max(2, width)}px`, 
              height: `${Math.max(2, width)}px`,
              backgroundColor: color 
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
