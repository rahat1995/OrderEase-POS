
"use client"; 

import type { Metadata } from 'next'; 
// Removed: AuthProvider and useAuth imports
import { Geist } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { OrderProvider } from '@/contexts/OrderContext';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import {
  ShoppingCart,
  ListPlus,
  Tag,
  Landmark,
  CreditCard,
  BarChart3,
  TrendingUp,
  PieChart,
  Users as UsersIcon, 
  WifiOff,
  RefreshCw,
  Building, 
  // SettingsIcon, // Removed as it was mainly for user profile
  // LogOut, // Removed
  // LogIn, // Removed
  // UserCog, // Removed for User Management
} from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';
import { clearAllAppCache } from '@/lib/cache'; 
import { toast } from '@/hooks/use-toast'; 
// Removed: useRouter import

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

// export const metadata: Metadata = { // Reverted to simpler head tags if layout is client
// title: 'OrderEase POS',
// description: 'Point of Sale system for restaurants',
// };

// AppContent is no longer needed as AuthProvider is removed.
// We will integrate online status directly.

export default function RootLayout({ children }: { children: React.ReactNode; }) {
  const isOnline = useOnlineStatus();
  // Removed: currentUser, logout, isAdmin, isAuthLoading from useAuth()
  // Removed: router from useRouter()

  const handleSyncData = () => {
    if (isOnline) {
      clearAllAppCache();
      toast({
        title: "Local Cache Cleared",
        description: "Reloading to fetch fresh data...",
      });
      setTimeout(() => {
        window.location.reload(true); 
      }, 1500);
    } else {
      toast({
        title: "Cannot Sync",
        description: "You are currently offline.",
        variant: "destructive",
      });
    }
  };
  
  // Removed: handleLogout function

  return (
    <html lang="en">
      <head>
        <title>OrderEase POS</title>
        <meta name="description" content="Point of Sale system for restaurants" />
      </head>
      <body className={`${geistSans.variable} antialiased bg-secondary/30 text-foreground`}>
        <OrderProvider>
          {!isOnline && (
            <div className="bg-destructive text-destructive-foreground text-center py-2 px-4 fixed top-0 left-0 right-0 z-[1000] flex items-center justify-center">
              <WifiOff className="h-5 w-5 mr-2" />
              <span>You are currently offline. Changes will be synced when you reconnect.</span>
            </div>
          )}
          <header className={cn("bg-background shadow-md sticky z-50", isOnline ? "top-0" : "top-10")}>
            <nav className="container mx-auto px-4 py-2 flex justify-between items-center flex-wrap">
              <Link href="/" legacyBehavior passHref>
                <a className="text-2xl font-bold text-primary hover:text-accent transition-colors">
                  OrderEase POS
                </a>
              </Link>
              <div className="space-x-1 flex items-center flex-wrap">
                {/* Sales Management */}
                <Button asChild variant="ghost" size="sm">
                  <Link href="/">
                    <ShoppingCart className="mr-1.5 h-4 w-4" /> POS
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/admin/menu">
                    <ListPlus className="mr-1.5 h-4 w-4" /> Menu Mgt.
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/admin/vouchers">
                    <Tag className="mr-1.5 h-4 w-4" /> Voucher Mgt.
                  </Link>
                </Button>

                {/* Purchase/Cost Management */}
                <Button asChild variant="ghost" size="sm">
                  <Link href="/admin/costing">
                    <Landmark className="mr-1.5 h-4 w-4" /> Cost Mgt.
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/admin/supplier-payments">
                    <CreditCard className="mr-1.5 h-4 w-4" /> Supplier Payments
                  </Link>
                </Button>
                
                {/* Reports */}
                <Button asChild variant="ghost" size="sm">
                  <Link href="/reports/sales">
                    <BarChart3 className="mr-1.5 h-4 w-4" /> Sales Report
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/reports/costing">
                    <TrendingUp className="mr-1.5 h-4 w-4" /> Cost Report
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/reports/supplier-dues">
                    <UsersIcon className="mr-1.5 h-4 w-4" /> Supplier Dues
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/reports/profit-loss">
                    <PieChart className="mr-1.5 h-4 w-4" /> Profit & Loss
                  </Link>
                </Button>
                
                {/* Settings & User Management */}
                <Button asChild variant="ghost" size="sm">
                  <Link href="/admin/settings/restaurant-profile">
                    <Building className="mr-1.5 h-4 w-4" /> Restaurant Profile
                  </Link>
                </Button>
                {/* Removed User Management Link */}
                
                {/* Sync Button */}
                <Button variant="outline" size="sm" onClick={handleSyncData} title="Sync Data">
                  <RefreshCw className="mr-1.5 h-4 w-4" /> Sync
                </Button>

                {/* Removed Auth Buttons */}

              </div>
            </nav>
          </header>
          <div className={cn("min-h-[calc(100vh-var(--header-height,60px))]", !isOnline && "pt-10")}>
            {children}
          </div>
          <Toaster />
        </OrderProvider>
      </body>
    </html>
  );
}
