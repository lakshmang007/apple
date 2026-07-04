/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Product, ProductVariant } from '../types';
import { X, Save, RotateCcw, AlertCircle } from 'lucide-react';

interface EditDialogProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    id: string, 
    updatedModel: string,
    updatedCategory: string,
    updatedBaseConfig: string,
    updatedPastPrice: number, 
    updatedCurrentPrice: number, 
    updatedNotes: string, 
    updatedColor: string, 
    updatedIsAvailable: boolean,
    updatedVariants?: ProductVariant[]
  ) => void;
}

export default function EditDialog({ product, isOpen, onClose, onSave }: EditDialogProps) {
  const [model, setModel] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [baseConfig, setBaseConfig] = useState<string>('');
  const [pastPrice, setPastPrice] = useState<number>(0);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [color, setColor] = useState<string>('');
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (product) {
      setModel(product.model);
      setCategory(product.category);
      setBaseConfig(product.baseConfig);
      setPastPrice(product.pastPrice);
      setCurrentPrice(product.currentPrice);
      setNotes(product.notes || '');
      setColor(product.color || 'Standard');
      setIsAvailable(product.isAvailable !== false);
      setVariants(product.variants ? JSON.parse(JSON.stringify(product.variants)) : []);
      setError('');
    }
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const diff = currentPrice - pastPrice;
  const pct = pastPrice > 0 ? (diff / pastPrice) * 100 : 0;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!model.trim()) {
      setError('Model name is required.');
      return;
    }
    if (pastPrice < 0 || currentPrice < 0) {
      setError('Prices cannot be negative values.');
      return;
    }
    if (variants.some(v => v.currentPrice < 0 || v.pastPrice < 0)) {
      setError('Variant prices cannot be negative values.');
      return;
    }
    if (variants.some(v => !v.baseConfig.trim())) {
      setError('Variant configurations cannot be empty.');
      return;
    }

    let finalCurrent = currentPrice;
    let finalPast = pastPrice;
    let finalBaseConfig = baseConfig;
    if (variants.length > 0) {
      const active = product ? (variants.find(v => v.id === product.selectedVariantId) || variants[0]) : variants[0];
      finalCurrent = active.currentPrice;
      finalPast = active.pastPrice;
      finalBaseConfig = active.baseConfig;
    }

    onSave(
      product.id, 
      model.trim(),
      category,
      finalBaseConfig.trim() || '—',
      finalPast, 
      finalCurrent, 
      notes.trim(), 
      color.trim() || 'Standard', 
      isAvailable, 
      variants.length > 0 ? variants : undefined
    );
    onClose();
  };

  const handleReset = () => {
    if (product) {
      setModel(product.model);
      setCategory(product.category);
      setBaseConfig(product.baseConfig);
      setPastPrice(product.pastPrice);
      setCurrentPrice(product.currentPrice);
      setNotes(product.notes || '');
      setColor(product.color || 'Standard');
      setIsAvailable(product.isAvailable !== false);
      setVariants(product.variants ? JSON.parse(JSON.stringify(product.variants)) : []);
      setError('');
    }
  };

  const handleVariantPriceChange = (index: number, field: 'currentPrice' | 'pastPrice', val: number) => {
    const updated = [...variants];
    updated[index][field] = val;
    setVariants(updated);

    const isAct = product && product.selectedVariantId === updated[index].id;
    const isFirstAndNoActive = product && !product.selectedVariantId && index === 0;
    if (isAct || isFirstAndNoActive) {
      if (field === 'currentPrice') {
        setCurrentPrice(val);
      } else {
        setPastPrice(val);
      }
    }
  };

  const handleVariantConfigChange = (index: number, val: string) => {
    const updated = [...variants];
    updated[index].baseConfig = val;
    setVariants(updated);
  };

  const handleAddVariant = () => {
    if (variants.length === 0) {
      const initialVar: ProductVariant = {
        id: `var-${Date.now()}-1`,
        baseConfig: baseConfig || 'Base Config',
        pastPrice: pastPrice,
        currentPrice: currentPrice
      };
      const newVar: ProductVariant = {
        id: `var-${Date.now()}-2`,
        baseConfig: '',
        pastPrice: 0,
        currentPrice: 0
      };
      setVariants([initialVar, newVar]);
    } else {
      const newVar: ProductVariant = {
        id: `var-${Date.now()}-${variants.length + 1}`,
        baseConfig: '',
        pastPrice: 0,
        currentPrice: 0
      };
      setVariants([...variants, newVar]);
    }
  };

  const handleRemoveVariant = (index: number) => {
    const updated = variants.filter((_, i) => i !== index);
    setVariants(updated);
    
    if (updated.length === 0) {
      const removed = variants[index];
      if (removed) {
        setPastPrice(removed.pastPrice);
        setCurrentPrice(removed.currentPrice);
        setBaseConfig(removed.baseConfig);
      }
    }
  };

  const formatINR = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const adjustPrice = (type: 'past' | 'current', amount: number) => {
    if (type === 'past') {
      setPastPrice(prev => Math.max(0, prev + amount));
    } else {
      setCurrentPrice(prev => Math.max(0, prev + amount));
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="edit-dialog">
      <div className="bg-white w-full max-w-lg border border-slate-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-8 py-5 border-b border-slate-200">
          <div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-600 uppercase tracking-wider">
              {product.category}
            </span>
            <h3 className="text-lg font-semibold tracking-tight text-slate-900 mt-1 uppercase">
              Modify Product Prices
            </h3>
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
        <form onSubmit={handleSave} className="p-5 sm:p-8 flex-1 overflow-y-auto space-y-6">
          
          {/* Model / Product Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest block">
              Model / Product Name
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50 text-xs font-bold text-slate-900"
              placeholder="e.g. MacBook Pro"
              required
            />
          </div>

          {/* Product Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest block">
              Product Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50 text-xs font-medium cursor-pointer"
            >
              {['iPhone', 'iPad', 'Mac', 'Apple Watch', 'AirPods', 'TV, Home & Accessories'].map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Configuration Specs (only if variants length is 0) */}
          {variants.length === 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest block">
                Configuration Specs
              </label>
              <input
                type="text"
                value={baseConfig}
                onChange={(e) => setBaseConfig(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50 text-xs font-mono text-slate-700"
                placeholder="e.g. 256GB Storage, 8GB RAM"
                required
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest block">
              Description / Remarks
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50 text-xs"
              placeholder="Enter product description or remarks"
              rows={2}
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
              placeholder="Enter color name"
            />
          </div>

          {/* Availability Status */}
          <div className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              id="edit-is-available"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
              className="w-4 h-4 text-slate-900 border-slate-350 focus:ring-slate-900 cursor-pointer rounded-xs"
            />
            <label htmlFor="edit-is-available" className="text-xs font-mono font-bold text-slate-700 uppercase tracking-widest cursor-pointer select-none">
              Product is currently available
            </label>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 text-rose-800 border-l-4 border-rose-500 flex items-start gap-2 text-xs font-mono font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-6">
            {variants.length === 0 ? (
              <>
                {/* Past Price Edit */}
                <div className="space-y-2">
                  <label className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest block">
                    Past Price (INR ₹)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        value={pastPrice || ''}
                        onChange={(e) => setPastPrice(Number(e.target.value))}
                        className="w-full pl-8 pr-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50 font-mono text-sm"
                        placeholder="Enter past price"
                        required
                        min="0"
                      />
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => adjustPrice('past', -5000)}
                        className="px-3 py-1.5 text-xs font-mono bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
                      >
                        -5k
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustPrice('past', -1000)}
                        className="px-3 py-1.5 text-xs font-mono bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
                      >
                        -1k
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustPrice('past', 1000)}
                        className="px-3 py-1.5 text-xs font-mono bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
                      >
                        +1k
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustPrice('past', 5000)}
                        className="px-3 py-1.5 text-xs font-mono bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
                      >
                        +5k
                      </button>
                    </div>
                  </div>
                </div>

                {/* Current Price Edit */}
                <div className="space-y-2">
                  <label className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest block">
                    Current Price (INR ₹)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        value={currentPrice || ''}
                        onChange={(e) => setCurrentPrice(Number(e.target.value))}
                        className="w-full pl-8 pr-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50 font-mono text-sm"
                        placeholder="Enter current price"
                        required
                        min="0"
                      />
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => adjustPrice('current', -5000)}
                        className="px-3 py-1.5 text-xs font-mono bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
                      >
                        -5k
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustPrice('current', -1000)}
                        className="px-3 py-1.5 text-xs font-mono bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
                      >
                        -1k
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustPrice('current', 1000)}
                        className="px-3 py-1.5 text-xs font-mono bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
                      >
                        +1k
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustPrice('current', 5000)}
                        className="px-3 py-1.5 text-xs font-mono bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
                      >
                        +5k
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-right">
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="px-3 py-1.5 text-xs font-bold uppercase bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-250 cursor-pointer"
                  >
                    + Convert to Multi-Variant
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-100 p-4 border border-slate-200 text-xs text-slate-600 font-mono leading-relaxed">
                  This product contains **{variants.length} configurations**. Please manage individual variant specs and pricing using the fields below. The active selection pricing will automatically sync.
                </div>
                
                {variants.map((v, idx) => (
                  <div key={v.id} className="p-4 bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-700 uppercase">Configuration #{idx + 1}</span>
                      <div className="flex items-center gap-2">
                        {product?.selectedVariantId === v.id && (
                          <span className="text-[9px] font-mono font-bold bg-amber-150 text-amber-800 px-2 py-0.5 border border-amber-250">
                            Active Selection
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(idx)}
                          className="text-[9px] font-mono font-bold text-rose-600 hover:text-rose-800 bg-rose-50 px-2 py-0.5 border border-rose-200 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-400 uppercase">Spec Details</label>
                      <input
                        type="text"
                        value={v.baseConfig}
                        onChange={(e) => handleVariantConfigChange(idx, e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white text-xs font-mono"
                        placeholder="e.g. 16GB RAM, 1TB SSD"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400 uppercase">Past Price (₹)</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                          <input
                            type="number"
                            value={v.pastPrice || ''}
                            onChange={(e) => handleVariantPriceChange(idx, 'pastPrice', Number(e.target.value))}
                            className="w-full pl-6 pr-2 py-2 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white font-mono text-xs"
                            min="0"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-400 uppercase">Current Price (₹)</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                          <input
                            type="number"
                            value={v.currentPrice || ''}
                            onChange={(e) => handleVariantPriceChange(idx, 'currentPrice', Number(e.target.value))}
                            className="w-full pl-6 pr-2 py-2 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white font-mono text-xs font-bold"
                            min="0"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="pt-2 text-right">
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="px-3 py-1.5 text-xs font-bold uppercase bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-250 cursor-pointer"
                  >
                    + Add Configuration Variant
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Computed Difference Preview */}
          <div className="bg-slate-50 border border-slate-200 p-6 mt-6">
            <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-4">
              Auto-Calculated Offset
            </h4>
            <div className="flex justify-between items-center">
              <div>
                <p className={`text-2xl font-mono font-bold ${
                  diff < 0 ? 'text-emerald-600' : diff > 0 ? 'text-rose-500' : 'text-slate-500'
                }`}>
                  {diff < 0 ? '-' : diff > 0 ? '+' : ''}{formatINR(Math.abs(diff))}
                </p>
                <p className="text-[10px] text-slate-400 mt-1 font-mono uppercase">
                  {diff < 0 ? 'CALCULATED DEPRECIATION' : diff > 0 ? 'CALCULATED APPRECIATION' : 'NO CHANGE'}
                </p>
              </div>

              {pastPrice > 0 && (
                <div className={`px-3 py-1.5 font-mono text-xs font-bold ${
                  diff < 0 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-150' 
                    : diff > 0 
                    ? 'bg-rose-50 text-rose-800 border border-rose-150' 
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {diff < 0 ? '-' : diff > 0 ? '+' : ''}{Math.abs(pct).toFixed(2)}%
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-6 border-t border-slate-200 mt-6 justify-end">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
              Reset Values
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-white transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Apply Changes
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

