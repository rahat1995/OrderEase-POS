
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { Calendar as CalendarIcon, Search, Loader2, BarChartHorizontalBig, TrendingUp, Filter, Package, Tag, List, Printer } from 'lucide-react';
import type { CostEntry, CostCategory, PurchaseItem, RestaurantProfile } from '@/types';
import { fetchCostEntriesAction, fetchCostCategoriesAction, fetchPurchaseItemsAction } from '@/app/actions/costActions';
import { fetchRestaurantProfileAction } from '@/app/actions/restaurantProfileActions';
import ReportPrintHeader from '@/components/reports/ReportPrintHeader';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';

interface AggregatedCost {
  categoryName: string;
  totalAmount: number;
  entryCount: number;
}

const ALL_CATEGORIES_VALUE = "_ALL_CATEGORIES_";
const ALL_ITEMS_VALUE = "_ALL_ITEMS_";

export default function CostReportClient() {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [costEntries, setCostEntries] = useState<CostEntry[]>([]);
  const [aggregatedCosts, setAggregatedCosts] = useState<AggregatedCost[]>([]);
  const [isLoading, setIsLoading] = useState(true); 
  const [error, setError] = useState<string | null>(null);

  const [costCategories, setCostCategories] = useState<CostCategory[]>([]);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(ALL_CATEGORIES_VALUE);
  const [selectedPurchaseItemId, setSelectedPurchaseItemId] = useState<string>(ALL_ITEMS_VALUE);
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);
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


  const filteredPurchaseItems = useMemo(() => {
    if (selectedCategoryId === ALL_CATEGORIES_VALUE) {
      return purchaseItems;
    }
    return purchaseItems.filter(item => item.categoryId === selectedCategoryId);
  }, [purchaseItems, selectedCategoryId]);

  const aggregateCostsByCategory = useCallback((entries: CostEntry[]): AggregatedCost[] => {
    const report: { [key: string]: { totalAmount: number; entryCount: number } } = {};
    entries.forEach(entry => {
      if (!report[entry.categoryName]) {
        report[entry.categoryName] = { totalAmount: 0, entryCount: 0 };
      }
      report[entry.categoryName].totalAmount += entry.amount;
      report[entry.categoryName].entryCount += 1;
    });
    return Object.entries(report).map(([categoryName, data]) => ({
      categoryName,
      ...data,
    })).sort((a,b) => b.totalAmount - a.totalAmount);
  }, []);

  const loadInitialFiltersData = useCallback(async () => {
    setIsLoadingFilters(true);
    try {
      const [categories, items] = await Promise.all([
        fetchCostCategoriesAction(),
        fetchPurchaseItemsAction()
      ]);
      setCostCategories(categories);
      setPurchaseItems(items.sort((a, b) => (a.code || '').localeCompare(b.code || '') || a.name.localeCompare(b.name)));
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred while loading filters.';
      setError(errorMessage);
      toast({ title: "Error Loading Filters", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoadingFilters(false);
    }
  }, []);

  const fetchCosts = useCallback(async (
    currentDateRange: { from?: Date; to?: Date },
    currentCategoryId: string,
    currentPurchaseItemId: string
  ) => {
    const categoryIdToFetch = currentCategoryId === ALL_CATEGORIES_VALUE ? undefined : currentCategoryId;
    const purchaseItemIdToFetch = currentPurchaseItemId === ALL_ITEMS_VALUE ? undefined : currentPurchaseItemId;
    
    if (!currentDateRange.from) {
        toast({ title: "Date Required", description: "Please select a start date for the report.", variant: "destructive"});
        setCostEntries([]);
        setAggregatedCosts([]);
        setError("Start date is required.");
        setIsLoading(false); 
        return;
    }
    setIsLoading(true);
    setError(null);
    setCostEntries([]);
    setAggregatedCosts([]);

    try {
      const fetchedEntries = await fetchCostEntriesAction(
        currentDateRange.from ? format(currentDateRange.from, 'yyyy-MM-dd') : undefined,
        currentDateRange.to ? format(currentDateRange.to, 'yyyy-MM-dd') : undefined,
        categoryIdToFetch,
        purchaseItemIdToFetch
      );
      const sortedEntries = fetchedEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setCostEntries(sortedEntries);
      setAggregatedCosts(aggregateCostsByCategory(fetchedEntries));

      if (fetchedEntries.length === 0) {
        toast({ title: "No Cost Entries Found", description: "No costs recorded for the selected criteria." });
      } else {
        toast({ title: "Cost Report Loaded", description: `${fetchedEntries.length} cost entries found.` });
      }
    } catch (e) {
      console.error("Failed to fetch cost entries:", e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(errorMessage);
      toast({ title: "Error Fetching Costs", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [aggregateCostsByCategory]);

  useEffect(() => {
    loadInitialFiltersData();
  }, [loadInitialFiltersData]);
  
  useEffect(() => {
    if (!isLoadingFilters && !isLoadingProfile && dateRange.from) {
      fetchCosts(dateRange, selectedCategoryId, selectedPurchaseItemId);
    } else if (!dateRange.from && !isLoadingFilters && !isLoadingProfile) {
      setIsLoading(false); 
      setCostEntries([]);
      setAggregatedCosts([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingFilters, isLoadingProfile, dateRange, selectedCategoryId, selectedPurchaseItemId, fetchCosts]);

  const handleSearch = () => {
    if (dateRange.from) {
        fetchCosts(dateRange, selectedCategoryId, selectedPurchaseItemId);
    } else {
        toast({ title: "Date Required", description: "Please select a start date for the report.", variant: "destructive"});
    }
  }

  const totalOverallCost = aggregatedCosts.reduce((sum, cat) => sum + cat.totalAmount, 0);
  const totalDetailedEntriesCost = costEntries.reduce((sum, entry) => sum + entry.amount, 0);

  const handlePrint = () => {
    window.print();
  };

  if (isLoadingFilters || isLoadingProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading report prerequisites...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-md no-print">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5 text-accent" />
            Filter Cost Report
          </CardTitle>
          <CardDescription>Select date range, category, and/or specific item for your expense report.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label htmlFor="cost-date-range" className="text-sm font-medium block mb-1">Date Range *</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="cost-date-range"
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                     disabled={isLoading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    onSelect={(newRange) => setDateRange(newRange || {from: undefined, to: undefined})}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label htmlFor="cost-category-filter" className="text-sm font-medium block mb-1 flex items-center">
                <Tag className="mr-1.5 h-4 w-4 text-muted-foreground" /> Cost Category
              </label>
              <Select
                value={selectedCategoryId} 
                onValueChange={(value) => {
                  setSelectedCategoryId(value === ALL_CATEGORIES_VALUE ? ALL_CATEGORIES_VALUE : value);
                  setSelectedPurchaseItemId(ALL_ITEMS_VALUE); 
                }}
                disabled={isLoading || costCategories.length === 0}
              >
                <SelectTrigger id="cost-category-filter">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CATEGORIES_VALUE}>All Categories</SelectItem>
                  {costCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="purchase-item-filter" className="text-sm font-medium block mb-1 flex items-center">
                 <Package className="mr-1.5 h-4 w-4 text-muted-foreground" /> Purchase Item
              </label>
              <Select
                value={selectedPurchaseItemId} 
                onValueChange={(value) => {
                  setSelectedPurchaseItemId(value === ALL_ITEMS_VALUE ? ALL_ITEMS_VALUE : value);
                }}
                disabled={isLoading || filteredPurchaseItems.length === 0}
              >
                <SelectTrigger id="purchase-item-filter">
                  <SelectValue placeholder="Select Item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_ITEMS_VALUE}>
                    {selectedCategoryId === ALL_CATEGORIES_VALUE ? "All Items" : "All Items in Category"}
                  </SelectItem>
                  {filteredPurchaseItems.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.code ? `[${item.code}] ` : ''}{item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex space-x-2 self-end w-full lg:w-auto">
                <Button onClick={handleSearch} disabled={isLoading || !dateRange.from} className="flex-grow lg:flex-none bg-accent hover:bg-accent/90">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Search Costs
                </Button>
                <Button onClick={handlePrint} disabled={isLoading || (costEntries.length === 0 && aggregatedCosts.length === 0)} variant="outline" className="flex-grow lg:flex-none">
                    <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="no-print">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="printable-area">
        <ReportPrintHeader profile={restaurantProfile} reportTitle="Cost Report" />

        {isLoading && (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-lg">Loading cost data...</p>
          </div>
        )}

        {!isLoading && !error && aggregatedCosts.length === 0 && costEntries.length === 0 && (
          <Card className="shadow-md">
            <CardContent className="text-center py-10 text-muted-foreground">
              <Search className="mx-auto h-12 w-12 mb-2" />
              <p>No cost entries found for the selected criteria.</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && aggregatedCosts.length > 0 && (
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChartHorizontalBig className="mr-2 h-6 w-6 text-accent no-print" />
                Category-wise Cost Summary
              </CardTitle>
              <CardDescription>Total expenses grouped by category for the selected criteria.</CardDescription>
            </CardHeader>
            <CardContent>
                  <ScrollArea className="h-auto max-h-[250px] w-full border rounded-md mb-4">
                    <Table>
                      <TableHeader className="sticky top-0 bg-muted z-10">
                        <TableRow>
                          <TableHead>Category Name</TableHead>
                          <TableHead className="text-right">Number of Entries</TableHead>
                          <TableHead className="text-right">Total Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {aggregatedCosts.map((agg) => (
                          <TableRow key={agg.categoryName}>
                            <TableCell className="font-medium">{agg.categoryName}</TableCell>
                            <TableCell className="text-right">{agg.entryCount}</TableCell>
                            <TableCell className="text-right font-semibold text-destructive">${agg.totalAmount.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                  <div className="text-right mt-4">
                    <p className="text-lg font-bold">Overall Total (Summary): <span className="text-destructive">${totalOverallCost.toFixed(2)}</span></p>
                  </div>
            </CardContent>
          </Card>
        )}


        {!isLoading && costEntries.length > 0 && (
          <Card className="shadow-md mt-6">
              <CardHeader>
                  <CardTitle className="flex items-center">
                      <List className="mr-2 h-6 w-6 text-accent no-print" />
                      Detailed Cost Entries
                  </CardTitle>
                  <CardDescription>Individual cost entries for the selected criteria, sorted by date.</CardDescription>
              </CardHeader>
              <CardContent>
                  <ScrollArea className="h-[400px] w-full border rounded-md">
                      <Table>
                          <TableHeader className="sticky top-0 bg-muted z-10">
                              <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Category</TableHead>
                                  <TableHead>Purchase Item</TableHead>
                                  <TableHead className="text-right">Amount</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {costEntries.map((entry) => (
                                  <TableRow key={entry.id}>
                                      <TableCell>{format(new Date(entry.date), "MMM dd, yyyy")}</TableCell>
                                      <TableCell>{entry.categoryName}</TableCell>
                                      <TableCell className="font-medium">
                                        {entry.purchaseItemCode ? `[${entry.purchaseItemCode}] ` : ''}
                                        {entry.purchaseItemName}
                                      </TableCell>
                                      <TableCell className="text-right text-destructive">${entry.amount.toFixed(2)}</TableCell>
                                  </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                  </ScrollArea>
                  <div className="text-right mt-4">
                    <p className="text-lg font-bold">Overall Total (Detailed Entries): <span className="text-destructive">${totalDetailedEntriesCost.toFixed(2)}</span></p>
                  </div>
              </CardContent>
              <CardFooter className="no-print">
                  <p className="text-xs text-muted-foreground italic">
                  This table shows all individual cost entries matching your filters. The summary above aggregates these by category.
                  </p>
              </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
