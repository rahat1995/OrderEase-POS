
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

export default function PosClientPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [orderForPrint, setOrderForPrint] = useState<Order | null>(null);
  const { clearOrder } = useOrder();

  const loadMenuItems = useCallback(async () => {
    console.log("PosClientPage: loadMenuItems called");
    setIsLoading(true);
    try {
      const items = await fetchMenuItemsAction();
      setMenuItems(items);
      if (items.length === 0) {
        toast({
          title: "Menu Information",
          description: "No menu items were found. Please check public/menu-items.json or add items if it's empty.",
          variant: "default",
          duration: 7000,
        });
      }
    } catch (error) {
      console.error("PosClientPage: Failed to load menu items:", error);
      let description = "Could not fetch menu items. Please check the server console for errors related to reading public/menu-items.json.";
      if (error instanceof Error) {
        description = error.message;
        if ((error as any).code === 'ENOENT') {
          description = "The menu file (public/menu-items.json) was not found. Please create it.";
        }
      }
      toast({
        title: "Error Loading Menu",
        description: description,
        variant: "destructive",
        duration: 10000,
      });
      setMenuItems([]);
    } finally {
      setIsLoading(false);
      console.log("PosClientPage: loadMenuItems finished");
    }
  // Removed `isLoading` from dependency array to prevent potential infinite loop
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, []); 

  useEffect(() => {
    console.log("PosClientPage: useEffect for loadMenuItems triggered");
    loadMenuItems();
  }, [loadMenuItems]); // This will run once on mount as loadMenuItems is stable

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
      console.log("PosClientPage: Order ready for print", orderForPrint);
      const printAction = () => {
        window.print();
        // Using a timeout to ensure print dialog doesn't block subsequent UI updates immediately
        setTimeout(() => {
          try {
            clearOrder();
            setOrderForPrint(null); // Clear the orderForPrint state
            toast({ title: "Printing complete.", description: "Cart has been cleared." });
          } catch (e) {
            console.error("Error during post-print cleanup:", e);
            toast({title: "Cleanup Error", description: "Error clearing cart after print.", variant: "destructive"});
          }
        }, 500); 
      };

      // Delay slightly to ensure DOM update before print dialog
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
              No menu items are currently available. Please add items to the 
              <code className="bg-muted text-muted-foreground/80 px-1 py-0.5 rounded mx-1">public/menu-items.json</code> 
              file.
            </p>
            <p className="text-xs mt-4">If you recently added items and they are not appearing, ensure the JSON format is correct and try restarting your development server.</p>
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
