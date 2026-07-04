/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Product, HistoricalIPhone, ProductVariant } from './types';
import { INITIAL_PRODUCTS, INITIAL_HISTORICAL_IPHONES } from './data/seedData';
import StatsDashboard from './components/StatsDashboard';
import ProductTable from './components/ProductTable';
import EditDialog from './components/EditDialog';
import AddDialog from './components/AddDialog';
import ProductDetailDrawer from './components/ProductDetailDrawer';
import HistorySection from './components/HistorySection';
import AddHistoryDialog from './components/AddHistoryDialog';
import { Info, ShieldCheck, Menu } from 'lucide-react';

const LOCAL_STORAGE_PRODUCTS_KEY = 'apple_tracker_products_v1';
const LOCAL_STORAGE_HISTORY_KEY = 'apple_tracker_history_v1';

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [historicalList, setHistoricalList] = useState<HistoricalIPhone[]>([]);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Dialog States
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAddHistoryOpen, setIsAddHistoryOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Load from local storage
  useEffect(() => {
    const savedProducts = localStorage.getItem(LOCAL_STORAGE_PRODUCTS_KEY);
    const savedHistory = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);

    if (savedProducts) {
      try {
        const parsed = JSON.parse(savedProducts);
        // Ensure all loaded products have isAvailable and color defaults
        setProducts(parsed.map((p: any) => ({
          ...p,
          isAvailable: p.isAvailable ?? true,
          color: p.color ?? 'Standard'
        })));
      } catch (e) {
        setProducts(INITIAL_PRODUCTS.map(p => ({ ...p, isAvailable: true, color: 'Standard' })));
      }
    } else {
      setProducts(INITIAL_PRODUCTS.map(p => ({ ...p, isAvailable: true, color: 'Standard' })));
    }

    if (savedHistory) {
      try {
        setHistoricalList(JSON.parse(savedHistory));
      } catch (e) {
        setHistoricalList(INITIAL_HISTORICAL_IPHONES);
      }
    } else {
      setHistoricalList(INITIAL_HISTORICAL_IPHONES);
    }
  }, []);

  // Sync to local storage
  const saveProductsToStorage = (updatedProducts: Product[]) => {
    setProducts(updatedProducts);
    localStorage.setItem(LOCAL_STORAGE_PRODUCTS_KEY, JSON.stringify(updatedProducts));
  };

  const saveHistoryToStorage = (updatedHistory: HistoricalIPhone[]) => {
    setHistoricalList(updatedHistory);
    localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(updatedHistory));
  };

  // Actions
  const handleEditSave = (
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
  ) => {
    const updated = products.map(p => {
      if (p.id === id) {
        return {
          ...p,
          model: updatedModel,
          category: updatedCategory,
          baseConfig: updatedBaseConfig,
          pastPrice: updatedPastPrice,
          currentPrice: updatedCurrentPrice,
          notes: updatedNotes,
          color: updatedColor,
          isAvailable: updatedIsAvailable,
          variants: updatedVariants
        };
      }
      return p;
    });
    saveProductsToStorage(updated);

    if (selectedProduct && selectedProduct.id === id) {
      const updatedSel = updated.find(p => p.id === id);
      if (updatedSel) {
        setSelectedProduct(updatedSel);
      }
    }
  };

  const handleVariantSelect = (productId: string, variantId: string) => {
    const updated = products.map(p => {
      if (p.id === productId && p.variants) {
        const variant = p.variants.find(v => v.id === variantId);
        if (variant) {
          const updatedProduct = {
            ...p,
            selectedVariantId: variantId,
            baseConfig: variant.baseConfig,
            currentPrice: variant.currentPrice,
            pastPrice: variant.pastPrice,
            color: variant.color ?? p.color
          };
          setSelectedProduct(updatedProduct);
          return updatedProduct;
        }
      }
      return p;
    });
    saveProductsToStorage(updated);
  };

  const handleToggleAvailability = (id: string) => {
    const updated = products.map(p => {
      if (p.id === id) {
        return {
          ...p,
          isAvailable: p.isAvailable === false ? true : false
        };
      }
      return p;
    });
    saveProductsToStorage(updated);
  };

  const handleAddProduct = (newProductData: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...newProductData,
      id: `custom-${Date.now()}`
    };
    const updated = [newProduct, ...products];
    saveProductsToStorage(updated);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('Are you sure you want to delete this product from the catalog?')) {
      const updated = products.filter(p => p.id !== id);
      saveProductsToStorage(updated);
      if (selectedProduct && selectedProduct.id === id) {
        setIsDetailOpen(false);
        setSelectedProduct(null);
      }
    }
  };

  const handleUpdateHistorical = (id: string, updatedFields: Partial<HistoricalIPhone>) => {
    const updated = historicalList.map(h => {
      if (h.id === id) {
        return { ...h, ...updatedFields };
      }
      return h;
    });
    saveHistoryToStorage(updated);
  };

  const handleDeleteHistorical = (id: string) => {
    if (confirm('Are you sure you want to delete this historical launch record?')) {
      const updated = historicalList.filter(h => h.id !== id);
      saveHistoryToStorage(updated);
    }
  };

  const handleAddHistorical = (item: Omit<HistoricalIPhone, 'id'>) => {
    const newItem: HistoricalIPhone = {
      ...item,
      id: `hist-${Date.now()}`
    };
    const updated = [...historicalList, newItem].sort((a, b) => a.year - b.year);
    saveHistoryToStorage(updated);
  };

  const handleResetCurrentCatalog = () => {
    if (confirm('Are you sure you want to revert all current prices to official Apple India MRP default seed values? This will remove custom added products too.')) {
      saveProductsToStorage(INITIAL_PRODUCTS.map(p => ({ ...p, isAvailable: true, color: 'Standard' })));
    }
  };

  const handleResetHistory = () => {
    if (confirm('Are you sure you want to revert all iPhone launch pricing records back to historical defaults?')) {
      saveHistoryToStorage(INITIAL_HISTORICAL_IPHONES);
    }
  };

  const handleImportProducts = (imported: Product[]) => {
    const defaultified = imported.map(p => ({
      ...p,
      isAvailable: p.isAvailable ?? true,
      color: p.color ?? 'Standard'
    }));
    saveProductsToStorage(defaultified);
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-slate-50 font-sans text-slate-800 overflow-hidden" id="app-root">
      
      {/* Sidebar Backdrop Overlay on Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar: Structural Anchor */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800 transition-transform duration-300 lg:static lg:translate-x-0 lg:flex shrink-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-8 border-b border-slate-800">
          <div className="w-10 h-10 bg-white flex items-center justify-center mb-4 text-slate-900 font-bold text-2xl">
            
          </div>
          <h1 className="text-xs font-bold tracking-widest uppercase opacity-60">Price Matrix</h1>
          <p className="text-lg font-light text-slate-200">Apple Price Index</p>
        </div>
        
        <nav className="flex-1 px-4 py-8 space-y-2">
          <button
            onClick={() => {
              setActiveTab('current');
              setIsSidebarOpen(false);
            }}
            className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'current'
                ? 'bg-white/10 border-l-4 border-white font-medium text-white'
                : 'opacity-40 hover:opacity-100 text-slate-300'
            }`}
          >
            <span className="text-sm font-medium">Active Catalog</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('history');
              setIsSidebarOpen(false);
            }}
            className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white/10 border-l-4 border-white font-medium text-white'
                : 'opacity-40 hover:opacity-100 text-slate-300'
            }`}
          >
            <span className="text-sm font-medium">Launch History</span>
          </button>
        </nav>

        <div className="p-8 border-t border-slate-800 text-[10px] text-slate-500 font-mono tracking-wider">
          MARKET OVERVIEW
        </div>
      </aside>

      {/* Main Content: Geometric Grid */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Top Header Bar */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-10 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-sm sm:text-base font-bold uppercase tracking-widest text-slate-900">
              Apple Device Pricing
            </h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden sm:block text-right">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Pricing Target</p>
              <p className="text-xs font-semibold text-slate-700">INDIA / INR (₹)</p>
            </div>
            {activeTab === 'current' ? (
              <button
                onClick={() => setIsAddOpen(true)}
                className="px-4 sm:px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap"
              >
                Add Product
              </button>
            ) : (
              <button
                onClick={() => setIsAddHistoryOpen(true)}
                className="px-4 sm:px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap"
              >
                Add History Record
              </button>
            )}
          </div>
        </header>

        {/* Summary Tiles */}
        <StatsDashboard products={products} />

        {/* Content body with standard grid and scroll bar */}
        <div className="flex-1 p-6 lg:p-10 overflow-y-auto bg-slate-50">
          
          {activeTab === 'current' ? (
            <div className="space-y-6">
              <ProductTable 
                products={products}
                selectedProductId={selectedProduct?.id ?? null}
                onEditClick={(p) => {
                  setEditingProduct(p);
                  setIsEditOpen(true);
                }}
                onDeleteProduct={handleDeleteProduct}
                onResetAll={handleResetCurrentCatalog}
                onImportData={handleImportProducts}
                onToggleAvailability={handleToggleAvailability}
                onProductSelect={(p) => {
                  setSelectedProduct(p);
                  setIsDetailOpen(true);
                }}
              />
            </div>
          ) : (
            <div className="space-y-6">
              <HistorySection 
                historicalList={historicalList}
                onUpdateHistory={handleUpdateHistorical}
                onDeleteHistory={handleDeleteHistorical}
                onResetAll={handleResetHistory}
              />
            </div>
          )}

          {/* Methodology Notes Card */}
          <div className="bg-white border border-slate-200 p-8 mt-10" id="methodology-notes">
            <div className="flex gap-4">
              <div className="p-3 bg-slate-50 text-slate-600 border border-slate-200 shrink-0 h-12 w-12 flex items-center justify-center">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-mono font-bold text-slate-800 uppercase tracking-widest">
                  Sources & Methodology (Apple India Market)
                </h4>
                <ul className="text-xs text-slate-500 mt-4 space-y-2 list-disc pl-4 leading-relaxed">
                  <li>
                    <strong className="text-slate-700">Official Retail MRPs:</strong> Initial pricing models correspond to pulled prices live from the official <a href="https://www.apple.com/in/" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-900">Apple India Store</a> as of July 2026. All prices are in Indian Rupees (₹) and include full GST.
                  </li>
                  <li>
                    <strong className="text-slate-700">DRAM/NAND Shortage Hikes:</strong> Price revisions recorded in June 2026 reflect adjustments due to global memory-chip shortages which drove up starting rates on iPad Pro, Mac mini, iMac, and MacBook Air models.
                  </li>
                  <li>
                    <strong className="text-slate-700">Tax Transition:</strong> Historic launch figures prior to July 2017 correspond to VAT-inclusive pricing distributed via third-party resellers (Redington, Ingram Micro), while subsequent launches align with the post-GST unified tariff structure.
                  </li>
                  <li>
                    <strong className="text-slate-700">Instant Off-grid Calculations:</strong> All difference calculations, percentage changes, and peak adjustments computed dynamically client-side in real-time.
                  </li>
                </ul>
              </div>
            </div>
          </div>

        </div>

        {/* Footer: System Meta */}
        <footer className="h-10 bg-slate-100 border-t border-slate-200 flex items-center justify-between px-10 text-[9px] uppercase tracking-widest text-slate-400 font-bold shrink-0">
          <div>Apple India Price Index</div>
          <div className="flex gap-8">
            <span>Currency: INR (₹)</span>
            <span>All calculations active</span>
          </div>
        </footer>

      </main>

      {/* Dialog Modals */}
      <EditDialog 
        product={editingProduct}
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleEditSave}
      />

      <AddDialog 
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdd={handleAddProduct}
      />

      <AddHistoryDialog 
        isOpen={isAddHistoryOpen}
        onClose={() => setIsAddHistoryOpen(false)}
        onAdd={handleAddHistorical}
      />

      <ProductDetailDrawer 
        product={selectedProduct}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedProduct(null);
        }}
        onVariantSelect={handleVariantSelect}
      />

    </div>
  );
}

