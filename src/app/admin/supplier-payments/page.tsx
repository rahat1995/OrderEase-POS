
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { SupplierBalance, SupplierPayment } from '@/types';
import { fetchSuppliersWithBalancesAction, fetchSupplierPaymentsAction } from '@/app/actions/supplierPaymentActions';
import SupplierPaymentForm from '@/components/admin/SupplierPaymentForm';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription as PageCardDescription, CardHeader as PageCardHeader, CardTitle as PageCardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { CreditCard, Wallet, DollarSign, ListChecks, CalendarDays, Loader2, Users } from 'lucide-react';
import { format } from 'date-fns';

export default function SupplierPaymentsPage() {
  const [suppliersWithBalances, setSuppliersWithBalances] = useState<SupplierBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start true for initial load
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [selectedSupplierForPayment, setSelectedSupplierForPayment] = useState<SupplierBalance | null>(null);
  
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedSupplierForHistory, setSelectedSupplierForHistory] = useState<SupplierBalance | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<SupplierPayment[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);


  const loadSupplierData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchSuppliersWithBalancesAction();
      setSuppliersWithBalances(data);
      if (data.length === 0) {
        toast({ title: "No Suppliers Found", description: "Please add suppliers in Cost Management first."});
      }
    } catch (error) {
      toast({ title: "Error loading supplier balances", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSupplierData();
  }, [loadSupplierData]);

  const handleOpenPaymentForm = (supplier: SupplierBalance) => {
    if (supplier.currentDue <= 0) {
        toast({ title: "No Due", description: `${supplier.name} has no outstanding payments.`, variant: "default" });
        return;
    }
    setSelectedSupplierForPayment(supplier);
    setIsPaymentFormOpen(true);
  };

  const handlePaymentAdded = () => {
    setIsPaymentFormOpen(false);
    setSelectedSupplierForPayment(null);
    loadSupplierData(); // Refresh the list
    toast({ title: "Payment Recorded", description: "Supplier balances have been updated." });
  };
  
  const handleOpenHistoryDialog = async (supplier: SupplierBalance) => {
    setSelectedSupplierForHistory(supplier);
    setIsHistoryDialogOpen(true);
    setIsLoadingHistory(true);
    try {
      const history = await fetchSupplierPaymentsAction(supplier.id);
      setPaymentHistory(history);
    } catch (error) {
      toast({ title: "Error loading payment history", description: (error as Error).message, variant: "destructive" });
      setPaymentHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };


  if (isLoading && suppliersWithBalances.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
         <p className="ml-3 text-lg">Loading Supplier Balances...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <PageCardHeader className="flex flex-row items-center justify-between mb-6 -mx-2 md:-mx-0">
        <div className="flex items-center space-x-3">
          <Wallet className="h-8 w-8 text-accent" />
          <div>
            <PageCardTitle className="text-2xl md:text-3xl">Supplier Payments & Balances</PageCardTitle>
            <PageCardDescription>Manage supplier payments and view their outstanding dues.</PageCardDescription>
          </div>
        </div>
      </PageCardHeader>

      <Card className="shadow-xl">
        <CardContent className={(isLoading && suppliersWithBalances.length > 0) || (!isLoading && suppliersWithBalances.length === 0) ? "pt-6" : "p-0"}>
          {isLoading && suppliersWithBalances.length > 0 && (
            <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /> 
                <p className="ml-2 text-muted-foreground">Refreshing supplier balances...</p>
            </div>
          )}
          {!isLoading && suppliersWithBalances.length === 0 ? (
             <div className="text-center py-10 text-muted-foreground">
                <Users className="mx-auto h-16 w-16 mb-4" />
                <p className="text-lg font-medium">No suppliers found.</p>
                <p className="text-sm">Add suppliers in the Cost Management section first.</p>
            </div>
          ) : !isLoading && suppliersWithBalances.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-300px)]">
              <Table>
                <TableHeader className="sticky top-0 bg-muted z-10">
                  <TableRow>
                    <TableHead>Supplier Name</TableHead>
                    <TableHead className="text-right">Total Billed ($)</TableHead>
                    <TableHead className="text-right">Total Paid ($)</TableHead>
                    <TableHead className="text-right font-semibold">Current Due ($)</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliersWithBalances.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell className="text-right">{supplier.totalBilled.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-green-600">{supplier.totalPaid.toFixed(2)}</TableCell>
                      <TableCell className={`text-right font-bold ${supplier.currentDue > 0 ? 'text-destructive' : 'text-primary'}`}>
                        {supplier.currentDue.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center space-x-1">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleOpenPaymentForm(supplier)}
                            disabled={supplier.currentDue <= 0}
                            className="h-8 text-xs"
                        >
                          <DollarSign className="mr-1.5 h-3.5 w-3.5" /> Make Payment
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleOpenHistoryDialog(supplier)} className="h-8 text-xs">
                          <ListChecks className="mr-1.5 h-3.5 w-3.5" /> History
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : null}
        </CardContent>
      </Card>

      {/* Make Payment Dialog */}
      <Dialog open={isPaymentFormOpen} onOpenChange={(isOpen) => {
          setIsPaymentFormOpen(isOpen);
          if (!isOpen) setSelectedSupplierForPayment(null);
      }}>
        <DialogContent className="sm:max-w-lg">
          {selectedSupplierForPayment && (
            <SupplierPaymentForm
              supplierBalance={selectedSupplierForPayment}
              onPaymentAdded={handlePaymentAdded}
              onCancel={() => { setIsPaymentFormOpen(false); setSelectedSupplierForPayment(null); }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
                <CalendarDays className="mr-2 h-6 w-6 text-accent"/>
                Payment History for {selectedSupplierForHistory?.name}
            </DialogTitle>
            <DialogDescription>
              A log of all payments made to this supplier.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {isLoadingHistory ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : paymentHistory.length === 0 ? (
              <p className="text-muted-foreground text-center">No payment history found for this supplier.</p>
            ) : (
              <ScrollArea className="h-[300px] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount Paid</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentHistory.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{format(new Date(payment.paymentDate), "MMM dd, yyyy")}</TableCell>
                        <TableCell className="text-right">${payment.amountPaid.toFixed(2)}</TableCell>
                        <TableCell>{payment.paymentMethod}</TableCell>
                        <TableCell className="text-xs">{payment.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
