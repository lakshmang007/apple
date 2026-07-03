/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  category: string; // 'iPhone' | 'iPad' | 'Mac' | 'Apple Watch' | 'AirPods' | 'TV & Accessories'
  model: string;
  baseConfig: string;
  notes: string;
  pastPrice: number; // in INR
  currentPrice: number; // in INR
  isCustom?: boolean;
}

export interface HistoricalIPhone {
  id: string;
  year: number;
  model: string;
  launchPrice: number; // in INR
  baseStorage: string;
  approxPricePerGB?: number; // Price divided by storage in GB
  currentPastPrice?: number; // editable past price
  currentEditPrice?: number; // editable current price
}

export type CategoryFilter = 'All' | 'iPhone' | 'iPad' | 'Mac' | 'Apple Watch' | 'AirPods' | 'TV, Home & Accessories';
