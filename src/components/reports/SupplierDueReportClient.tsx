
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Supplier, SupplierPeriodicSummary, SupplierLedgerData, LedgerTransaction } from '@/types';
import { fetchSuppliersAction } from '@/app/actions/supplierActions';
import { fetchSupplierPeriodicSummaryAction, fetchSupplierLedgerDataAction } from '@/app/actions/supplierPaymentActions';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Loader2, Search, AlertTriangle, CalendarIcon, Users2, ListFilter, FileText } from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const ALL_SUPPLIERS_VALUE = "_ALL_SUPPLIERS_";

interface LedgerTransactionWithBalance extends LedgerTransaction {
  runningBalance: number;
}

export default function SupplierDueReportClient() {
  const [suppliersList, setSuppliersList] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(ALL_SUPPLIERS_VALUE);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  
  const [reportDataAll, setReportDataAll] = useState<SupplierPeriodicSummary[]>([]);
  const [reportDataIndividual, setReportDataIndividual] = useState<SupplierLedgerData | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialSuppliersLoaded, setInitialSuppliersLoaded] = useState(false);


  const loadSuppliers = useCallback(async () => {
    try {
      const data = await fetchSuppliersAction();
      setSuppliersList(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load suppliers');
      toast({ title: "Error loading suppliers", description: e instanceof Error ? e.message : 'Unknown error', variant: "destructive" });
    }
  }, []);

  const handleSearch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setReportDataAll([]);
    setReportDataIndividual(null);

    const fromDateStr = dateRange.from ? dateRange.from.toISOString().split('T')[0] : undefined;
    const toDateStr = dateRange.to ? dateRange.to.toISOString().split('T')[0] : undefined;

    try {
      if (selectedSupplierId === ALL_SUPPLIERS_VALUE) {
        if (suppliersList.length === 0) {
            toast({ title: "No Suppliers", description: "Please add suppliers first to see this report." });
            setIsLoading(false);
            return;
        }
        const summaries: SupplierPeriodicSummary[] = [];
        for (const supplier of suppliersList) {
          const summary = await fetchSupplierPeriodicSummaryAction(supplier, fromDateStr, toDateStr);
          summaries.push(summary);
        }
        setReportDataAll(summaries.sort((a,b) => b.closingDue - a.closingDue));
        if (summaries.length > 0) {
            toast({ title: "Report Generated", description: `Periodic summary for ${summaries.length} suppliers.` });
        } else if (suppliersList.length > 0) {
            toast({ title: "No Due Data", description: "No due data found for suppliers in the selected period." });
        }
      } else {
        const ledgerData = await fetchSupplierLedgerDataAction(selectedSupplierId, fromDateStr, toDateStr);
        if (ledgerData) {
          setReportDataIndividual(ledgerData);
          toast({ title: "Ledger Generated", description: `Ledger for ${ledgerData.supplier.name}.` });
        } else {
          throw new Error("Supplier not found for ledger.");
        }
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred generating the report.';
      setError(errorMessage);
      toast({ title: "Error Generating Report", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [selectedSupplierId, dateRange, suppliersList]);

  // Effect to load suppliers once on mount
  useEffect(() => {
    setIsLoading(true);
    loadSuppliers().finally(() => {
      setInitialSuppliersLoaded(true);
      // isLoading will be set to false by the subsequent handleSearch call or if handleSearch isn't called
    });
  }, [loadSuppliers]);

  // Effect to run search when filters change or after initial suppliers are loaded
  useEffect(() => {
    if (initialSuppliersLoaded) {
      handleSearch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSuppliersLoaded, selectedSupplierId, dateRange, handleSearch]); // handleSearch is memoized

  const grandTotalsAll = useMemo(() => reportDataAll.reduce(
    (acc, curr) => {
      acc.openingDue += curr.openingDue;
      acc.purchasesInPeriod += curr.purchasesInPeriod;
      acc.paymentsInPeriod += curr.paymentsInPeriod;
      acc.closingDue += curr.closingDue;
      return acc;
    },
    { openingDue: 0, purchasesInPeriod: 0, paymentsInPeriod: 0, closingDue: 0 }
  ), [reportDataAll]);
  
  const ledgerWithRunningBalance: LedgerTransactionWithBalance[] = useMemo(() => {
    if (!reportDataIndividual?.transactions || reportDataIndividual.openingBalance === undefined) return [];
    let currentBalance = reportDataIndividual.openingBalance;
    return reportDataIndividual.transactions.map(tx => {
      if (tx.type === 'purchase') {
        currentBalance += tx.amount;
      } else { // payment
        currentBalance -= tx.amount;
      }
      return { ...tx, runningBalance: currentBalance };
    });
  }, [reportDataIndividual]);


  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center"><ListFilter className="mr-2 h-5 w-5 text-accent"/>Filter Supplier Dues</CardTitle>
          <CardDescription>Select a date range and/or a specific supplier.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label htmlFor="due-date-range" className="text-sm font-medium block mb-1">Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button id="due-date-range" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")} disabled={isLoading}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : <span>Pick a date range</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar initialFocus mode="range" defaultMonth={dateRange.from} selected={dateRange} onSelect={(range) => setDateRange(range || {})} numberOfMonths={2} />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label htmlFor="supplier-select" className="text-sm font-medium block mb-1 flex items-center"><Users2 className="mr-1.5 h-4 w-4 text-muted-foreground"/>Supplier</label>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId} disabled={isLoading || suppliersList.length === 0}>
                <SelectTrigger id="supplier-select"><SelectValue placeholder="Select Supplier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_SUPPLIERS_VALUE}>All Suppliers</SelectItem>
                  {suppliersList.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSearch} disabled={isLoading} className="w-full md:w-auto bg-accent hover:bg-accent/90 self-end">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Search Dues
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && <Alert variant="destructive"><AlertTriangle className="h-5 w-5"/><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      
      {isLoading && <div className="flex justify-center py-10"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="ml-3 text-lg">Loading report...</p></div>}

      {!isLoading && selectedSupplierId === ALL_SUPPLIERS_VALUE && reportDataAll.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center"><FileText className="mr-2 h-5 w-5 text-accent"/>All Suppliers Periodic Due Summary</CardTitle>
          <CardDescription>
            Summary for {dateRange.from ? format(dateRange.from, "MMM dd, yyyy") : 'start of records'} to {dateRange.to ? format(dateRange.to, "MMM dd, yyyy") : 'current date'}.
          </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-450px)] border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-muted z-10">
                  <TableRow>
                    <TableHead className="w-[50px]">SL</TableHead>
                    <TableHead>Supplier Name</TableHead>
                    <TableHead className="text-right">Opening Due</TableHead>
                    <TableHead className="text-right">Purchases (Period)</TableHead>
                    <TableHead className="text-right">Payments (Period)</TableHead>
                    <TableHead className="text-right font-semibold text-destructive">Closing Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportDataAll.map((summary, index) => (
                    <TableRow key={summary.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{summary.name}</TableCell>
                      <TableCell className="text-right">{summary.openingDue.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-blue-600">{summary.purchasesInPeriod.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-green-600">{summary.paymentsInPeriod.toFixed(2)}</TableCell>
                      <TableCell className={`text-right font-bold ${summary.closingDue > 0 ? 'text-destructive' : 'text-primary'}`}>
                        {summary.closingDue.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter className="sticky bottom-0 bg-muted/80 z-10">
                  <TableRow className="font-bold">
                    <TableCell colSpan={2} className="text-right">Grand Total</TableCell>
                    <TableCell className="text-right">{grandTotalsAll.openingDue.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-blue-700">{grandTotalsAll.purchasesInPeriod.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-green-700">{grandTotalsAll.paymentsInPeriod.toFixed(2)}</TableCell>
                    <TableCell className={`text-right ${grandTotalsAll.closingDue > 0 ? 'text-destructive' : 'text-primary'}`}>
                        {grandTotalsAll.closingDue.toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {!isLoading && selectedSupplierId !== ALL_SUPPLIERS_VALUE && reportDataIndividual && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><FileText className="mr-2 h-5 w-5 text-accent"/>Supplier Ledger: {reportDataIndividual.supplier.name}</CardTitle>
            <CardDescription>
                Transactions from {dateRange.from ? format(dateRange.from, "MMM dd, yyyy") : 'start of records'} to {dateRange.to ? format(dateRange.to, "MMM dd, yyyy") : 'current date'}.
                 Opening Balance: <span className="font-semibold">${(reportDataIndividual.openingBalance || 0).toFixed(2)}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-450px)] border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-muted z-10">
                  <TableRow>
                    <TableHead className="w-[50px]">SL</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Purchase ($)</TableHead>
                    <TableHead className="text-right">Payment ($)</TableHead>
                    <TableHead className="text-right">Balance ($)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerWithRunningBalance.map((tx, index) => (
                      <TableRow key={tx.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{tx.date ? format(parseISO(tx.date), "MMM dd, yyyy") : 'Invalid Date'}</TableCell>
                        <TableCell className="text-xs">{tx.description}</TableCell>
                        <TableCell className="text-right text-blue-600">{tx.type === 'purchase' ? tx.amount.toFixed(2) : '-'}</TableCell>
                        <TableCell className="text-right text-green-600">{tx.type === 'payment' ? tx.amount.toFixed(2) : '-'}</TableCell>
                        <TableCell className={`text-right font-semibold ${tx.runningBalance < 0 ? 'text-green-700' : (tx.runningBalance > 0 ? 'text-destructive' : 'text-primary')}`}>
                            {tx.runningBalance.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
                 <TableFooter className="sticky bottom-0 bg-muted/80 z-10">
                    <TableRow className="font-bold">
                        <TableCell colSpan={3} className="text-right">Period Totals / Closing Balance</TableCell>
                        <TableCell className="text-right text-blue-700">{reportDataIndividual.totalPurchasesInPeriod.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-green-700">{reportDataIndividual.totalPaymentsInPeriod.toFixed(2)}</TableCell>
                        <TableCell className={`text-right ${reportDataIndividual.closingBalance > 0 ? 'text-destructive' : 'text-primary'}`}>
                            {reportDataIndividual.closingBalance.toFixed(2)}
                        </TableCell>
                    </TableRow>
                </TableFooter>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
      
      {!isLoading && !error && !initialSuppliersLoaded && (
         <div className="flex justify-center py-10 text-muted-foreground">
            <Loader2 className="mx-auto h-8 w-8 animate-spin mb-4" />
            <p>Loading initial supplier data...</p>
        </div>
      )}

      {!isLoading && !error && initialSuppliersLoaded && reportDataAll.length === 0 && !reportDataIndividual && (
        <div className="text-center py-10 text-muted-foreground">
            <Search className="mx-auto h-12 w-12 mb-4" />
            <p>No supplier due data found for the selected criteria.</p>
            <p className="text-sm">Try adjusting filters or ensure bills and payments are recorded.</p>
        </div>
      )}
    </div>
  );
}

