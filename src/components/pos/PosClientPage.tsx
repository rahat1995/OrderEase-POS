
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import MenuItemCard from '@/components/pos/MenuItemCard';
import OrderCart from '@/components/pos/OrderCart';
import PrintReceipt from '@/components/pos/PrintReceipt';
import type { MenuItem, Order } from '@/types';
import { useOrder } from '@/contexts/OrderContext';
import { PackageOpen, AlertTriangle } from 'lucide-react'; // Added AlertTriangle
import { toast } from '@/hooks/use-toast';

interface PosClientPageProps {
  initialMenuItems: MenuItem[]; // This will now come from Firestore via server component
}

export default function PosClientPage({ initialMenuItems }: PosClientPageProps) {
  // No need to fetch menu items here anymore, they are passed as props
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems);
  const [orderForPrint, setOrderForPrint] = useState<Order | null>(null);
  const { clearOrder } = useOrder();

  // Update menu items if initialMenuItems prop changes (e.g., after admin updates)
  // This might not be strictly necessary if navigation re-fetches, but good for robustness
  useEffect(() => {
    setMenuItems(initialMenuItems);
  }, [initialMenuItems]);

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
        // Delay clearing order to allow print dialog to process fully
        // and to ensure the receipt component has rendered with order data.
        setTimeout(() => {
          clearOrder();
          setOrderForPrint(null); // Clear the order from state after printing and clearing context
          toast({ title: "Printing complete.", description: "Cart has been cleared." });
        }, 500); // Adjust delay if needed
      };
      
      // Short delay before triggering print to ensure component re-renders with orderForPrint
      const timer = setTimeout(printAction, 100); 
      return () => clearTimeout(timer);
    }
  }, [orderForPrint, clearOrder]);

  return (
    <div className="flex flex-col md:flex-row h-screen max-h-screen overflow-hidden bg-background">
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-primary">Menu</h1>
        {menuItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3">
            {menuItems.map((item) => (
              <MenuItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 rounded-lg bg-card border shadow-md">
            <PackageOpen className="w-20 h-20 mb-6 text-primary/70" />
            <h2 className="text-2xl font-semibold mb-2">Menu is Empty</h2>
            <p className="text-center max-w-md">
              No menu items are currently available. Please add items through the 
              <strong className="text-accent"> Menu Management </strong> 
              page to populate the POS.
            </p>
            <p className="text-xs mt-4">If you recently added items, try refreshing the page.</p>
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
