
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Supplier, SupplierPeriodicSummary, SupplierLedgerData, LedgerTransaction, RestaurantProfile } from '@/types';
import { fetchSuppliersAction } from '@/app/actions/supplierActions';
import { fetchSupplierPeriodicSummaryAction, fetchSupplierLedgerDataAction } from '@/app/actions/supplierPaymentActions';
import { fetchRestaurantProfileAction } from '@/app/actions/restaurantProfileActions';
import ReportPrintHeader from '@/components/reports/ReportPrintHeader';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Loader2, Search, AlertTriangle, CalendarIcon, Users2, ListFilter, FileText, Printer } from 'lucide-react';
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
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialSuppliersLoaded, setInitialSuppliersLoaded] = useState(false);
  const [restaurantProfile, setRestaurantProfile] = useState<RestaurantProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const loadProfile = useCallback(async () => {
    setIsLoadingProfile(true);
    try {
      const profile = await fetchRestaurantProfileAction();
      setRestaurantProfile(profile);
    } catch (e) {
      toast({title: "Error Loading Profile", description: (e as Error).message, variant: "destructive"});
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const loadSuppliers = useCallback(async () => {
    setIsLoading(true); 
    setError(null);
    try {
      const data = await fetchSuppliersAction();
      setSuppliersList(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load suppliers';
      setError(msg);
      toast({ title: "Error loading suppliers", description: msg, variant: "destructive" });
    } finally {
      setInitialSuppliersLoaded(true);
    }
  }, []);

  const handleSearch = useCallback(async () => {
    if (isLoadingProfile) { // Don't search if profile is still loading
        toast({title: "Loading", description: "Please wait for restaurant profile to load.", variant: "default"});
        return;
    }
    setIsLoading(true);
    setError(null);
    setReportDataAll([]);
    setReportDataIndividual(null);

    const fromDateStr = dateRange.from ? dateRange.from.toISOString().split('T')[0] : undefined;
    const toDateStr = dateRange.to ? dateRange.to.toISOString().split('T')[0] : undefined;

    try {
      if (selectedSupplierId === ALL_SUPPLIERS_VALUE) {
        if (suppliersList.length === 0 && initialSuppliersLoaded) { 
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
  }, [selectedSupplierId, dateRange, suppliersList, initialSuppliersLoaded, isLoadingProfile]);


  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);


  useEffect(() => {
    if (initialSuppliersLoaded && !isLoadingProfile) { // Ensure profile is loaded too
      handleSearch();
    }
  }, [initialSuppliersLoaded, isLoadingProfile, selectedSupplierId, dateRange, handleSearch]); 

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
      } else { 
        currentBalance -= tx.amount;
      }
      return { ...tx, runningBalance: currentBalance };
    });
  }, [reportDataIndividual]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-md no-print">
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
                  <Calendar initialFocus mode="range" defaultMonth={dateRange.from} selected={dateRange} onSelect={(range) => setDateRange(range || {from:undefined, to:undefined})} numberOfMonths={2} />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label htmlFor="supplier-select" className="text-sm font-medium block mb-1 flex items-center"><Users2 className="mr-1.5 h-4 w-4 text-muted-foreground"/>Supplier</label>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId} disabled={isLoading || !initialSuppliersLoaded || suppliersList.length === 0}>
                <SelectTrigger id="supplier-select"><SelectValue placeholder="Select Supplier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_SUPPLIERS_VALUE}>All Suppliers</SelectItem>
                  {suppliersList.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex space-x-2 self-end w-full md:w-auto">
                <Button onClick={handleSearch} disabled={isLoading || !initialSuppliersLoaded} className="flex-grow md:flex-none bg-accent hover:bg-accent/90">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Search Dues
                </Button>
                <Button 
                    onClick={handlePrint} 
                    disabled={isLoading || (reportDataAll.length === 0 && !reportDataIndividual)} 
                    variant="outline" 
                    className="flex-grow md:flex-none"
                >
                    <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <Alert variant="destructive" className="no-print"><AlertTriangle className="h-5 w-5"/><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      
      <div className="printable-area">
        <ReportPrintHeader profile={restaurantProfile} reportTitle="Supplier Due Report" />
        
        {isLoading && (
          <div className="flex justify-center items-center py-10 h-60">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-lg text-muted-foreground">Loading report data...</p>
          </div>
        )}

        {!isLoading && !error && initialSuppliersLoaded && reportDataAll.length === 0 && !reportDataIndividual && (
          <Card className="shadow-md">
            <CardContent className="text-center py-10 text-muted-foreground">
              <Search className="mx-auto h-12 w-12 mb-4" />
              <p>No supplier due data found for the selected criteria.</p>
              <p className="text-sm">Try adjusting filters or ensure bills and payments are recorded.</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && selectedSupplierId === ALL_SUPPLIERS_VALUE && reportDataAll.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center"><FileText className="mr-2 h-5 w-5 text-accent no-print"/>All Suppliers Periodic Due Summary</CardTitle>
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
              <CardTitle className="flex items-center"><FileText className="mr-2 h-5 w-5 text-accent no-print"/>Supplier Ledger: {reportDataIndividual.supplier.name}</CardTitle>
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
      </div>
      
      {!isLoading && !error && !initialSuppliersLoaded && suppliersList.length === 0 && (
         <div className="flex justify-center items-center py-10 h-60 no-print">
            <Loader2 className="mx-auto h-8 w-8 animate-spin mb-4 text-primary" />
            <p className="ml-3 text-muted-foreground">Loading initial supplier data...</p>
        </div>
      )}

    </div>
  );
}
