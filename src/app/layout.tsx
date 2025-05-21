
"use client"; 

import type { Metadata } from 'next'; 
import { AuthProvider, useAuth } from '@/contexts/AuthContext'; // Import AuthProvider and useAuth
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
  Users as UsersIcon, // Renamed to avoid conflict with Users page icon
  WifiOff,
  RefreshCw,
  Building, 
  SettingsIcon,
  LogOut,
  LogIn,
  UserCog, // For User Management
} from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';
import { clearAllAppCache } from '@/lib/cache'; 
import { toast } from '@/hooks/use-toast'; 
import { useRouter } from 'next/navigation';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

// export const metadata: Metadata = { // Metadata should be defined in server components or page.tsx
//   title: 'OrderEase POS',
//   description: 'Point of Sale system for restaurants',
// };

function AppContent({ children }: { children: React.ReactNode }) {
  const isOnline = useOnlineStatus();
  const { currentUser, logout, isAdmin, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

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
  
  const handleLogout = async () => {
    await logout();
    // router.push('/login'); // AuthContext logout already handles redirect
  };

  return (
    <html lang="en">
      <head>
        <title>OrderEase POS</title>
        <meta name="description" content="Point of Sale system for restaurants" />
      </head>
      <body className={`${geistSans.variable} antialiased bg-secondary/30 text-foreground`}>
        <OrderProvider> {/* OrderProvider should be inside AuthProvider if it needs auth context */}
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
                {currentUser && (
                  <>
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/">
                        <ShoppingCart className="mr-1.5 h-4 w-4" /> POS
                      </Link>
                    </Button>
                    {isAdmin && (
                       <Button asChild variant="ghost" size="sm">
                        <Link href="/admin/menu">
                          <ListPlus className="mr-1.5 h-4 w-4" /> Menu Mgt.
                        </Link>
                      </Button>
                    )}
                     {isAdmin && (
                        <Button asChild variant="ghost" size="sm">
                        <Link href="/admin/vouchers">
                          <Tag className="mr-1.5 h-4 w-4" /> Voucher Mgt.
                        </Link>
                      </Button>
                     )}
                  </>
                )}

                {/* Purchase/Cost Management */}
                {currentUser && isAdmin && (
                  <>
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
                  </>
                )}
                
                {/* Reports */}
                {currentUser && isAdmin && (
                  <>
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
                  </>
                )}
                
                {/* Settings & User Management */}
                 {currentUser && isAdmin && (
                  <>
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/admin/settings/restaurant-profile">
                        <Building className="mr-1.5 h-4 w-4" /> Restaurant Profile
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                        <Link href="/admin/users">
                          <UserCog className="mr-1.5 h-4 w-4" /> User Mgt.
                        </Link>
                    </Button>
                  </>
                 )}
                
                {/* Sync Button */}
                {currentUser && (
                  <Button variant="outline" size="sm" onClick={handleSyncData} title="Sync Data" disabled={isAuthLoading}>
                    <RefreshCw className="mr-1.5 h-4 w-4" /> Sync
                  </Button>
                )}

                {/* Auth Buttons */}
                {!isAuthLoading && currentUser ? (
                  <Button variant="outline" size="sm" onClick={handleLogout} title="Logout">
                    <LogOut className="mr-1.5 h-4 w-4" /> Logout ({currentUser.displayName || currentUser.email})
                  </Button>
                ) : !isAuthLoading && !currentUser ? (
                  <Button asChild variant="ghost" size="sm" onClick={() => router.push('/login')}>
                     <Link href="/login">
                        <LogIn className="mr-1.5 h-4 w-4" /> Login
                     </Link>
                  </Button>
                ) : null}

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


export default function RootLayout({ children }: { children: React.ReactNode; }) {
  return (
    <AuthProvider>
      <AppContent>{children}</AppContent>
    </AuthProvider>
  );
}
