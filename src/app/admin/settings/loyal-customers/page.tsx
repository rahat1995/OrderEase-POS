
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { LoyalCustomerDiscount, CreateLoyalCustomerDiscountInput } from '@/types';
import {
  addLoyalCustomerDiscountAction,
  fetchLoyalCustomerDiscountsAction,
  updateLoyalCustomerDiscountAction,
  deleteLoyalCustomerDiscountAction,
} from '@/app/actions/loyalCustomerActions';
import LoyalCustomerDiscountForm from '@/components/admin/LoyalCustomerDiscountForm';

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
  DialogDescription as ShadcnDialogDescription,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card as PageCard, CardContent as PageCardContent, CardDescription as PageCardDescription, CardHeader as PageCardHeader, CardTitle as PageCardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { PlusCircle, Edit3, Trash2, Loader2, Users, Gift, AlertTriangle, UserPlus } from 'lucide-react';
import { format } from 'date-fns';

export default function LoyalCustomerManagementPage() {
  const [discounts, setDiscounts] = useState<LoyalCustomerDiscount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogSubmitting, setIsDialogSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<LoyalCustomerDiscount | null>(null);
  const [discountToDelete, setDiscountToDelete] = useState<LoyalCustomerDiscount | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const loadDiscounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await fetchLoyalCustomerDiscountsAction();
      setDiscounts(items);
    } catch (error) {
      toast({ title: "Error loading loyal customer discounts", description: (error as Error).message, variant: "destructive" });
      setDiscounts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDiscounts();
  }, [loadDiscounts]);

  const handleFormSubmit = async (data: CreateLoyalCustomerDiscountInput | (Partial<Omit<LoyalCustomerDiscount, 'id' | 'createdAt' | 'updatedAt'>> & { mobileNumber?: string })) => {
    setIsDialogSubmitting(true);
    try {
      if (editingDiscount && editingDiscount.id) {
        // For updates, mobileNumber cannot be changed via this specific form flow to simplify logic
        const updateData = { ...data };
        delete updateData.mobileNumber; // Ensure mobileNumber is not part of standard update object unless specifically handled for change
        const result = await updateLoyalCustomerDiscountAction(editingDiscount.id, updateData as Partial<Omit<LoyalCustomerDiscount, 'id'|'createdAt'|'updatedAt'>>);
        if (result.success) {
          toast({ title: "Success", description: "Loyal customer discount updated." });
        } else {
          throw new Error(result.error || "Discount update failed.");
        }
      } else {
        const result = await addLoyalCustomerDiscountAction(data as CreateLoyalCustomerDiscountInput);
        if (result.success && result.discount) {
          toast({ title: "Success", description: `Discount for "${result.discount.mobileNumber}" added.` });
        } else {
          throw new Error(result.error || "Discount addition failed.");
        }
      }
      await loadDiscounts();
      setIsFormOpen(false);
      setEditingDiscount(null);
    } catch (error: any) {
      toast({ title: "Discount Error", description: error.message, variant: "destructive" });
    } finally {
      setIsDialogSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!discountToDelete || !discountToDelete.id) return;
    setIsDialogSubmitting(true);
    try {
      const result = await deleteLoyalCustomerDiscountAction(discountToDelete.id);
      if (result.success) {
        toast({ title: "Success", description: `Discount for "${discountToDelete.mobileNumber}" deleted.` });
        await loadDiscounts();
      } else {
        throw new Error(result.error || "Failed to delete discount.");
      }
    } catch (error: any) {
      toast({ title: "Error Deleting Discount", description: error.message, variant: "destructive" });
    } finally {
      setIsDialogSubmitting(false);
      setIsDeleteDialogOpen(false);
      setDiscountToDelete(null);
    }
  };

  const handleToggleActive = async (discount: LoyalCustomerDiscount) => {
    try {
      const result = await updateLoyalCustomerDiscountAction(discount.id, { isActive: !discount.isActive });
      if (result.success) {
        toast({ title: "Status Updated", description: `Discount for "${discount.mobileNumber}" status changed.` });
        await loadDiscounts();
      } else {
        throw new Error(result.error || "Failed to update discount status.");
      }
    } catch (error: any) {
      toast({ title: "Error Updating Status", description: error.message, variant: "destructive" });
    }
  };

  const openEditForm = (discount: LoyalCustomerDiscount) => {
    setEditingDiscount(discount);
    setIsFormOpen(true);
  };

  const openNewForm = () => {
    setEditingDiscount(null);
    setIsFormOpen(true);
  };

  const openDeleteDialog = (discount: LoyalCustomerDiscount) => {
    setDiscountToDelete(discount);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <PageCardHeader className="flex flex-row items-center justify-between mb-6 -mx-2 md:-mx-0">
        <div className="flex items-center space-x-3">
          <Gift className="h-8 w-8 text-accent" />
          <div>
            <PageCardTitle className="text-2xl md:text-3xl">Loyal Customer Discounts</PageCardTitle>
            <PageCardDescription>Manage permanent discounts for loyal customers based on their mobile number.</PageCardDescription>
          </div>
        </div>
        <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
            setIsFormOpen(isOpen);
            if (!isOpen) setEditingDiscount(null);
          }}>
          <DialogTrigger asChild>
            <Button onClick={openNewForm} className="bg-accent hover:bg-accent/90">
              <UserPlus className="mr-2 h-4 w-4" /> Add New Discount Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingDiscount ? 'Edit Loyal Customer Discount' : 'Add New Loyal Customer Discount'}</DialogTitle>
              <ShadcnDialogDescription>
                {editingDiscount ? 'Update details for this discount rule.' : 'Fill in the form to create a new discount rule.'}
              </ShadcnDialogDescription>
            </DialogHeader>
            <LoyalCustomerDiscountForm
              key={editingDiscount ? editingDiscount.id : 'new-loyal-customer'}
              initialData={editingDiscount}
              onSubmit={handleFormSubmit}
              isSubmitting={isDialogSubmitting}
              onCancel={() => { setIsFormOpen(false); setEditingDiscount(null);}}
            />
          </DialogContent>
        </Dialog>
      </PageCardHeader>
      <PageCard className="shadow-xl">
        <PageCardContent className={discounts.length === 0 ? "pt-6" : "p-0 md:p-2"}>
          {isLoading ? (
             <div className="flex justify-center items-center h-60">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : discounts.length === 0 ? (
             <div className="text-center py-10 text-muted-foreground">
                <Users className="mx-auto h-16 w-16 mb-4" />
                <p className="text-lg font-medium">No loyal customer discounts found.</p>
                <p className="text-sm">Click "Add New Discount Rule" to get started.</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-350px)]">
              <Table>
                <TableHeader className="sticky top-0 bg-muted z-10">
                  <TableRow>
                    <TableHead>Mobile Number</TableHead>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Discount Type</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="w-[120px] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discounts.map((discount) => (
                    <TableRow key={discount.id}>
                      <TableCell className="font-medium">{discount.mobileNumber}</TableCell>
                      <TableCell className="text-xs">{discount.customerName || '-'}</TableCell>
                      <TableCell>{discount.discountType}</TableCell>
                      <TableCell className="text-right">
                        {discount.discountType === 'percentage' ? `${discount.discountValue}%` : `$${discount.discountValue.toFixed(2)}`}
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={discount.isActive}
                          onCheckedChange={() => handleToggleActive(discount)}
                          aria-label={`Toggle active state for ${discount.mobileNumber}`}
                        />
                      </TableCell>
                      <TableCell className="text-center space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditForm(discount)} aria-label="Edit discount" disabled={isDialogSubmitting}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(discount)} className="text-destructive hover:text-destructive/80" aria-label="Delete discount" disabled={isDialogSubmitting}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </PageCardContent>
      </PageCard>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center"><AlertTriangle className="mr-2 h-5 w-5 text-destructive"/>Confirm Deletion</DialogTitle>
            <ShadcnDialogDescription>
              This action cannot be undone and will permanently delete the discount rule.
            </ShadcnDialogDescription>
          </DialogHeader>
          <p className="py-2">
            Are you sure you want to delete the discount for: <strong>{discountToDelete?.mobileNumber}</strong>?
          </p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDialogSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDialogSubmitting}>
              {isDialogSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
