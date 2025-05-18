
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { format, subDays } from 'date-fns';
import { Calendar as CalendarIcon, Search, Loader2, User, Phone, ShoppingBag, BarChart3 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import type { Order, CartItem } from '@/types';
import { fetchOrdersAction } from '@/app/actions/orderActions';
import { toast } from '@/hooks/use-toast';

interface ItemSalesReport {
  [itemName: string]: {
    quantity: number;
    totalValue: number;
  };
}

export default function SalesReportClient() {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [customerNameQuery, setCustomerNameQuery] = useState('');
  const [customerMobileQuery, setCustomerMobileQuery] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemSalesReport, setItemSalesReport] = useState<ItemSalesReport>({});
  const [lastSearchCriteria, setLastSearchCriteria] = useState<{name?:string, mobile?:string}>({});


  const calculateItemSales = useCallback((currentOrders: Order[]): ItemSalesReport => {
    const report: ItemSalesReport = {};
    currentOrders.forEach(order => {
      order.items.forEach(item => {
        if (!report[item.name]) {
          report[item.name] = { quantity: 0, totalValue: 0 };
        }
        report[item.name].quantity += item.quantity;
        report[item.name].totalValue += item.quantity * item.price;
      });
    });
    return report;
  }, []);

  const fetchOrders = useCallback(async (
    currentDateRange: { from?: Date; to?: Date },
    currentCustomerName: string,
    currentCustomerMobile: string
  ) => {
    setIsLoading(true);
    setError(null);
    setOrders([]); 
    setItemSalesReport({}); 
    setLastSearchCriteria({name: currentCustomerName.trim(), mobile: currentCustomerMobile.trim()});

    try {
      const fetchedOrders = await fetchOrdersAction(
        currentDateRange.from ? format(currentDateRange.from, 'yyyy-MM-dd') : undefined,
        currentDateRange.to ? format(currentDateRange.to, 'yyyy-MM-dd') : undefined,
        currentCustomerName.trim() || undefined,
        currentCustomerMobile.trim() || undefined
      );
      setOrders(fetchedOrders);
      setItemSalesReport(calculateItemSales(fetchedOrders));

      if (fetchedOrders.length === 0) {
        toast({ title: "No Orders Found", description: "No orders match the selected criteria." });
      } else {
        const criteriaUsed = [
          currentDateRange.from ? `From: ${format(currentDateRange.from, "LLL dd, y")}` : '',
          currentDateRange.to ? `To: ${format(currentDateRange.to, "LLL dd, y")}` : '',
          currentCustomerName.trim() ? `Customer: ${currentCustomerName.trim()}` : '',
          currentCustomerMobile.trim() ? `Mobile: ${currentCustomerMobile.trim()}` : ''
        ].filter(Boolean).join(', ');
        toast({ title: "Orders Loaded", description: `${fetchedOrders.length} order(s) found. ${criteriaUsed || 'All dates for customer'}` });
      }
    } catch (e) {
      console.error("Failed to fetch orders:", e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(errorMessage);
      toast({ title: "Error Fetching Orders", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [calculateItemSales]); 

  const guardedFetchOrders = useCallback(async (
    currentDateRange: { from?: Date; to?: Date },
    currentCustomerName: string,
    currentCustomerMobile: string
  ) => {
    const startDateString = currentDateRange.from ? format(currentDateRange.from, 'yyyy-MM-dd') : undefined;
    // const endDateString = currentDateRange.to ? format(currentDateRange.to, 'yyyy-MM-dd') : undefined; // Not directly needed for guard
    const hasCustomerFilter = currentCustomerName.trim() !== '' || currentCustomerMobile.trim() !== '';

    if (!hasCustomerFilter && !startDateString) {
      toast({
        title: "Date Range Required",
        description: "Please select at least a start date for the report if no customer is specified.",
        variant: "destructive",
      });
      setIsLoading(false); // Ensure loading state is reset
      setError("A start date is required for reports if no customer is specified."); // Set error state
      setOrders([]); // Clear orders
      setItemSalesReport({}); // Clear item sales
      return;
    }
    await fetchOrders(currentDateRange, currentCustomerName, currentCustomerMobile);
  }, [fetchOrders]);


  useEffect(() => {
    if (dateRange) { 
        guardedFetchOrders(dateRange, customerNameQuery, customerMobileQuery);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 
  
  const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
  const totalDiscount = orders.reduce((sum, order) => sum + order.discountAmount, 0);
  const totalItemsSoldOverall = orders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);

  const isCustomerSearchActive = !!(lastSearchCriteria.name || lastSearchCriteria.mobile);


  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Filter Orders</CardTitle>
          <CardDescription>
            Select a date range to view reports. Date range is optional if filtering by customer name or mobile.
            Customer name search is case-sensitive.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="grid gap-2 w-full sm:w-auto">
                <Label htmlFor="date-range-picker">Date Range</Label>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date-range-picker"
                        variant={"outline"}
                        className={cn(
                        "w-full sm:w-[260px] justify-start text-left font-normal",
                        !dateRange?.from && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
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
                <div className="grid gap-2 w-full sm:w-auto">
                    <Label htmlFor="customerName" className="flex items-center"><User className="mr-1.5 h-3.5 w-3.5"/>Customer Name</Label>
                    <Input 
                        id="customerName"
                        placeholder="e.g., John Doe"
                        value={customerNameQuery}
                        onChange={(e) => setCustomerNameQuery(e.target.value)}
                        className="w-full sm:w-[200px]"
                        disabled={isLoading}
                    />
                </div>
                <div className="grid gap-2 w-full sm:w-auto">
                    <Label htmlFor="customerMobile" className="flex items-center"><Phone className="mr-1.5 h-3.5 w-3.5"/>Customer Mobile</Label>
                    <Input 
                        id="customerMobile"
                        placeholder="e.g., 555-1234"
                        value={customerMobileQuery}
                        onChange={(e) => setCustomerMobileQuery(e.target.value)}
                        className="w-full sm:w-[200px]"
                        disabled={isLoading}
                    />
                </div>
            </div>
             <Button onClick={() => guardedFetchOrders(dateRange, customerNameQuery, customerMobileQuery)} disabled={isLoading} className="w-full sm:w-auto bg-accent hover:bg-accent/90">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Search Orders
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
                <BarChart3 className="mr-2 h-6 w-6 text-accent"/>
                {isCustomerSearchActive ? `Summary for ${lastSearchCriteria.name || lastSearchCriteria.mobile || 'Customer'}` : 'Overall Summary'}
            </CardTitle>
            <CardDescription>
                {isCustomerSearchActive 
                    ? `Showing data for orders matching the customer criteria ${dateRange?.from || dateRange?.to ? 'within the selected date range' : 'across all dates'}.`
                    : `Summary for all orders within the selected date range.`
                }
            </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div className="p-3 border rounded-md bg-background shadow">
                <p className="text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{orders.length}</p>
            </div>
            <div className="p-3 border rounded-md bg-background shadow">
                <p className="text-muted-foreground">Total Sales Value</p>
                <p className="text-2xl font-bold text-accent">${totalSales.toFixed(2)}</p>
            </div>
            <div className="p-3 border rounded-md bg-background shadow">
                <p className="text-muted-foreground">Total Discount Given</p>
                <p className="text-2xl font-bold">${totalDiscount.toFixed(2)}</p>
            </div>
            <div className="p-3 border rounded-md bg-background shadow">
                <p className="text-muted-foreground">Total Items Sold</p>
                <p className="text-2xl font-bold">{totalItemsSoldOverall}</p>
            </div>
        </CardContent>
      </Card>

      {Object.keys(itemSalesReport).length > 0 && !isCustomerSearchActive && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center">
                <ShoppingBag className="mr-2 h-6 w-6 text-accent"/>
                Item-wise Sales Report
            </CardTitle>
            <CardDescription>Breakdown of items sold in the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] w-full border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-muted z-10">
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-right">Quantity Sold</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(itemSalesReport)
                    .sort(([, a], [, b]) => b.quantity - a.quantity) 
                    .map(([itemName, data]) => (
                    <TableRow key={itemName}>
                      <TableCell className="font-medium">{itemName}</TableCell>
                      <TableCell className="text-right">{data.quantity}</TableCell>
                      <TableCell className="text-right">${data.totalValue.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
      
      {isLoading && !orders.length ? (
        <div className="text-center py-10">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">Loading orders...</p>
        </div>
      ) : !isLoading && orders.length === 0 && !error ? (
         <div className="text-center py-10 text-muted-foreground">
            <Search className="mx-auto h-12 w-12 mb-2" />
            <p>No orders found for the selected criteria.</p>
            <p className="text-xs">Try adjusting the filters or date range.</p>
        </div>
      ) : orders.length > 0 ? (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle>Order Details</CardTitle>
                <CardDescription>
                    {isCustomerSearchActive
                        ? `Showing orders for ${lastSearchCriteria.name || lastSearchCriteria.mobile || 'selected customer'}${dateRange?.from || dateRange?.to ? ' within the selected date range' : ' (all dates)'}.`
                        : `All orders within the selected date range.`
                    }
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[500px] w-full border rounded-md">
                <Table>
                    <TableHeader className="sticky top-0 bg-muted z-10">
                    <TableRow>
                        <TableHead className="w-[150px]">Order ID (Token)</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">Items</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="text-right">Discount</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {orders.map((order) => (
                        <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.token}</TableCell>
                        <TableCell>{format(new Date(order.orderDate), 'MMM dd, yyyy HH:mm')}</TableCell>
                        <TableCell>{order.customerName || 'N/A'}{order.customerMobile && ` (${order.customerMobile})`}</TableCell>
                        <TableCell className="text-right">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</TableCell>
                        <TableCell className="text-right">${order.subtotal.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-red-500">${order.discountAmount.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-semibold text-accent">${order.total.toFixed(2)}</TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                </ScrollArea>
            </CardContent>
        </Card>
        
      ) : null}
    </div>
  );
}

