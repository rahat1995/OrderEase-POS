
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { SupplierBalance } from '@/types';
import { fetchSuppliersWithBalancesAction } from '@/app/actions/supplierPaymentActions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { Loader2, Search, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SupplierDueReportClient() {
  const [suppliersWithBalances, setSuppliersWithBalances] = useState<SupplierBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSupplierData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchSuppliersWithBalancesAction();
      setSuppliersWithBalances(data.sort((a, b) => b.currentDue - a.currentDue)); // Sort by highest due first
       if (data.length === 0) {
        toast({ title: "No Suppliers Found", description: "Add suppliers in Cost Management to see their balances."});
      }
    } catch (e) {
      console.error("Error loading supplier balances:", e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(errorMessage);
      toast({ title: "Error Loading Data", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSupplierData();
  }, [loadSupplierData]);

  const totalOutstandingDue = suppliersWithBalances.reduce((sum, s) => sum + s.currentDue, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-60">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-3 text-lg">Loading Supplier Balances...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTriangle className="h-5 w-5"/>
        <AlertTitle>Error Fetching Data</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (suppliersWithBalances.length === 0 && !isLoading) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <Search className="mx-auto h-12 w-12 mb-4" />
        <p className="text-lg font-medium">No suppliers found.</p>
        <p className="text-sm">Ensure suppliers are added in the Cost Management section.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ScrollArea className="h-[calc(100vh-350px)] border rounded-md">
        <Table>
          <TableHeader className="sticky top-0 bg-muted z-10">
            <TableRow>
              <TableHead>Supplier Name</TableHead>
              <TableHead className="text-right">Total Billed ($)</TableHead>
              <TableHead className="text-right">Total Paid ($)</TableHead>
              <TableHead className="text-right font-semibold text-destructive">Current Due ($)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliersWithBalances.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell className="font-medium">{supplier.name}</TableCell>
                <TableCell className="text-right">{supplier.totalBilled.toFixed(2)}</TableCell>
                <TableCell className="text-right text-green-600">{supplier.totalPaid.toFixed(2)}</TableCell>
                <TableCell className={`text-right font-bold ${supplier.currentDue > 0 ? 'text-destructive' : 'text-primary'}`}>
                  {supplier.currentDue.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
      <div className="text-right mt-4 pr-2">
        <p className="text-xl font-bold">
          Total Outstanding Due (All Suppliers): 
          <span className="text-destructive ml-2">${totalOutstandingDue.toFixed(2)}</span>
        </p>
      </div>
    </div>
  );
}
