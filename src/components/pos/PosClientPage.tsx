
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import MenuItemCard from '@/components/pos/MenuItemCard';
import OrderCart from '@/components/pos/OrderCart';
import PrintReceipt from '@/components/pos/PrintReceipt';
import type { MenuItem, Order } from '@/types';
import { useOrder } from '@/contexts/OrderContext';
import { fetchMenuItemsAction } from '@/app/actions/menuActions';
import { PackageOpen, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// No longer takes initialMenuItems as a prop
export default function PosClientPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [orderForPrint, setOrderForPrint] = useState<Order | null>(null);
  const { clearOrder } = useOrder();

  const loadMenuItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await fetchMenuItemsAction();
      setMenuItems(items);
    } catch (error) {
      console.error("Failed to load menu items:", error);
      toast({
        title: "Error Loading Menu",
        description: (error as Error).message || "Could not fetch menu items.",
        variant: "destructive",
      });
      setMenuItems([]); // Set to empty array on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenuItems();
  }, [loadMenuItems]);

  const handlePrintRequest = useCallback(async (order: Order | null) => {
    if (order) {
        setOrderForPrint(order);
    } else {
        toast({
            title: "Order Finalization Failed",
            description: "Could not retrieve order details for printing.",
            variant: "destructive",
        });
    }
  }, []);


  useEffect(() => {
    if (orderForPrint) {
      const printAction = () => {
        window.print();
        setTimeout(() => {
          clearOrder();
          setOrderForPrint(null);
          toast({ title: "Printing complete.", description: "Cart has been cleared." });
        }, 500); 
      };
      
      const timer = setTimeout(printAction, 100); 
      return () => clearTimeout(timer);
    }
  }, [orderForPrint, clearOrder]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading Menu...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen max-h-screen overflow-hidden bg-background">
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-primary">Menu</h1>
        {menuItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
            {menuItems.map((item) => (
              <MenuItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-150px)] text-muted-foreground p-6 rounded-lg bg-card border shadow-md">
            <PackageOpen className="w-20 h-20 mb-6 text-primary/70" />
            <h2 className="text-2xl font-semibold mb-2">Menu is Empty</h2>
            <p className="text-center max-w-md">
              No menu items are currently available. Please add items through the 
              <strong className="text-accent"> Menu Management </strong> 
              page to populate the POS.
            </p>
            <p className="text-xs mt-4">If you recently added items, this page should update automatically. You can also try refreshing.</p>
          </div>
        )}
      </main>
      <aside className="w-full md:w-96 lg:w-[400px] xl:w-[450px] bg-card border-l border-border max-h-screen h-full">
        <OrderCart onPrintRequest={handlePrintRequest} />
      </aside>
      {orderForPrint && <PrintReceipt order={orderForPrint} />}
    </div>
  );
}
