
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import MenuItemCard from '@/components/pos/MenuItemCard';
import OrderCart from '@/components/pos/OrderCart';
import PrintReceipt from '@/components/pos/PrintReceipt';
import type { MenuItem, Order, RestaurantProfile, PrintRequestData } from '@/types';
import { useOrder } from '@/contexts/OrderContext';
import { fetchMenuItemsAction } from '@/app/actions/menuActions';
import { fetchRestaurantProfileAction } from '@/app/actions/restaurantProfileActions';
import { PackageOpen, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function PosClientPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [printData, setPrintData] = useState<PrintRequestData | null>(null);
  const { clearOrder } = useOrder();
  const [restaurantProfile, setRestaurantProfile] = useState<RestaurantProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);


  const loadInitialData = useCallback(async () => {
    console.log("PosClientPage: loadInitialData called");
    setIsLoadingMenu(true);
    setIsLoadingProfile(true);
    try {
      const [items, profile] = await Promise.all([
        fetchMenuItemsAction(),
        fetchRestaurantProfileAction()
      ]);

      setMenuItems(items);
      setRestaurantProfile(profile);

      if (items.length === 0) {
        toast({
          title: "Menu Information",
          description: "No menu items were found. Please check public/menu-items.json or add items if it's empty.",
          variant: "default",
          duration: 7000,
        });
      }
       if (!profile || !profile.name) {
        toast({
          title: "Restaurant Profile Incomplete",
          description: "Restaurant details are missing. Please set them up in Admin > Settings.",
          variant: "default",
          duration: 7000,
        });
      }

    } catch (error) {
      console.error("PosClientPage: Failed to load initial data:", error);
      let description = "Could not fetch initial data. Please check the server console for errors.";
      if (error instanceof Error) {
        description = error.message;
      }
      toast({
        title: "Error Loading Data",
        description: description,
        variant: "destructive",
        duration: 10000,
      });
      setMenuItems([]);
      setRestaurantProfile(null);
    } finally {
      setIsLoadingMenu(false);
      setIsLoadingProfile(false);
      console.log("PosClientPage: loadInitialData finished");
    }
  }, []); 

  useEffect(() => {
    console.log("PosClientPage: useEffect for loadInitialData triggered");
    loadInitialData();
  }, [loadInitialData]);

  const handlePrintRequest = useCallback(async (data: PrintRequestData) => {
    if (data.order) {
        setPrintData(data); // data already includes profile
    } else {
        toast({
            title: "Order Finalization Failed",
            description: "Could not retrieve order details for printing.",
            variant: "destructive",
        });
    }
  }, []);


  useEffect(() => {
    if (printData && printData.order) {
      console.log("PosClientPage: Order ready for print", printData);
      const printAction = () => {
        window.print();
        setTimeout(() => {
          try {
            clearOrder();
            setPrintData(null); 
            toast({ title: "Printing complete.", description: "Cart has been cleared." });
          } catch (e) {
            console.error("Error during post-print cleanup:", e);
            toast({title: "Cleanup Error", description: "Error clearing cart after print.", variant: "destructive"});
          }
        }, 500); 
      };

      const timer = setTimeout(printAction, 100); 
      return () => clearTimeout(timer);
    }
  }, [printData, clearOrder]);

  const isLoading = isLoadingMenu || isLoadingProfile;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading POS...</p>
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
            <p className="text-xs mt-4">If you recently added items and they are not appearing, ensure the JSON format is correct and try restarting your development server or use the 'Sync' button.</p>
          </div>
        )}
      </main>
      <aside className="w-full md:w-96 lg:w-[400px] xl:w-[450px] bg-card border-l border-border max-h-screen h-full">
        <OrderCart onPrintRequest={handlePrintRequest} restaurantProfile={restaurantProfile} />
      </aside>
      {printData && printData.order && <PrintReceipt order={printData.order} profile={printData.profile} />}
    </div>
  );
}
