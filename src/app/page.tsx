
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import MenuItemCard from '@/components/pos/MenuItemCard';
import OrderCart from '@/components/pos/OrderCart';
import PrintReceipt from '@/components/pos/PrintReceipt';
import type { MenuItem, Order } from '@/types';
import { useOrder } from '@/contexts/OrderContext';
import { PackageOpen } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const sampleMenuItems: MenuItem[] = [
  { id: 'pizza-m', name: 'Pizza Margherita', price: 12.99, imageUrl: 'https://placehold.co/300x200.png', dataAiHint: 'pizza cheese' },
  { id: 'burger-c', name: 'Classic Burger', price: 8.50, imageUrl: 'https://placehold.co/300x200.png', dataAiHint: 'burger beef' },
  { id: 'fries-s', name: 'Crispy Fries', price: 3.00, imageUrl: 'https://placehold.co/300x200.png', dataAiHint: 'french fries' },
  { id: 'coke-z', name: 'Cola Drink', price: 2.00, imageUrl: 'https://placehold.co/300x200.png', dataAiHint: 'soda can' },
  { id: 'salad-g', name: 'Garden Salad', price: 7.50, imageUrl: 'https://placehold.co/300x200.png', dataAiHint: 'fresh salad' },
  { id: 'pasta-b', name: 'Pasta Bolognese', price: 11.00, imageUrl: 'https://placehold.co/300x200.png', dataAiHint: 'pasta meat' },
  { id: 'sand-t', name: 'Turkey Sandwich', price: 6.75, imageUrl: 'https://placehold.co/300x200.png', dataAiHint: 'sandwich deli' },
  { id: 'juice-o', name: 'Orange Juice', price: 3.50, imageUrl: 'https://placehold.co/300x200.png', dataAiHint: 'orange juice' },
];

export default function OrderPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orderForPrint, setOrderForPrint] = useState<Order | null>(null);
  const { clearOrder, items: cartItems, finalizeOrder: contextFinalizeOrder } = useOrder(); // Renamed to avoid conflict

  useEffect(() => {
    // Simulate fetching menu items
    setMenuItems(sampleMenuItems);
  }, []);

  const handlePrintRequest = useCallback(async (orderIdToken: string) => {
    // The order is already finalized in context by OrderCart
    // Retrieve the full order details based on token if needed, or use current cart state
    // For this demo, we'll re-finalize to ensure we have the latest state for printing.
    // OrderCart calls finalizeOrder which updates context. Here we retrieve that.
    // This can be simplified if OrderCart directly passes the full order object.
    // For now, let's assume OrderCart has set the context correctly via finalizeOrder.
    // Let's find the order using the current cart items as a proxy since we don't have a backend.
    
    // The order is created by finalizeOrder in OrderContext, which OrderCart calls.
    // We need to get that Order object to pass to PrintReceipt.
    // A better approach: finalizeOrder returns the Order, OrderCart passes it to onPrint.
    // Modifying OrderCart's onPrint to pass the Order object.
    // So, handlePrintRequest should receive the Order object.

    // Let's refine: OrderCart calls context's finalizeOrder. That function should store the Order,
    // or return it. Then this page component can retrieve it.
    // For simplicity now, OrderCart's onPrint will trigger this,
    // and this function will get the current state from context to form the Order.
    
    // This re-finalization is simplified here. In a real app, OrderCart would pass the Order object.
    // For the demo, let's assume `contextFinalizeOrder` gives us the order we need.
    const finalizedOrder = contextFinalizeOrder(); // This will use current context state
    if (finalizedOrder) {
        setOrderForPrint(finalizedOrder);
    }

  }, [contextFinalizeOrder]);


  useEffect(() => {
    if (orderForPrint) {
      const printAction = () => {
        window.print();
        // Clear the order from context and reset local print state *after* print dialog likely closed.
        // Using a timeout as onafterprint is unreliable.
        setTimeout(() => {
          clearOrder();
          setOrderForPrint(null);
          toast({ title: "Printing complete.", description: "Cart has been cleared." });
        }, 500); // Short delay
      };
      
      // Delay slightly to allow DOM update for PrintReceipt
      const timer = setTimeout(printAction, 100); 
      return () => clearTimeout(timer);
    }
  }, [orderForPrint, clearOrder]);

  return (
    <div className="flex flex-col md:flex-row h-screen max-h-screen overflow-hidden bg-background">
      <main className="flex-1 p-6 overflow-y-auto">
        <h1 className="text-3xl font-bold mb-6 text-primary">Menu</h1>
        {menuItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {menuItems.map((item) => (
              <MenuItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <PackageOpen className="w-16 h-16 mb-4" />
            <p className="text-xl">No menu items available.</p>
          </div>
        )}
      </main>
      <aside className="w-full md:w-96 lg:w-[450px] bg-card border-l border-border max-h-screen h-full">
        <OrderCart onPrint={handlePrintRequest} />
      </aside>
      {orderForPrint && <PrintReceipt order={orderForPrint} />}
    </div>
  );
}
