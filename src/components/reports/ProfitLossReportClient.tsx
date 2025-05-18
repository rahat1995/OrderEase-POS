
"use client";

import React, { useState, useCallback } from 'react';
import { format, subDays } from 'date-fns';
import { Calendar as CalendarIcon, Search, Loader2, TrendingUp, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react';
import type { Order, CostEntry } from '@/types';
import { fetchOrdersAction } from '@/app/actions/orderActions';
import { fetchCostEntriesAction } from '@/app/actions/costActions';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';

interface ReportData {
  totalSales: number;
  totalCosts: number;
  netProfitOrLoss: number;
}

export default function ProfitLossReportClient() {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = useCallback(async (currentDateRange: { from?: Date; to?: Date }) => {
    if (!currentDateRange.from || !currentDateRange.to) {
      toast({ title: "Date Range Required", description: "Please select both a start and end date.", variant: "destructive" });
      setError("Both start and end dates are required.");
      setReportData(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    setReportData(null);

    try {
      const fromDateStr = format(currentDateRange.from, 'yyyy-MM-dd');
      const toDateStr = format(currentDateRange.to, 'yyyy-MM-dd');

      const [salesResult, costsResult] = await Promise.all([
        fetchOrdersAction(fromDateStr, toDateStr),
        fetchCostEntriesAction(fromDateStr, toDateStr)
      ]);

      const totalSales = salesResult.reduce((sum, order) => sum + order.total, 0);
      const totalCosts = costsResult.reduce((sum, entry) => sum + entry.amount, 0);
      const netProfitOrLoss = totalSales - totalCosts;

      setReportData({
        totalSales,
        totalCosts,
        netProfitOrLoss,
      });
      
      if(salesResult.length === 0 && costsResult.length === 0){
        toast({ title: "No Data Found", description: "No sales or cost entries found for the selected period." });
      } else {
        toast({ title: "Report Generated", description: "Profit & Loss report is ready." });
      }

    } catch (e) {
      console.error("Failed to generate Profit & Loss report:", e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(errorMessage);
      toast({ title: "Error Generating Report", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Select Date Range</CardTitle>
          <CardDescription>Choose a period to calculate profit and loss.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row sm:items-end space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="grid gap-2 w-full sm:w-auto">
            <label htmlFor="pl-date-range" className="text-sm font-medium">Date Range *</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="pl-date-range"
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
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={(newRange) => setDateRange(newRange || {})}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button onClick={() => generateReport(dateRange)} disabled={isLoading || !dateRange.from || !dateRange.to} className="w-full sm:w-auto bg-accent hover:bg-accent/90">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Generate Report
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-5 w-5"/>
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading && !reportData && (
        <div className="text-center py-10">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">Calculating report...</p>
        </div>
      )}

      {!isLoading && reportData && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="mr-2 h-6 w-6 text-accent" />
              Financial Summary
            </CardTitle>
            <CardDescription>
              For the period: {dateRange.from ? format(dateRange.from, "LLL dd, y") : 'N/A'} - {dateRange.to ? format(dateRange.to, "LLL dd, y") : 'N/A'}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3 text-center md:text-left">
            <div className="p-4 border rounded-lg shadow-sm bg-secondary/30">
              <p className="text-sm text-muted-foreground mb-1">Total Sales</p>
              <p className="text-3xl font-bold text-green-600">${reportData.totalSales.toFixed(2)}</p>
            </div>
            <div className="p-4 border rounded-lg shadow-sm bg-secondary/30">
              <p className="text-sm text-muted-foreground mb-1">Total Costs</p>
              <p className="text-3xl font-bold text-red-600">${reportData.totalCosts.toFixed(2)}</p>
            </div>
            <div className={`p-4 border rounded-lg shadow-sm ${reportData.netProfitOrLoss >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
              <p className="text-sm text-muted-foreground mb-1 flex items-center justify-center md:justify-start">
                {reportData.netProfitOrLoss >= 0 ? 
                  <TrendingUp className="mr-1.5 h-5 w-5 text-green-700 dark:text-green-500"/> : 
                  <TrendingDown className="mr-1.5 h-5 w-5 text-red-700 dark:text-red-500"/> 
                }
                {reportData.netProfitOrLoss >= 0 ? 'Net Profit' : 'Net Loss'}
              </p>
              <p className={`text-3xl font-bold ${reportData.netProfitOrLoss >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                ${reportData.netProfitOrLoss.toFixed(2)}
              </p>
            </div>
          </CardContent>
           <CardFooter>
            <p className="text-xs text-muted-foreground italic">
              Note: This report is based on recorded sales and cost entries within the selected period. Ensure all data is accurately entered for a precise P&L statement.
            </p>
          </CardFooter>
        </Card>
      )}

      {!isLoading && !reportData && !error && (
         <div className="text-center py-10 text-muted-foreground">
            <Search className="mx-auto h-12 w-12 mb-2" />
            <p>Select a date range and click "Generate Report" to view profit and loss.</p>
        </div>
      )}
    </div>
  );
}
