import { useState, useRef, useEffect } from 'react';
import { Button } from './Button';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
];

export interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

export function ColorPicker({ value, onChange, className = '' }: ColorPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePresetClick = (color: string) => {
    onChange(color);
    setShowPicker(false);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="relative w-10 h-10 rounded-lg border-2 border-gray-200 overflow-hidden transition-colors hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          style={{ backgroundColor: value }}
          aria-label="Color picker"
          aria-expanded={showPicker}
        >
          <span className="sr-only">Current color: {value}</span>
        </button>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleCustomChange}
          className="input w-28 font-mono text-xs uppercase"
          placeholder="#RRGGBB"
          maxLength={7}
          pattern="#[0-9A-Fa-f]{6}"
        />
      </div>

      {showPicker && (
        <div
          ref={pickerRef}
          className="absolute z-50 mt-2 w-56 p-3 card shadow-lg border border-gray-200"
          role="dialog"
          aria-label="Select color"
        >
          <div className="grid grid-cols-8 gap-1.5 mb-3">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handlePresetClick(color)}
                className={`w-6 h-6 rounded transition-transform hover:scale-110 ${value === color ? 'ring-2 ring-offset-2 ring-primary-500' : ''}`}
                style={{ backgroundColor: color }}
                aria-label={color}
                aria-pressed={value === color}
              />
            ))}
          </div>
          <div>
            <label htmlFor="custom-color" className="label text-xs">Custom</label>
            <input
              id="custom-color"
              type="color"
              value={value}
              onChange={handleCustomChange}
              className="w-full h-8 rounded border border-gray-200 cursor-pointer"
              aria-label="Custom color picker"
            />
          </div>
        </div>
      )}
    </div>
  );
}