
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { format, subDays } from 'date-fns';
import { Calendar as CalendarIcon, Search, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import type { Order } from '@/types';
import { fetchOrdersAction } from '@/app/actions/orderActions';
import { toast } from '@/hooks/use-toast';

export default function SalesReportClient() {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: subDays(new Date(), 7), // Default to last 7 days
    to: new Date(),
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedOrders = await fetchOrdersAction(
        dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
        dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined
      );
      setOrders(fetchedOrders);
      if (fetchedOrders.length === 0) {
        toast({ title: "No Orders Found", description: "No orders match the selected date range." });
      }
    } catch (e) {
      console.error("Failed to fetch orders:", e);
      setError(e instanceof Error ? e.message : 'An unknown error occurred while fetching orders.');
      toast({ title: "Error Fetching Orders", description: error, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, error]); // Added error to dependency array

  useEffect(() => {
    fetchOrders();
  }, []); // Fetch on initial load with default date range

  const handleSearch = () => {
    fetchOrders();
  };
  
  const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
  const totalDiscount = orders.reduce((sum, order) => sum + order.discountAmount, 0);
  const totalItemsSold = orders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center p-4 border rounded-lg bg-muted/30">
        <div className="grid gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-[260px] justify-start text-left font-normal",
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
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
        <Button onClick={handleSearch} disabled={isLoading} className="w-full sm:w-auto">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
          Search Orders
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
            <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div className="p-3 border rounded-md bg-background">
                <p className="text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{orders.length}</p>
            </div>
            <div className="p-3 border rounded-md bg-background">
                <p className="text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold text-accent">${totalSales.toFixed(2)}</p>
            </div>
            <div className="p-3 border rounded-md bg-background">
                <p className="text-muted-foreground">Total Discount Given</p>
                <p className="text-2xl font-bold">${totalDiscount.toFixed(2)}</p>
            </div>
            <div className="p-3 border rounded-md bg-background">
                <p className="text-muted-foreground">Total Items Sold</p>
                <p className="text-2xl font-bold">{totalItemsSold}</p>
            </div>
        </CardContent>
      </Card>


      {isLoading && !orders.length ? (
        <div className="text-center py-10">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">Loading orders...</p>
        </div>
      ) : !isLoading && orders.length === 0 && !error ? (
         <div className="text-center py-10 text-muted-foreground">
            <Search className="mx-auto h-12 w-12 mb-2" />
            <p>No orders found for the selected criteria.</p>
            <p className="text-xs">Try adjusting the date range.</p>
        </div>
      ) : orders.length > 0 ? (
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
                  <TableCell className="text-right">${order.discountAmount.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-semibold text-accent">${order.total.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      ) : null}
    </div>
  );
}

