
import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { OrderProvider } from '@/contexts/OrderContext';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { BarChart3, CreditCard, FileText, Landmark, ListPlus, PieChart, ShoppingCart, TrendingUp, Users } from 'lucide-react';


const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});


export const metadata: Metadata = {
  title: 'OrderEase POS',
  description: 'Point of Sale system for restaurants',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased bg-secondary/30 text-foreground`}>
        <OrderProvider>
          <header className="bg-background shadow-md sticky top-0 z-50">
            <nav className="container mx-auto px-4 py-2 flex justify-between items-center">
              <Link href="/" legacyBehavior passHref>
                <a className="text-2xl font-bold text-primary hover:text-accent transition-colors">
                  OrderEase POS
                </a>
              </Link>
              <div className="space-x-1 flex-wrap">
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
                    <Users className="mr-1.5 h-4 w-4" /> Supplier Dues
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/reports/profit-loss">
                    <PieChart className="mr-1.5 h-4 w-4" /> Profit & Loss
                  </Link>
                </Button>
              </div>
            </nav>
          </header>
          <div className="min-h-[calc(100vh-var(--header-height,60px))]">
            {children}
          </div>
          <Toaster />
        </OrderProvider>
      </body>
    </html>
  );

}
