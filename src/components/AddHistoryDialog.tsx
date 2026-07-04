/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { HistoricalIPhone } from '../types';
import { X, AlertCircle } from 'lucide-react';

interface AddHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: Omit<HistoricalIPhone, 'id'>) => void;
}

export default function AddHistoryDialog({ isOpen, onClose, onAdd }: AddHistoryDialogProps) {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [model, setModel] = useState<string>('');
  const [baseStorage, setBaseStorage] = useState<string>('128GB');
  const [launchPrice, setLaunchPrice] = useState<number>(0);
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!model.trim()) {
      setError('Model name is required.');
      return;
    }
    if (year < 2007 || year > 2100) {
      setError('Please enter a valid launch year (2007 or later).');
      return;
    }
    if (launchPrice <= 0) {
      setError('Launch price must be greater than zero.');
      return;
    }

    onAdd({
      year,
      model: model.trim(),
      baseStorage: baseStorage.trim(),
      launchPrice
    });

    // Reset fields
    setModel('');
    setBaseStorage('128GB');
    setLaunchPrice(0);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="add-history-dialog">
      <div className="bg-white w-full max-w-md border border-slate-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 sm:px-8 py-5 border-b border-slate-200">
          <h3 className="text-md font-bold uppercase tracking-widest text-slate-900">
            Add Historical Record
          </h3>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-8 flex-1 overflow-y-auto space-y-4">
          {error && (
            <div className="p-4 bg-rose-50 text-rose-800 border-l-4 border-rose-500 flex items-start gap-2 text-xs font-mono font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">
              Launch Year
            </label>
            <input
              type="number"
              value={year || ''}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full px-4 py-2 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs font-mono"
              placeholder="e.g. 2026"
              required
              min="2007"
              max="2100"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">
              Model Name
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs font-semibold"
              placeholder="e.g. iPhone 18 Pro Max"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">
              Base Storage Specs
            </label>
            <input
              type="text"
              value={baseStorage}
              onChange={(e) => setBaseStorage(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs"
              placeholder="e.g. 128GB or 256GB"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">
              Launch Price (INR ₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
              <input
                type="number"
                value={launchPrice || ''}
                onChange={(e) => setLaunchPrice(Number(e.target.value))}
                className="w-full pl-7 pr-4 py-2 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono text-xs"
                placeholder="e.g. 119900"
                required
                min="1"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Add Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
