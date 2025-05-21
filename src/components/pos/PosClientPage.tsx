
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import MenuItemCard from '@/components/pos/MenuItemCard';
import OrderCart from '@/components/pos/OrderCart';
import PrintReceipt from '@/components/pos/PrintReceipt';
import type { MenuItem, Order, RestaurantProfile, PrintRequestData } from '@/types';
import { useOrder } from '@/contexts/OrderContext';
import { fetchMenuItemsAction } from '@/app/actions/menuActions';
import { fetchRestaurantProfileAction } from '@/app/actions/restaurantProfileActions';
import { Input } from '@/components/ui/input'; // New import
import { PackageOpen, Loader2, SearchIcon } from 'lucide-react'; // Added SearchIcon
import { toast } from '@/hooks/use-toast';

export default function PosClientPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [printData, setPrintData] = useState<PrintRequestData | null>(null);
  const { clearOrder } = useOrder();
  const [restaurantProfile, setRestaurantProfile] = useState<RestaurantProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [searchTerm, setSearchTerm] = useState(''); // New state for search term

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
         if ((error as any).code === 'permission-denied' || (error as any).code === 'PERMISSION_DENIED') {
          description = "Firestore permission denied. Please check your security rules for the 'menuItems' collection.";
        }
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

  const filteredMenuItems = useMemo(() => {
    if (!searchTerm.trim()) {
      return menuItems;
    }
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    return menuItems.filter(item =>
      item.name.toLowerCase().includes(lowercasedSearchTerm) ||
      (item.code && item.code.toLowerCase().includes(lowercasedSearchTerm))
    );
  }, [menuItems, searchTerm]);

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
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Menu</h1>
          <div className="relative w-full max-w-xs">
            <Input
              type="text"
              placeholder="Search by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 h-10 border rounded-lg shadow-sm focus:ring-accent focus:border-accent"
            />
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        {filteredMenuItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
            {filteredMenuItems.map((item) => (
              <MenuItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-muted-foreground p-6 rounded-lg bg-card border shadow-md">
            <PackageOpen className="w-20 h-20 mb-6 text-primary/70" />
            <h2 className="text-2xl font-semibold mb-2">
              {searchTerm ? "No Matching Items" : "Menu is Empty"}
            </h2>
            <p className="text-center max-w-md">
              {searchTerm
                ? `No menu items found matching "${searchTerm}". Try a different search term or clear the search.`
                : "No menu items are currently available. Please add items via Menu Management or check the 'public/menu-items.json' file."
              }
            </p>
             {!searchTerm && menuItems.length === 0 && (
                <p className="text-xs mt-4">If you recently added items and they are not appearing, ensure the JSON format is correct or check Firestore, and try using the 'Sync' button.</p>
             )}
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
