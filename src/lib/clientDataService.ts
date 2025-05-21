
"use client";

import {
  fetchCostCategoriesAction,
  fetchSuppliersAction,
  fetchPurchaseItemsAction,
} from '@/app/actions/costActions'; // Assuming suppliers are part of costActions or similar
import type { CostCategory, PurchaseItem, Supplier } from '@/types';
import { getCachedData, setCachedData } from './cache';
import { toast } from '@/hooks/use-toast';

const COST_CATEGORIES_CACHE_KEY = 'costCategories';
const SUPPLIERS_CACHE_KEY = 'suppliers';
const PURCHASE_ITEMS_CACHE_KEY = 'purchaseItems';
const CACHE_TTL_MINUTES = 60; // Cache for 1 hour

async function fetchDataWithCache<T>(
  cacheKey: string,
  fetchAction: () => Promise<T>,
  ttlMinutes: number = CACHE_TTL_MINUTES
): Promise<T | []> { // Return empty array for cache miss on offline
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const freshData = await fetchAction();
      if (Array.isArray(freshData)) { // Only cache if it's an array (common for lists)
        setCachedData<T>(cacheKey, freshData, ttlMinutes);
      }
      return freshData;
    } catch (error) {
      console.error(`Error fetching fresh data for ${cacheKey}:`, error);
      // Try to serve from cache even if online fetch fails, as a fallback
      const cached = getCachedData<T>(cacheKey);
      if (cached) {
        toast({ title: "Network Issue", description: `Serving ${cacheKey} from cache due to fetch error.`, variant: "default" });
        return cached;
      }
      toast({ title: "Fetch Error", description: `Could not load ${cacheKey}.`, variant: "destructive" });
      return []; // Return empty array on error if cache is also empty/expired
    }
  } else {
    // Offline: Try to serve from cache
    const cached = getCachedData<T>(cacheKey);
    if (cached) {
      toast({ title: "Offline Mode", description: `Serving ${cacheKey} from cache.`, variant: "default" });
      return cached;
    } else {
      toast({ title: "Offline - No Cache", description: `No cached ${cacheKey} available. Please connect to internet to refresh.`, variant: "destructive" });
      return []; // Return empty array if offline and no valid cache
    }
  }
}

export async function fetchCostCategoriesWithCache(): Promise<CostCategory[]> {
  const result = await fetchDataWithCache<CostCategory[]>(
    COST_CATEGORIES_CACHE_KEY,
    fetchCostCategoriesAction,
    CACHE_TTL_MINUTES // Cache cost categories for 60 minutes
  );
  return Array.isArray(result) ? result : [];
}

export async function fetchSuppliersWithCache(): Promise<Supplier[]> {
  const result = await fetchDataWithCache<Supplier[]>(
    SUPPLIERS_CACHE_KEY,
    fetchSuppliersAction,
    CACHE_TTL_MINUTES // Cache suppliers for 60 minutes
  );
  return Array.isArray(result) ? result : [];
}

export async function fetchPurchaseItemsWithCache(): Promise<PurchaseItem[]> {
  const result = await fetchDataWithCache<PurchaseItem[]>(
    PURCHASE_ITEMS_CACHE_KEY,
    fetchPurchaseItemsAction,
    CACHE_TTL_MINUTES // Cache purchase items for 60 minutes
  );
  return Array.isArray(result) ? result : [];
}
