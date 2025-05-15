
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import MenuItemCard from '@/components/pos/MenuItemCard';
import OrderCart from '@/components/pos/OrderCart';
import PrintReceipt from '@/components/pos/PrintReceipt';
import type { MenuItem, Order } from '@/types';
import { useOrder } from '@/contexts/OrderContext';
import { PackageOpen } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface PosClientPageProps {
  initialMenuItems: MenuItem[];
}

export default function PosClientPage({ initialMenuItems }: PosClientPageProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems);
  const [orderForPrint, setOrderForPrint] = useState<Order | null>(null);
  const { clearOrder } = useOrder();

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
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <PackageOpen className="w-16 h-16 mb-4" />
            <p className="text-xl">No menu items available.</p>
            <p className="text-sm">Check `public/menu-items.json` or server logs.</p>
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
