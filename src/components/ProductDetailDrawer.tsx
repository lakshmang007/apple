/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Product } from '../types';
import { X, CreditCard, Layers, ShieldCheck, Tag } from 'lucide-react';

interface ProductDetailDrawerProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onVariantSelect: (productId: string, variantId: string) => void;
}

export default function ProductDetailDrawer({
  product,
  isOpen,
  onClose,
  onVariantSelect
}: ProductDetailDrawerProps) {
  if (!isOpen || !product) return null;

  const currentPrice = product.currentPrice;
  const pastPrice = product.pastPrice;
  const priceDiff = currentPrice - pastPrice;
  const percentDiff = pastPrice > 0 ? (priceDiff / pastPrice) * 100 : 0;

  const formatINR = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Standard No Cost EMI durations (3, 6, 12, 18, 24 months)
  const emiTenures = [3, 6, 12, 18, 24];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      {/* Slide-over Drawer container */}
      <div 
        className="fixed right-0 top-0 h-full w-full sm:max-w-md md:max-w-lg bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200 animate-slide-in overflow-hidden"
        id="product-detail-drawer"
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-900 text-white">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-white/10 text-slate-300 uppercase tracking-widest">
              {product.category}
            </span>
            <h3 className="text-base font-bold tracking-tight mt-1 truncate max-w-[280px] sm:max-w-[360px]" title={product.model}>
              {product.model}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close details panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/50">
          
          {/* Main Price & Availability Header */}
          <div className="bg-white p-5 border border-slate-200 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Current MRP</p>
                <p className="text-3xl font-mono font-bold text-slate-900 mt-1">
                  {formatINR(currentPrice)}
                </p>
              </div>
              <div className="text-right">
                <span className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-full border ${
                  product.isAvailable !== false
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-250'
                    : 'bg-rose-50 text-rose-700 border-rose-250'
                }`}>
                  {product.isAvailable !== false ? '● Available' : '○ Unavailable'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
              <span className="text-slate-400">Past MRP: {formatINR(pastPrice)}</span>
              {priceDiff !== 0 ? (
                <span className={`font-mono font-semibold ${
                  priceDiff < 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {priceDiff < 0 ? '↓' : '↑'} {formatINR(Math.abs(priceDiff))} ({percentDiff.toFixed(2)}%)
                </span>
              ) : (
                <span className="text-slate-400 font-mono">UNCHANGED</span>
              )}
            </div>
            {product.notes && (
              <p className="text-xs text-slate-500 italic border-l-2 border-slate-300 pl-3 mt-1">
                {product.notes}
              </p>
            )}
          </div>

          {/* Variants section (Priority) */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Available Configurations ({product.variants.length})
              </h4>
              
              <div className="grid grid-cols-1 gap-2.5">
                {product.variants.map((v) => {
                  const isCurrentVariant = product.selectedVariantId === v.id;
                  const vPriceDiff = v.currentPrice - v.pastPrice;
                  
                  return (
                    <button
                      key={v.id}
                      onClick={() => onVariantSelect(product.id, v.id)}
                      className={`text-left p-4 border transition-all cursor-pointer flex flex-col justify-between gap-2.5 relative overflow-hidden group ${
                        isCurrentVariant
                          ? 'bg-white border-slate-900 shadow-md ring-1 ring-slate-900'
                          : 'bg-white border-slate-200 hover:border-slate-400 hover:bg-slate-50/50'
                      }`}
                    >
                      {isCurrentVariant && (
                        <div className="absolute top-0 right-0 bg-slate-900 text-white text-[9px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider">
                          Active Selection
                        </div>
                      )}
                      
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-800">{v.baseConfig}</p>
                          {v.color && <p className="text-[10px] text-slate-400 mt-0.5">{v.color}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono font-bold text-slate-900">{formatINR(v.currentPrice)}</p>
                          <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                            EMI: {formatINR(Math.round(v.currentPrice / 24))}/mo
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-400 font-mono">
                        <span>Past: {formatINR(v.pastPrice)}</span>
                        {vPriceDiff !== 0 && (
                          <span className={vPriceDiff < 0 ? 'text-emerald-600' : 'text-rose-500'}>
                            {vPriceDiff < 0 ? '↓' : '↑'} {vPriceDiff > 0 ? '+' : ''}{((vPriceDiff / v.pastPrice) * 100).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* No Cost EMI Installment Matrix */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />
              No Cost EMI Payment Calculator
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {emiTenures.map((tenure) => {
                const is24 = tenure === 24;
                const monthlyPayment = Math.round(currentPrice / tenure);
                
                return (
                  <div 
                    key={`emi-${tenure}`}
                    className={`p-4 border flex flex-col justify-between gap-1 relative overflow-hidden bg-white ${
                      is24 
                        ? 'border-amber-455 shadow-xs ring-1 ring-amber-400' 
                        : 'border-slate-200'
                    }`}
                  >
                    {is24 && (
                      <div className="absolute top-0 right-0 bg-amber-400 text-amber-950 text-[8px] font-mono font-bold px-2 py-0.5 uppercase tracking-wider animate-pulse">
                        Best Value
                      </div>
                    )}
                    
                    <div>
                      <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                        {tenure} Months Tenure
                      </p>
                      <p className="text-lg font-mono font-bold text-slate-800 mt-1">
                        {formatINR(monthlyPayment)}<span className="text-xs text-slate-400 font-normal">/mo</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1 mt-1.5">
                      <Tag className="w-3 h-3 text-emerald-600" />
                      <span className="text-[9px] font-mono font-bold text-emerald-700 uppercase bg-emerald-50 px-1 py-0.5 border border-emerald-100">
                        No Cost EMI
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="bg-slate-100 p-4 border border-slate-200 mt-2 text-[11px] text-slate-500 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                EMI values computed above are for illustration purposes and reflect standard 0% interest credit card offers at launch. Actual interest or fees may vary depending on banks or resellers.
              </p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
