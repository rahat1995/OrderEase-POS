
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { format, subDays } from 'date-fns';
import { Calendar as CalendarIcon, Search, Loader2, BarChartHorizontalBig, TrendingUp } from 'lucide-react';
import type { CostEntry } from '@/types';
import { fetchCostEntriesAction } from '@/app/actions/costActions';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';

interface AggregatedCost {
  categoryName: string;
  totalAmount: number;
  entryCount: number;
}

export default function CostReportClient() {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: subDays(new Date(), 30), // Default to last 30 days
    to: new Date(),
  });
  const [costEntries, setCostEntries] = useState<CostEntry[]>([]);
  const [aggregatedCosts, setAggregatedCosts] = useState<AggregatedCost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    })).sort((a,b) => b.totalAmount - a.totalAmount); // Sort by highest cost
  }, []);

  const fetchCosts = useCallback(async (currentDateRange: { from?: Date; to?: Date }) => {
    if (!currentDateRange.from) {
        toast({ title: "Date Required", description: "Please select a start date for the report.", variant: "destructive"});
        setCostEntries([]);
        setAggregatedCosts([]);
        setError("Start date is required.");
        return;
    }
    setIsLoading(true);
    setError(null);
    setCostEntries([]);
    setAggregatedCosts([]);

    try {
      const fetchedEntries = await fetchCostEntriesAction(
        currentDateRange.from ? format(currentDateRange.from, 'yyyy-MM-dd') : undefined,
        currentDateRange.to ? format(currentDateRange.to, 'yyyy-MM-dd') : undefined
      );
      setCostEntries(fetchedEntries);
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
    fetchCosts(dateRange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Initial fetch with default date range

  const totalOverallCost = aggregatedCosts.reduce((sum, cat) => sum + cat.totalAmount, 0);

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5 text-accent" />
            Filter Cost Report
          </CardTitle>
          <CardDescription>Select a date range to view your expenses.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-0 sm:flex sm:items-end sm:space-x-4">
          <div className="grid gap-2 w-full sm:w-auto">
            <label htmlFor="cost-date-range" className="text-sm font-medium">Date Range</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="cost-date-range"
                  variant={"outline"}
                  className={cn(
                    "w-full sm:w-[260px] justify-start text-left font-normal",
                    !dateRange.from && "text-muted-foreground"
                  )}
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
                  onSelect={(newRange) => setDateRange(newRange || {})}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button onClick={() => fetchCosts(dateRange)} disabled={isLoading || !dateRange.from} className="w-full sm:w-auto bg-accent hover:bg-accent/90">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Search Costs
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChartHorizontalBig className="mr-2 h-6 w-6 text-accent" />
            Category-wise Cost Summary
          </CardTitle>
          <CardDescription>Total expenses grouped by category for the selected period.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && aggregatedCosts.length === 0 ? (
             <div className="text-center py-10">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
              <p className="mt-2 text-muted-foreground">Loading cost report...</p>
            </div>
          ) : !isLoading && aggregatedCosts.length === 0 && !error ? (
            <div className="text-center py-10 text-muted-foreground">
                <Search className="mx-auto h-12 w-12 mb-2" />
                <p>No cost entries found for the selected criteria.</p>
            </div>
          ) : aggregatedCosts.length > 0 ? (
            <>
              <ScrollArea className="h-[350px] w-full border rounded-md mb-4">
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
                <p className="text-lg font-bold">Overall Total Cost: <span className="text-destructive">${totalOverallCost.toFixed(2)}</span></p>
              </div>
            </>
          ) : null }
        </CardContent>
      </Card>
      
      {/* Optional: Detailed list of all entries in the period - can be added if needed */}
      {/* {costEntries.length > 0 && ( ... table for all entries ... )} */}

    </div>
  );
}
