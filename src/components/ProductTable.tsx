/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { Product, CategoryFilter } from '../types';
import { 
  Search, Edit2, Trash2, Smartphone, Tablet, Laptop, Watch, Headphones, Tv, Sparkles, 
  TrendingDown, TrendingUp, RefreshCw, FileDown, FileUp
} from 'lucide-react';

interface ProductTableProps {
  products: Product[];
  onEditClick: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onResetAll: () => void;
  onImportData: (imported: Product[]) => void;
}

export default function ProductTable({ 
  products, 
  onEditClick, 
  onDeleteProduct, 
  onResetAll,
  onImportData
}: ProductTableProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNotification, setShowNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories: { label: CategoryFilter; icon: React.ReactNode }[] = [
    { label: 'All', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { label: 'iPhone', icon: <Smartphone className="w-3.5 h-3.5" /> },
    { label: 'iPad', icon: <Tablet className="w-3.5 h-3.5" /> },
    { label: 'Mac', icon: <Laptop className="w-3.5 h-3.5" /> },
    { label: 'Apple Watch', icon: <Watch className="w-3.5 h-3.5" /> },
    { label: 'AirPods', icon: <Headphones className="w-3.5 h-3.5" /> },
    { label: 'TV, Home & Accessories', icon: <Tv className="w-3.5 h-3.5" /> }
  ];

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const matchesSearch = product.model.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            product.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            product.baseConfig.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchTerm]);

  const formatINR = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'iPhone': return <Smartphone className="w-4 h-4 text-slate-500" />;
      case 'iPad': return <Tablet className="w-4 h-4 text-slate-500" />;
      case 'Mac': return <Laptop className="w-4 h-4 text-slate-500" />;
      case 'Apple Watch': return <Watch className="w-4 h-4 text-slate-500" />;
      case 'AirPods': return <Headphones className="w-4 h-4 text-slate-500" />;
      default: return <Tv className="w-4 h-4 text-slate-500" />;
    }
  };

  const triggerNotification = (message: string) => {
    setShowNotification(message);
    setTimeout(() => {
      setShowNotification(null);
    }, 3000);
  };

  const handleExport = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(products, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "apple_products_rupee_prices_backup.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      triggerNotification("Product catalog successfully exported!");
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json) && json.every(p => p.id && p.model && p.pastPrice !== undefined && p.currentPrice !== undefined)) {
          onImportData(json);
          triggerNotification("Product catalog successfully imported!");
        } else {
          alert("Invalid backup file structure. Ensure it is a valid list of Apple products.");
        }
      } catch (err) {
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  return (
    <div className="bg-white border border-slate-200" id="product-table-card">
      
      {/* Search and Filters Section */}
      <div className="p-8 border-b border-slate-200 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold tracking-tight text-slate-900 uppercase">
              Product Registry
            </h3>
            <p className="text-xs text-slate-400">
              Interactive catalog of current Indian Rupee pricing structures
            </p>
          </div>

          {/* Backup, Restore, and Search row */}
          <div className="flex flex-wrap items-center gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".json" 
              className="hidden" 
            />
            
            <button
              onClick={handleImportClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer"
              title="Import JSON Backup"
            >
              <FileUp className="w-3.5 h-3.5" />
              Import
            </button>

            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer"
              title="Export Current Catalog to JSON"
            >
              <FileDown className="w-3.5 h-3.5" />
              Export
            </button>

            <button
              onClick={onResetAll}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer"
              title="Reset catalog back to initial Apple MRP prices"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset MRPs
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
          {/* Category tabs instead of rounded pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 md:pb-0 scrollbar-none border-b border-slate-100 md:border-0">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.label;
              return (
                <button
                  key={cat.label}
                  onClick={() => setSelectedCategory(cat.label)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                    isActive 
                      ? 'border-slate-900 text-slate-900 font-bold bg-slate-50' 
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {cat.icon}
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative max-w-sm w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search specifications, model, notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 bg-slate-50/50"
            />
          </div>
        </div>

        {/* Success Alert toast inside list */}
        {showNotification && (
          <div className="p-4 bg-emerald-50 text-emerald-800 border-l-4 border-emerald-500 flex items-center gap-2 text-xs font-mono font-medium animate-fade-in">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span>{showNotification}</span>
          </div>
        )}
      </div>

      {/* Table Catalog */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">
              <th className="py-4 px-6">Product</th>
              <th className="py-4 px-5">Configuration</th>
              <th className="py-4 px-5 text-right">Past MRP (₹)</th>
              <th className="py-4 px-5 text-right">Current MRP (₹)</th>
              <th className="py-4 px-5 text-center">Net Offset (₹)</th>
              <th className="py-4 px-6 text-center">Operation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-slate-400 font-mono">
                  No products matched the active filter query.
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => {
                const priceDiff = product.currentPrice - product.pastPrice;
                const percentDiff = product.pastPrice > 0 ? (priceDiff / product.pastPrice) * 100 : 0;

                return (
                  <tr key={product.id} className="hover:bg-slate-50/60 transition-colors group">
                    
                    {/* Product Name & Category */}
                    <td className="py-4 px-6">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-50 border border-slate-200 transition-colors shrink-0 mt-0.5">
                          {getCategoryIcon(product.category)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-[13px] flex items-center gap-1.5">
                            {product.model}
                            {product.isCustom && (
                              <span className="text-[9px] font-mono font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 uppercase tracking-wider border border-amber-100">
                                CUSTOM_RECORD
                              </span>
                            )}
                          </div>
                          {product.notes && (
                            <p className="text-[11px] text-slate-400 mt-0.5 max-w-[280px] truncate" title={product.notes}>
                              {product.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Specs / Configuration */}
                    <td className="py-4 px-5 text-slate-600 font-mono">
                      <span className="px-2 py-1 bg-slate-50 text-slate-500 text-[11px] border border-slate-150">
                        {product.baseConfig}
                      </span>
                    </td>

                    {/* Past Price */}
                    <td className="py-4 px-5 text-right font-mono text-slate-500">
                      {formatINR(product.pastPrice)}
                    </td>

                    {/* Current Price */}
                    <td className="py-4 px-5 text-right font-mono font-bold text-slate-900">
                      {formatINR(product.currentPrice)}
                    </td>

                    {/* Price Shift (Difference calculated automatically) */}
                    <td className="py-4 px-5 text-center">
                      {priceDiff === 0 ? (
                        <span className="text-slate-400 font-mono text-[11px]">UNCHANGED</span>
                      ) : (
                        <div className="inline-flex flex-col items-center gap-0.5">
                          <span className={`inline-flex items-center gap-1 font-mono text-[11px] font-bold px-2 py-0.5 ${
                            priceDiff < 0 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-rose-50 text-rose-700 border border-rose-100'
                          }`}>
                            {priceDiff < 0 ? (
                              <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
                            )}
                            {priceDiff > 0 ? '+' : ''}
                            {formatINR(priceDiff)}
                          </span>
                          <span className={`text-[10px] font-mono font-semibold ${
                            priceDiff < 0 ? 'text-emerald-600' : 'text-rose-500'
                          }`}>
                            {priceDiff > 0 ? '+' : ''}{percentDiff.toFixed(2)}%
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onEditClick(product)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
                          title="Quick Edit Current & Past Prices"
                        >
                          <Edit2 className="w-3 h-3 text-slate-400" />
                          Modify Price
                        </button>

                        {product.isCustom && (
                          <button
                            onClick={() => onDeleteProduct(product.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer border border-transparent hover:border-red-100"
                            title="Delete Custom Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}

