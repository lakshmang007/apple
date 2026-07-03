/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Product } from '../types';

interface StatsDashboardProps {
  products: Product[];
}

export default function StatsDashboard({ products }: StatsDashboardProps) {
  const totalProducts = products.length;

  const drops = products.filter(p => p.currentPrice < p.pastPrice);
  const increases = products.filter(p => p.currentPrice > p.pastPrice);

  let netChange = 0;
  let maxDropProduct: Product | null = null;
  let maxDropAmount = 0;

  products.forEach(p => {
    const diff = p.currentPrice - p.pastPrice;
    netChange += diff;

    if (diff < 0) {
      const absDiff = Math.abs(diff);
      if (absDiff > maxDropAmount) {
        maxDropAmount = absDiff;
        maxDropProduct = p;
      }
    }
  });

  const formatINR = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[1px] bg-slate-200 border-b border-slate-200">
      {/* Total Assets / Products */}
      <div className="bg-white p-5 md:p-6 lg:p-8">
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Items Cataloged</p>
        <p className="text-3xl font-light font-mono text-slate-900">{totalProducts}</p>
        <p className="text-[10px] text-slate-400 font-mono mt-2">
          {drops.length} Reduced • {increases.length} Increased
        </p>
      </div>

      {/* Average/Net Price Shift */}
      <div className="bg-white p-5 md:p-6 lg:p-8">
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Net Price Shift</p>
        <p className={`text-3xl font-light font-mono ${netChange < 0 ? 'text-emerald-600' : netChange > 0 ? 'text-rose-500' : 'text-slate-500'}`}>
          {netChange > 0 ? '+' : ''}{formatINR(netChange)}
        </p>
        <p className="text-[10px] text-slate-400 font-mono mt-2">
          {netChange <= 0 ? 'CALCULATED DEFLATION' : 'CALCULATED INFLATION'}
        </p>
      </div>

      {/* Highest Price Drop */}
      <div className="bg-white p-5 md:p-6 lg:p-8">
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Peak Discount</p>
        <p className="text-3xl font-light text-emerald-600 font-mono">
          {maxDropAmount > 0 ? `-${formatINR(maxDropAmount)}` : '₹0'}
        </p>
        <p className="text-[10px] text-slate-400 font-mono mt-2 truncate">
          {maxDropProduct ? (maxDropProduct as Product).model : 'NO PRICE DROPS'}
        </p>
      </div>

      {/* Tax rate baseline or other KPI */}
      <div className="bg-white p-5 md:p-6 lg:p-8">
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Tax Rate (GST)</p>
        <p className="text-3xl font-light font-mono text-slate-900">18%</p>
        <p className="text-[10px] text-slate-400 font-mono mt-2">
          INCLUDED IN ALL INDIA MRPs
        </p>
      </div>
    </section>
  );
}

