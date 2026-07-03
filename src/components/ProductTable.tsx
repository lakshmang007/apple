/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { Product, CategoryFilter } from '../types';
import { 
  Search, Edit2, Trash2, Smartphone, Tablet, Laptop, Watch, Headphones, Tv, Sparkles, 
  TrendingDown, TrendingUp, RefreshCw, FileDown, FileUp, Mic, MicOff, List, Grid
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
  const [isGroupedView, setIsGroupedView] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showNotification, setShowNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories: { label: CategoryFilter; icon: React.ReactNode; color: string }[] = [
    { label: 'All', icon: <Sparkles className="w-3.5 h-3.5" />, color: 'bg-slate-100 text-slate-800' },
    { label: 'iPhone', icon: <Smartphone className="w-3.5 h-3.5" />, color: 'bg-blue-50 text-blue-700' },
    { label: 'iPad', icon: <Tablet className="w-3.5 h-3.5" />, color: 'bg-purple-50 text-purple-700' },
    { label: 'Mac', icon: <Laptop className="w-3.5 h-3.5" />, color: 'bg-amber-50 text-amber-700' },
    { label: 'Apple Watch', icon: <Watch className="w-3.5 h-3.5" />, color: 'bg-rose-50 text-rose-700' },
    { label: 'AirPods', icon: <Headphones className="w-3.5 h-3.5" />, color: 'bg-emerald-50 text-emerald-700' },
    { label: 'TV, Home & Accessories', icon: <Tv className="w-3.5 h-3.5" />, color: 'bg-slate-50 text-slate-700' }
  ];

  // Auto-calculated category stats for visual segregation widgets
  const categoryStats = useMemo(() => {
    const stats: Record<string, { count: number; avgPrice: number; netDiff: number }> = {};
    categories.forEach(cat => {
      if (cat.label === 'All') return;
      const catProducts = products.filter(p => p.category === cat.label);
      const totalCurrent = catProducts.reduce((sum, p) => sum + p.currentPrice, 0);
      const totalPast = catProducts.reduce((sum, p) => sum + p.pastPrice, 0);
      stats[cat.label] = {
        count: catProducts.length,
        avgPrice: catProducts.length > 0 ? Math.round(totalCurrent / catProducts.length) : 0,
        netDiff: totalCurrent - totalPast
      };
    });
    return stats;
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const matchesSearch = product.model.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            product.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            product.baseConfig.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchTerm]);

  // Grouped products structure
  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    filteredProducts.forEach(p => {
      if (!groups[p.category]) {
        groups[p.category] = [];
      }
      groups[p.category].push(p);
    });
    return groups;
  }, [filteredProducts]);

  const formatINR = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'iPhone': return <Smartphone className="w-4 h-4 text-slate-600" />;
      case 'iPad': return <Tablet className="w-4 h-4 text-slate-600" />;
      case 'Mac': return <Laptop className="w-4 h-4 text-slate-600" />;
      case 'Apple Watch': return <Watch className="w-4 h-4 text-slate-600" />;
      case 'AirPods': return <Headphones className="w-4 h-4 text-slate-600" />;
      default: return <Tv className="w-4 h-4 text-slate-600" />;
    }
  };

  const triggerNotification = (message: string) => {
    setShowNotification(message);
    setTimeout(() => {
      setShowNotification(null);
    }, 3500);
  };

  // Web Speech API Voice Search
  const handleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice Search is not supported in this browser viewport. Please try Chrome, Safari, or Edge.");
      return;
    }

    if (isListening) {
      return; // already listening
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-IN'; // Highly tuned to understand Indian accented tech names
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      triggerNotification("🎙️ Listening... Say product names (e.g. 'iPhone 15 Pro', 'MacBook Air')");
    };

    recognition.onerror = (event: any) => {
      console.error("Speech Recognition Error", event.error);
      setIsListening(false);
      triggerNotification(`❌ Voice search error: ${event.error}`);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      // strip trailing periods if any
      const cleaned = transcript.replace(/\.$/g, '');
      setSearchTerm(cleaned);
      triggerNotification(`🎙️ Matched search query: "${cleaned}"`);
    };

    recognition.start();
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
    <div className="space-y-6" id="product-registry-container">
      
      {/* Category Overview Cards: Visual Segregation Bento */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {categories.map((cat) => {
          if (cat.label === 'All') return null;
          const stats = categoryStats[cat.label] || { count: 0, avgPrice: 0, netDiff: 0 };
          const isSelected = selectedCategory === cat.label;
          
          return (
            <button
              key={`bento-${cat.label}`}
              onClick={() => setSelectedCategory(cat.label)}
              className={`text-left p-4 border transition-all cursor-pointer group flex flex-col justify-between ${
                isSelected 
                  ? 'bg-slate-900 border-slate-900 text-white' 
                  : 'bg-white border-slate-200 hover:border-slate-400 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`p-1.5 ${isSelected ? 'bg-white/10 text-white' : 'bg-slate-50 text-slate-700'} transition-colors`}>
                  {cat.icon}
                </span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {stats.count} ITEMS
                </span>
              </div>
              
              <div className="mt-4">
                <p className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                  {cat.label === 'TV, Home & Accessories' ? 'Accessories' : cat.label}
                </p>
                <p className="text-sm font-bold tracking-tight mt-0.5 truncate">
                  {stats.avgPrice > 0 ? `Avg: ₹${Math.round(stats.avgPrice / 1000)}k` : '—'}
                </p>
                {stats.netDiff !== 0 && (
                  <p className={`text-[9px] font-mono font-semibold mt-1 flex items-center gap-0.5 ${
                    stats.netDiff < 0 
                      ? 'text-emerald-400' 
                      : isSelected ? 'text-rose-300' : 'text-rose-600'
                  }`}>
                    {stats.netDiff < 0 ? '↓' : '↑'} {formatINR(Math.abs(stats.netDiff))}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-white border border-slate-200" id="product-table-card">
        
        {/* Search and Filters Section */}
        <div className="p-6 md:p-8 border-b border-slate-200 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold tracking-widest text-slate-900 uppercase">
                Active Catalog Registry
              </h3>
              <p className="text-xs text-slate-400">
                Interactive Indian Rupee pricing structures. Filter or search using controls below.
              </p>
            </div>

            {/* Backup, Restore, and Import controls */}
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
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer h-10"
                title="Import JSON Backup"
              >
                <FileUp className="w-3.5 h-3.5" />
                Import
              </button>

              <button
                onClick={handleExport}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer h-10"
                title="Export Current Catalog to JSON"
              >
                <FileDown className="w-3.5 h-3.5" />
                Export
              </button>

              <button
                onClick={onResetAll}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer h-10"
                title="Reset catalog back to initial Apple MRP prices"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset MRPs
              </button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
            {/* Category tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-2 md:pb-0 scrollbar-none border-b border-slate-100 md:border-0 w-full md:w-auto">
              {categories.map((cat) => {
                const isActive = selectedCategory === cat.label;
                return (
                  <button
                    key={`tab-${cat.label}`}
                    onClick={() => setSelectedCategory(cat.label)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap transition-all border-b-2 cursor-pointer ${
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

            {/* View Mode Toggle & Search Input with Voice */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              
              {/* Segregation Layout Toggle */}
              <div className="inline-flex border border-slate-200 bg-slate-50 p-0.5">
                <button
                  type="button"
                  onClick={() => setIsGroupedView(false)}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                    !isGroupedView 
                      ? 'bg-white text-slate-900 shadow-xs' 
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="Unified flat table"
                >
                  <List className="w-3.5 h-3.5" />
                  Unified
                </button>
                <button
                  type="button"
                  onClick={() => setIsGroupedView(true)}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                    isGroupedView 
                      ? 'bg-white text-slate-900 shadow-xs' 
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="Segregated grouped blocks"
                >
                  <Grid className="w-3.5 h-3.5" />
                  Grouped
                </button>
              </div>

              {/* Search Bar with Microphone Trigger */}
              <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search specs, model, notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-12 py-2.5 text-xs border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50"
                />
                <button
                  type="button"
                  onClick={handleVoiceSearch}
                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 transition-all cursor-pointer ${
                    isListening 
                      ? 'text-rose-600 bg-rose-50 animate-pulse rounded-full' 
                      : 'text-slate-400 hover:text-slate-800'
                  }`}
                  title="Voice Search for Quick Access"
                  aria-label="Voice Search"
                >
                  {isListening ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>
              </div>
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

        {/* Catalog Output: Grouped View vs Unified View */}
        {isGroupedView ? (
          <div className="divide-y divide-slate-200">
            {Object.keys(groupedProducts).length === 0 ? (
              <div className="py-16 text-center text-slate-400 font-mono text-xs">
                No products found matching active filters.
              </div>
            ) : (
              Object.keys(groupedProducts).map((catName) => {
                const groupItems = groupedProducts[catName];
                return (
                  <div key={`group-${catName}`} className="p-6 md:p-8 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <span className="p-1.5 bg-slate-100 text-slate-800">
                        {getCategoryIcon(catName)}
                      </span>
                      <h4 className="text-xs font-bold font-mono tracking-widest uppercase text-slate-700">
                        {catName} Catalog ({groupItems.length} listed)
                      </h4>
                    </div>

                    {/* Desktop rendering for grouped view */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">
                            <th className="py-2.5 px-4">Product Name</th>
                            <th className="py-2.5 px-4">Configuration</th>
                            <th className="py-2.5 px-4 text-right">Past MRP (₹)</th>
                            <th className="py-2.5 px-4 text-right">Current MRP (₹)</th>
                            <th className="py-2.5 px-4 text-center">Net Offset (₹)</th>
                            <th className="py-2.5 px-4 text-center">Operation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {groupItems.map(p => (
                            <ProductRow 
                              key={`grouped-${p.id}`} 
                              product={p} 
                              onEditClick={onEditClick} 
                              onDeleteProduct={onDeleteProduct} 
                              getCategoryIcon={getCategoryIcon}
                              formatINR={formatINR}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile rendering for grouped view */}
                    <div className="block md:hidden space-y-3">
                      {groupItems.map(p => (
                        <ProductCard 
                          key={`grouped-card-${p.id}`} 
                          product={p} 
                          onEditClick={onEditClick} 
                          onDeleteProduct={onDeleteProduct} 
                          getCategoryIcon={getCategoryIcon}
                          formatINR={formatINR}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Unified Standard List View */
          <>
            {/* Desktop Unified Table */}
            <div className="hidden md:block overflow-x-auto">
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
                    filteredProducts.map((p) => (
                      <ProductRow 
                        key={`unified-${p.id}`} 
                        product={p} 
                        onEditClick={onEditClick} 
                        onDeleteProduct={onDeleteProduct} 
                        getCategoryIcon={getCategoryIcon}
                        formatINR={formatINR}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Unified List: Touch-Friendly Responsive Cards */}
            <div className="block md:hidden divide-y divide-slate-100 bg-white">
              {filteredProducts.length === 0 ? (
                <div className="py-16 text-center text-slate-400 font-mono text-xs">
                  No products matched the active filter query.
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {filteredProducts.map((p) => (
                    <ProductCard 
                      key={`unified-card-${p.id}`} 
                      product={p} 
                      onEditClick={onEditClick} 
                      onDeleteProduct={onDeleteProduct} 
                      getCategoryIcon={getCategoryIcon}
                      formatINR={formatINR}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}

/* Dedicated Sub-Component for Clean, Performant Table Rows */
interface ProductRowProps {
  key?: React.Key;
  product: Product;
  onEditClick: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  getCategoryIcon: (category: string) => React.ReactNode;
  formatINR: (value: number) => string;
}

function ProductRow({ product, onEditClick, onDeleteProduct, getCategoryIcon, formatINR }: ProductRowProps) {
  const priceDiff = product.currentPrice - product.pastPrice;
  const percentDiff = product.pastPrice > 0 ? (priceDiff / product.pastPrice) * 100 : 0;

  return (
    <tr className="hover:bg-slate-50/60 transition-colors group">
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
                  CUSTOM
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

      {/* Price Shift */}
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
              {priceDiff < 0 ? '↓' : '↑'} {formatINR(Math.abs(priceDiff))}
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
            Modify
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
}

/* Dedicated Sub-Component for Touch-Friendly Mobile Cards */
interface ProductCardProps {
  key?: React.Key;
  product: Product;
  onEditClick: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  getCategoryIcon: (category: string) => React.ReactNode;
  formatINR: (value: number) => string;
}

function ProductCard({ product, onEditClick, onDeleteProduct, getCategoryIcon, formatINR }: ProductCardProps) {
  const priceDiff = product.currentPrice - product.pastPrice;
  const percentDiff = product.pastPrice > 0 ? (priceDiff / product.pastPrice) * 100 : 0;

  return (
    <div className="bg-slate-50/50 p-4 border border-slate-200 flex flex-col justify-between space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="p-2 bg-white border border-slate-200 shrink-0 mt-0.5">
            {getCategoryIcon(product.category)}
          </div>
          <div>
            <h5 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
              {product.model}
              {product.isCustom && (
                <span className="text-[8px] font-mono font-bold bg-amber-50 text-amber-700 px-1 py-0.5 uppercase tracking-wider border border-amber-100">
                  CUSTOM
                </span>
              )}
            </h5>
            <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
              {product.category}
            </span>
            {product.notes && (
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed bg-white p-2 border border-slate-100">
                {product.notes}
              </p>
            )}
          </div>
        </div>

        {/* Specs Badge */}
        <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-mono font-bold uppercase shrink-0">
          {product.baseConfig}
        </span>
      </div>

      {/* Pricing Information Stack */}
      <div className="grid grid-cols-2 gap-2 bg-white p-3 border border-slate-150">
        <div>
          <span className="text-[9px] font-mono text-slate-400 uppercase block">Past Price</span>
          <span className="font-mono text-xs text-slate-500">{formatINR(product.pastPrice)}</span>
        </div>
        <div>
          <span className="text-[9px] font-mono text-slate-400 uppercase block font-bold">Current MRP</span>
          <span className="font-mono text-sm text-slate-900 font-bold">{formatINR(product.currentPrice)}</span>
        </div>
      </div>

      {/* Bottom control panel */}
      <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-3">
        {/* Price Offset Badge */}
        <div>
          {priceDiff === 0 ? (
            <span className="text-[10px] font-mono text-slate-400 font-bold">UNCHANGED</span>
          ) : (
            <span className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-1 ${
              priceDiff < 0 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                : 'bg-rose-50 text-rose-800 border border-rose-100'
            }`}>
              {priceDiff < 0 ? '↓' : '↑'} {formatINR(Math.abs(priceDiff))} ({percentDiff.toFixed(1)}%)
            </span>
          )}
        </div>

        {/* Edit / Delete Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onEditClick(product)}
            className="inline-flex items-center gap-1 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 active:bg-slate-100 transition-all cursor-pointer h-10"
          >
            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
            Modify
          </button>
          
          {product.isCustom && (
            <button
              onClick={() => onDeleteProduct(product.id)}
              className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-100 bg-white transition-all cursor-pointer h-10 w-10 flex items-center justify-center"
              aria-label="Delete Custom Product"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

