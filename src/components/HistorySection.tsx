/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { HistoricalIPhone } from '../types';
import { Calendar, Search, Edit2, RotateCcw, TrendingUp, TrendingDown, Check, X, Mic, MicOff, Sparkles } from 'lucide-react';

interface HistorySectionProps {
  historicalList: HistoricalIPhone[];
  onUpdatePrice: (id: string, newPrice: number) => void;
  onResetAll: () => void;
}

export default function HistorySection({ historicalList, onUpdatePrice, onResetAll }: HistorySectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [hoveredPoint, setHoveredPoint] = useState<HistoricalIPhone | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [showNotification, setShowNotification] = useState<string | null>(null);

  const triggerNotification = (message: string) => {
    setShowNotification(message);
    setTimeout(() => {
      setShowNotification(null);
    }, 3500);
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice Search is not supported in this browser. Please try Google Chrome or Safari.");
      return;
    }

    if (isListening) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-IN';
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      triggerNotification("🎙️ Listening... Say launch year or model name (e.g. '2022', 'iPhone 14')");
    };

    recognition.onerror = (event: any) => {
      console.error("Speech Recognition Error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const cleaned = transcript.replace(/\.$/g, '');
      setSearchTerm(cleaned);
      triggerNotification(`🎙️ Voice search matched: "${cleaned}"`);
    };

    recognition.start();
  };

  // Filter historical list by search
  const filteredList = useMemo(() => {
    return historicalList.filter(item =>
      item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.year.toString().includes(searchTerm)
    );
  }, [historicalList, searchTerm]);

  // Calculations for differences from PREVIOUS year model
  const calculatedHistoryWithDiffs = useMemo(() => {
    return historicalList.map((item, index) => {
      if (index === 0) {
        return { ...item, diff: 0, pct: 0 };
      }
      const prevItem = historicalList[index - 1];
      const diff = item.launchPrice - prevItem.launchPrice;
      const pct = prevItem.launchPrice > 0 ? (diff / prevItem.launchPrice) * 100 : 0;
      return {
        ...item,
        diff,
        pct,
        approxPricePerGB: Math.round(item.launchPrice / parseInt(item.baseStorage))
      };
    });
  }, [historicalList]);

  // Map to search results for easy lookup
  const displayList = useMemo(() => {
    return calculatedHistoryWithDiffs.filter(item =>
      item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.year.toString().includes(searchTerm)
    );
  }, [calculatedHistoryWithDiffs, searchTerm]);

  // Chart Dimensions & Scales
  const chartWidth = 900;
  const chartHeight = 260;
  const paddingLeft = 70;
  const paddingRight = 30;
  const paddingTop = 25;
  const paddingBottom = 45;

  const chartData = useMemo(() => {
    if (historicalList.length === 0) return [];

    // Sort by year
    const sorted = [...historicalList].sort((a, b) => a.year - b.year);
    const years = sorted.map(d => d.year);
    const prices = sorted.map(d => d.launchPrice);

    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const minPrice = 0; // Baseline at 0
    const maxPrice = Math.max(...prices) * 1.1; // Add 10% breathing room

    const points = sorted.map((d) => {
      // Scale calculations
      const x = paddingLeft + ((d.year - minYear) / (maxYear - minYear)) * (chartWidth - paddingLeft - paddingRight);
      const y = chartHeight - paddingBottom - ((d.launchPrice - minPrice) / (maxPrice - minPrice)) * (chartHeight - paddingTop - paddingBottom);
      return {
        ...d,
        x,
        y
      };
    });

    return {
      points,
      minYear,
      maxYear,
      minPrice,
      maxPrice
    };
  }, [historicalList]);

  // Generate SVG path string
  const svgPathString = useMemo(() => {
    if (!chartData || !chartData.points || chartData.points.length === 0) return '';
    const pts = chartData.points;
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      path += ` L ${pts[i].x} ${pts[i].y}`;
    }
    return path;
  }, [chartData]);

  // Generate SVG Area path string
  const svgAreaPathString = useMemo(() => {
    if (!chartData || !chartData.points || chartData.points.length === 0) return '';
    const pts = chartData.points;
    const bottomY = chartHeight - paddingBottom;
    let path = `M ${pts[0].x} ${bottomY} L ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      path += ` L ${pts[i].x} ${pts[i].y}`;
    }
    path += ` L ${pts[pts.length - 1].x} ${bottomY} Z`;
    return path;
  }, [chartData]);

  const formatINR = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const startEditing = (item: HistoricalIPhone) => {
    setEditingId(item.id);
    setEditValue(item.launchPrice);
  };

  const handleSaveEdit = (id: string) => {
    if (editValue < 0) return;
    onUpdatePrice(id, editValue);
    setEditingId(null);
  };

  // Generate Y axis ticks
  const yTicks = useMemo(() => {
    if (!chartData || !chartData.maxPrice) return [];
    const max = chartData.maxPrice;
    const ticks = [];
    const count = 4;
    for (let i = 0; i <= count; i++) {
      ticks.push((max / count) * i);
    }
    return ticks;
  }, [chartData]);

  return (
    <div className="space-y-6">
      
      {/* Chart Section */}
      <div className="bg-white p-8 border border-slate-200" id="history-chart-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-slate-900 uppercase">
              iPhone India Pricing Trend (2008 – 2026)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Launch values mapped over time. Hover nodes to read release statistics.
            </p>
          </div>
          <button
            onClick={onResetAll}
            className="text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 px-4 py-2 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
            Reset Launch Catalog
          </button>
        </div>

        {/* Custom SVG Line Chart */}
        <div className="relative overflow-x-auto select-none pt-2">
          <div className="min-w-[850px] relative">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
              <defs>
                {/* Area Gradient */}
                <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0f172a" stopOpacity="0.10" />
                  <stop offset="100%" stopColor="#0f172a" stopOpacity="0.0" />
                </linearGradient>
                {/* Line Gradient */}
                <linearGradient id="chart-line-grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#64748b" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
              </defs>

              {/* Grid Lines Y-axis */}
              {yTicks.map((tickValue, index) => {
                const y = chartHeight - paddingBottom - (tickValue / chartData.maxPrice) * (chartHeight - paddingTop - paddingBottom);
                return (
                  <g key={`y-grid-${index}`} className="opacity-40">
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={chartWidth - paddingRight}
                      y2={y}
                      stroke="#cbd5e1"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    <text
                      x={paddingLeft - 12}
                      y={y + 4}
                      textAnchor="end"
                      className="text-[9px] font-mono fill-slate-500 font-bold"
                    >
                      ₹{Math.round(tickValue / 1000)}k
                    </text>
                  </g>
                );
              })}

              {/* X-axis baseline */}
              <line
                x1={paddingLeft}
                y1={chartHeight - paddingBottom}
                x2={chartWidth - paddingRight}
                y2={chartHeight - paddingBottom}
                stroke="#475569"
                strokeWidth="1.5"
              />

              {/* Chart Area */}
              {svgAreaPathString && (
                <path
                  d={svgAreaPathString}
                  fill="url(#chart-area-grad)"
                />
              )}

              {/* Chart Line */}
              {svgPathString && (
                <path
                  d={svgPathString}
                  fill="none"
                  stroke="url(#chart-line-grad)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data Points */}
              {chartData.points.map((pt) => {
                const isHovered = hoveredPoint?.id === pt.id;
                return (
                  <g key={pt.id}>
                    {/* Outer pulse when hovered */}
                    {isHovered && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="10"
                        className="fill-slate-900/10 animate-ping"
                      />
                    )}
                    {/* Hover hotspot */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? '6' : '4'}
                      className={`transition-all duration-150 cursor-pointer ${
                        isHovered 
                          ? 'fill-slate-900 stroke-white stroke-2' 
                          : 'fill-white stroke-slate-600 stroke-2 hover:stroke-slate-900 hover:fill-slate-900'
                      }`}
                      onMouseEnter={() => setHoveredPoint(pt)}
                      onMouseLeave={() => setHoveredPoint(null)}
                      onClick={() => startEditing(pt)}
                    />
                    
                    {/* Year Label */}
                    <text
                      x={pt.x}
                      y={chartHeight - paddingBottom + 20}
                      textAnchor="middle"
                      className={`text-[9px] font-mono transition-colors ${
                        isHovered ? 'fill-slate-900 font-bold' : 'fill-slate-400'
                      }`}
                    >
                      {pt.year}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Float Tooltip Over SVG Chart */}
            {hoveredPoint && (
              <div 
                className="absolute bg-slate-900 text-white p-3 shadow-md border border-slate-800 z-10 text-xs w-48 pointer-events-none transition-all duration-75 font-mono"
                style={{
                  left: `${(hoveredPoint.x / chartWidth) * 100}%`,
                  top: `${(hoveredPoint.y / chartHeight) * 100 - 45}%`,
                  transform: 'translate(-50%, -100%)',
                }}
              >
                <div className="text-[9px] text-slate-400 flex justify-between items-center mb-1">
                  <span>LAUNCH YEAR {hoveredPoint.year}</span>
                  <span className="bg-slate-800 px-1 py-0.5 text-white">{hoveredPoint.baseStorage}</span>
                </div>
                <div className="font-semibold truncate text-[13px]">{hoveredPoint.model}</div>
                <div className="text-[14px] text-emerald-400 font-bold mt-1">
                  {formatINR(hoveredPoint.launchPrice)}
                </div>
                <div className="text-[9px] text-slate-400 mt-1">
                  Click point to edit price
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Directory and Editor Table */}
      <div className="bg-white border border-slate-200" id="history-table-container">
        
        {/* Floating Voice/Action Notifications inside directory */}
        {showNotification && (
          <div className="bg-slate-900 text-white px-6 py-3.5 text-xs font-mono flex items-center justify-between gap-3 border-b border-slate-800 animate-pulse">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{showNotification}</span>
            </div>
            <button 
              onClick={() => setShowNotification(null)}
              className="text-slate-400 hover:text-white font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Sub-header */}
        <div className="p-6 md:p-8 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-50 border border-slate-200 text-slate-600">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 uppercase tracking-tight">Timeline Directory</h4>
              <p className="text-xs text-slate-400">Manage and audit historical release prices of flagship iPhones in India</p>
            </div>
          </div>

          {/* Search bar with Integrated Voice Search */}
          <div className="relative max-w-sm w-full flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search history by model or year..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-xs border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50 font-sans"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
            
            <button
              onClick={handleVoiceSearch}
              className={`p-2.5 border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                isListening
                  ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse'
                  : 'bg-white border-slate-200 hover:border-slate-400 text-slate-600'
              }`}
              title="Voice Search (Say model or year)"
            >
              {isListening ? <MicOff className="w-4 h-4 text-rose-600" /> : <Mic className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
        </div>

        {/* Desktop View: Grid/Table List */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">
                <th className="py-4 px-6">Year</th>
                <th className="py-4 px-5">Model / Variant</th>
                <th className="py-4 px-5 text-right">Launch MRP (₹)</th>
                <th className="py-4 px-5 text-right">Capacity</th>
                <th className="py-4 px-5 text-center">Offset (₹)</th>
                <th className="py-4 px-6 text-center">Operation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {displayList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 font-mono">
                    No historical entries matched the search query.
                  </td>
                </tr>
              ) : (
                displayList.map((item) => {
                  const isEditing = editingId === item.id;
                  const diff = item.diff ?? 0;
                  const pct = item.pct ?? 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors group">
                      {/* Year */}
                      <td className="py-4 px-6 font-mono font-semibold text-slate-600">
                        <span className="px-2 py-1 bg-slate-50 text-slate-700 border border-slate-150">
                          {item.year}
                        </span>
                      </td>

                      {/* Model */}
                      <td className="py-4 px-5 font-semibold text-slate-900">
                        {item.model}
                      </td>

                      {/* Launch Price */}
                      <td className="py-4 px-5 text-right font-mono font-medium">
                        {isEditing ? (
                          <div className="flex items-center gap-1 justify-end">
                            <span className="text-slate-400">₹</span>
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(Number(e.target.value))}
                              className="w-28 px-2 py-1 border border-slate-300 text-right focus:outline-none focus:ring-1 focus:ring-slate-900"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(item.id);
                                else if (e.key === 'Escape') setEditingId(null);
                              }}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <span className="text-slate-900 font-semibold">{formatINR(item.launchPrice)}</span>
                        )}
                      </td>

                      {/* Storage */}
                      <td className="py-4 px-5 text-right font-mono text-slate-400">
                        {item.baseStorage}
                      </td>

                      {/* Pricing Shift (compared to previous) */}
                      <td className="py-4 px-5 text-center">
                        {diff === 0 ? (
                          <span className="text-slate-400 font-mono text-[10px]">—</span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 font-mono text-[11px] font-bold px-2 py-0.5 ${
                            diff > 0 
                              ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          }`}>
                            {diff > 0 ? (
                              <TrendingUp className="w-3 h-3 text-rose-500" />
                            ) : (
                              <TrendingDown className="w-3 h-3 text-emerald-600" />
                            )}
                            {diff > 0 ? '+' : ''}
                            {formatINR(diff)} ({diff > 0 ? '+' : ''}{pct.toFixed(1)}%)
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-6 text-center">
                        {isEditing ? (
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleSaveEdit(item.id)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                              title="Confirm Price"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 text-slate-400 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3 text-slate-400" />
                            Modify
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Touch-Friendly Card List */}
        <div className="block md:hidden divide-y divide-slate-150 bg-white">
          {displayList.length === 0 ? (
            <div className="py-16 text-center text-slate-400 font-mono text-xs">
              No historical entries matched the search query.
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {displayList.map((item) => {
                const isEditing = editingId === item.id;
                const diff = item.diff ?? 0;
                const pct = item.pct ?? 0;

                return (
                  <div key={`hist-card-${item.id}`} className="bg-slate-50/50 p-4 border border-slate-200 space-y-3">
                    {/* Header: Year & Model */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-slate-900 text-white text-[10px] font-mono font-bold">
                          {item.year}
                        </span>
                        <span className="font-bold text-slate-900 text-xs">
                          {item.model}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 border border-slate-150">
                        {item.baseStorage}
                      </span>
                    </div>

                    {/* Launch Price Row */}
                    <div className="bg-white p-3 border border-slate-150 flex items-center justify-between">
                      <div>
                        <span className="text-[9px] font-mono text-slate-400 uppercase block">Launch MRP</span>
                        {isEditing ? (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-slate-400 text-xs">₹</span>
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(Number(e.target.value))}
                              className="w-24 px-2 py-1 text-xs border border-slate-300 text-right focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(item.id);
                                else if (e.key === 'Escape') setEditingId(null);
                              }}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <span className="font-mono text-sm text-slate-900 font-bold">
                            {formatINR(item.launchPrice)}
                          </span>
                        )}
                      </div>

                      {/* Pricing shift compare badge */}
                      <div>
                        <span className="text-[9px] font-mono text-slate-400 uppercase block text-right">Offset</span>
                        {diff === 0 ? (
                          <span className="text-slate-400 font-mono text-[10px] block text-right">—</span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold px-1.5 py-0.5 ${
                            diff > 0 
                              ? 'bg-rose-50 text-rose-800 border border-rose-100' 
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                          }`}>
                            {diff > 0 ? '↑' : '↓'} {formatINR(Math.abs(diff))} ({diff > 0 ? '+' : ''}{pct.toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Operation Panel */}
                    <div className="flex justify-end border-t border-slate-200/60 pt-2">
                      {isEditing ? (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleSaveEdit(item.id)}
                            className="px-3 py-1.5 bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider cursor-pointer flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-wider cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing(item)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer h-8"
                        >
                          <Edit2 className="w-3 h-3 text-slate-400" />
                          Modify Price
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

