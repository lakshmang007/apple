/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Product } from '../types';
import { X, Plus, AlertCircle } from 'lucide-react';

interface AddDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (product: Omit<Product, 'id'>) => void;
}

export default function AddDialog({ isOpen, onClose, onAdd }: AddDialogProps) {
  const [category, setCategory] = useState<string>('iPhone');
  const [model, setModel] = useState<string>('');
  const [baseConfig, setBaseConfig] = useState<string>('');
  const [color, setColor] = useState<string>('Standard');
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [pastPrice, setPastPrice] = useState<number>(0);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!model.trim()) {
      setError('Product Model / Variant is required.');
      return;
    }
    if (pastPrice < 0 || currentPrice < 0) {
      setError('Prices cannot be negative.');
      return;
    }
    
    onAdd({
      category,
      model: model.trim(),
      baseConfig: baseConfig.trim() || '—',
      pastPrice: pastPrice || 0,
      currentPrice: currentPrice || 0,
      notes: notes.trim(),
      color: color.trim() || 'Standard',
      isAvailable,
      isCustom: true
    });

    // Reset fields
    setCategory('iPhone');
    setModel('');
    setBaseConfig('');
    setColor('Standard');
    setIsAvailable(true);
    setPastPrice(0);
    setCurrentPrice(0);
    setNotes('');
    setError('');
    onClose();
  };

  const categories = [
    'iPhone',
    'iPad',
    'Mac',
    'Apple Watch',
    'AirPods',
    'TV, Home & Accessories'
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="add-dialog">
      <div className="bg-white w-full max-w-lg border border-slate-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-8 py-5 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-slate-900 uppercase">
              Add Custom Product Record
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Define launch features and active INR MRP</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-8 flex-1 overflow-y-auto space-y-5">
          
          {error && (
            <div className="p-4 bg-rose-50 text-rose-800 border-l-4 border-rose-500 flex items-start gap-2 text-xs font-mono font-medium animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Category selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest block">
                Product Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50 text-xs font-medium cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Model Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest block">
                Model Name / Variant
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50 text-xs"
                placeholder="e.g. iPhone 17 Pro Max"
                required
              />
            </div>

            {/* Base Configuration */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest block">
                Base Configuration / Specs
              </label>
              <input
                type="text"
                value={baseConfig}
                onChange={(e) => setBaseConfig(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50 text-xs"
                placeholder="e.g. 256GB Storage, 8GB RAM"
              />
            </div>

            {/* Color Option */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest block">
                Color Option
              </label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50 text-xs"
                placeholder="e.g. Natural Titanium, Space Black"
              />
            </div>

            {/* Price Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Past Price */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest block">
                  Past Price (INR ₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={pastPrice || ''}
                    onChange={(e) => setPastPrice(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50 font-mono text-xs"
                    placeholder="e.g. 119900"
                    min="0"
                  />
                </div>
              </div>

              {/* Current Price */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest block">
                  Current Price (INR ₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={currentPrice || ''}
                    onChange={(e) => setCurrentPrice(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50 font-mono text-xs"
                    placeholder="e.g. 109900"
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest block">
                Short Notes / Remarks
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50 text-xs"
                placeholder="e.g. Introductory discount applied"
                rows={2}
              />
            </div>

            {/* Availability Option */}
            <div className="flex items-center gap-2 py-2">
              <input
                type="checkbox"
                id="add-is-available"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                className="w-4 h-4 text-slate-900 border-slate-350 focus:ring-slate-900 cursor-pointer rounded-xs"
              />
              <label htmlFor="add-is-available" className="text-xs font-mono font-bold text-slate-700 uppercase tracking-widest cursor-pointer select-none">
                Product is currently available
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-200 mt-6 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-white transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Product
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

