
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import CostCategoryForm from '@/components/admin/CostCategoryForm';
import PurchaseItemForm from '@/components/admin/PurchaseItemForm';
import PurchaseBillForm from '@/components/admin/PurchaseBillForm';
import SupplierForm from '@/components/admin/SupplierForm'; // New import
import type { CostCategory, CostEntry, PurchaseItem, PurchaseBill, Supplier } from '@/types'; // Added Supplier
import { fetchCostCategoriesAction, fetchPurchaseItemsAction, fetchCostEntriesAction } from '@/app/actions/costActions';
import { fetchSuppliersAction } from '@/app/actions/supplierActions'; // New import
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { DollarSign, ListOrdered, Loader2, Package, ReceiptText, Banknote, Users } from 'lucide-react';
import { format } from 'date-fns';

export default function CostingManagementPage() {
  const [costCategories, setCostCategories] = useState<CostCategory[]>([]);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]); // New state for suppliers
  const [recentCostEntries, setRecentCostEntries] = useState<CostEntry[]>([]);

  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingPurchaseItems, setIsLoadingPurchaseItems] = useState(true);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(true); // New loading state
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);

  const loadInitialData = useCallback(async () => {
    setIsLoadingCategories(true);
    setIsLoadingPurchaseItems(true);
    setIsLoadingSuppliers(true);
    setIsLoadingEntries(true);
    try {
      const [categories, items, fetchedSuppliers, entries] = await Promise.all([
        fetchCostCategoriesAction(),
        fetchPurchaseItemsAction(),
        fetchSuppliersAction(), // Fetch suppliers
        fetchCostEntriesAction(undefined, undefined)
      ]);

      setCostCategories(categories.sort((a, b) => a.name.localeCompare(b.name)));
      setPurchaseItems(items.sort((a, b) => (a.code || '').localeCompare(b.code || '') || a.name.localeCompare(b.name)));
      setSuppliers(fetchedSuppliers.sort((a,b) => a.name.localeCompare(b.name))); // Set suppliers

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
      setIsLoadingSuppliers(false);
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
    setPurchaseItems(prev => [...prev, newItem].sort((a,b) => (a.code || '').localeCompare(b.code || '') || a.name.localeCompare(b.name)));
  };

  const handleSupplierAdded = (newSupplier: Supplier) => { // New handler
    setSuppliers(prev => [...prev, newSupplier].sort((a,b) => a.name.localeCompare(b.name)));
  };

  const handlePurchaseBillAdded = (_newBill: PurchaseBill, newEntries: CostEntry[]) => {
    setRecentCostEntries(prev =>
        [...newEntries, ...prev]
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0,10)
    );
    // Optionally re-fetch purchase items if bill addition could affect stock or item data indirectly
    // fetchPurchaseItemsAction().then(items => setPurchaseItems(items.sort((a,b) => (a.code || '').localeCompare(b.code || '') || a.name.localeCompare(b.name))));
  };


  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
      <CardHeader className="p-0 mb-6">
        <div className="flex items-center space-x-3">
          <Banknote className="h-8 w-8 text-accent" />
          <div>
            <CardTitle className="text-2xl md:text-3xl">Cost & Purchase Management</CardTitle>
            <CardDescription>Manage suppliers, expense categories, purchase items, and record supplier bills.</CardDescription>
          </div>
        </div>
      </CardHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-1 space-y-6">
          <SupplierForm
            onSupplierAdded={handleSupplierAdded}
            initialSuppliers={suppliers}
          />
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
            suppliers={suppliers} // Pass suppliers
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
                      <TableCell className="font-medium">
                        {entry.purchaseItemCode ? `[${entry.purchaseItemCode}] ` : ''}
                        {entry.purchaseItemName}
                      </TableCell>
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
