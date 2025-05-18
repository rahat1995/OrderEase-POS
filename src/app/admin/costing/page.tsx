
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import CostCategoryForm from '@/components/admin/CostCategoryForm';
import PurchaseItemForm from '@/components/admin/PurchaseItemForm';
import PurchaseBillForm from '@/components/admin/PurchaseBillForm';
import type { CostCategory, CostEntry, PurchaseItem, PurchaseBill } from '@/types';
import { fetchCostCategoriesAction, fetchPurchaseItemsAction, fetchCostEntriesAction } from '@/app/actions/costActions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { DollarSign, ListOrdered, Loader2, Package, ReceiptText, Banknote } from 'lucide-react'; // Added Banknote
import { format } from 'date-fns';


export default function CostingManagementPage() {
  const [costCategories, setCostCategories] = useState<CostCategory[]>([]);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [recentCostEntries, setRecentCostEntries] = useState<CostEntry[]>([]);
  
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingPurchaseItems, setIsLoadingPurchaseItems] = useState(true);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);

  const loadInitialData = useCallback(async () => {
    setIsLoadingCategories(true);
    setIsLoadingPurchaseItems(true);
    setIsLoadingEntries(true);
    try {
      const [categories, items, entries] = await Promise.all([
        fetchCostCategoriesAction(),
        fetchPurchaseItemsAction(),
        fetchCostEntriesAction(undefined, undefined) // Fetch all initially, then slice
      ]);
      
      setCostCategories(categories.sort((a, b) => a.name.localeCompare(b.name)));
      setPurchaseItems(items.sort((a, b) => a.name.localeCompare(b.name)));
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recent = entries
        .filter(e => new Date(e.date) >= thirtyDaysAgo)
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0,10);
      setRecentCostEntries(recent);

    } catch (error) {
      toast({ title: "Error loading costing data", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoadingCategories(false);
      setIsLoadingPurchaseItems(false);
      setIsLoadingEntries(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleCategoryAdded = (newCategory: CostCategory) => {
    setCostCategories(prev => [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handlePurchaseItemAdded = (newItem: PurchaseItem) => {
    setPurchaseItems(prev => [...prev, newItem].sort((a,b) => a.name.localeCompare(b.name)));
  };
  
  const handlePurchaseBillAdded = (_newBill: PurchaseBill, newEntries: CostEntry[]) => {
    // Refetch or update recent entries smartly
    setRecentCostEntries(prev => 
        [...newEntries, ...prev]
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0,10) 
    );
  };


  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
      <CardHeader className="p-0 mb-6">
        <div className="flex items-center space-x-3">
          <Banknote className="h-8 w-8 text-accent" /> {/* Changed Icon */}
          <div>
            <CardTitle className="text-2xl md:text-3xl">Cost & Purchase Management</CardTitle>
            <CardDescription>Manage expense categories, purchase items, and record supplier bills.</CardDescription>
          </div>
        </div>
      </CardHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-1 space-y-6">
          <CostCategoryForm 
            onCategoryAdded={handleCategoryAdded} 
            initialCategories={costCategories} 
          />
          <PurchaseItemForm 
            costCategories={costCategories} 
            onPurchaseItemAdded={handlePurchaseItemAdded}
            initialPurchaseItems={purchaseItems}
          />
        </div>
        <div className="lg:col-span-2">
           <PurchaseBillForm 
            costCategories={costCategories}
            purchaseItems={purchaseItems}
            onBillAdded={handlePurchaseBillAdded}
          />
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <ListOrdered className="h-6 w-6 text-accent" />
            <CardTitle>Recent Cost Entries (Last 30 Days, Max 10)</CardTitle>
          </div>
          <CardDescription>A quick view of your most recent itemized expenses from bills.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingEntries ? (
             <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : recentCostEntries.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No cost entries found in the last 30 days.</p>
          ) : (
            <ScrollArea className="h-[300px] border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-muted z-10">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Purchased Item</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentCostEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{format(new Date(entry.date), "MMM dd, yyyy")}</TableCell>
                      <TableCell>{entry.categoryName}</TableCell>
                      <TableCell className="font-medium">{entry.purchaseItemName}</TableCell>
                      <TableCell className="text-right">${entry.amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
