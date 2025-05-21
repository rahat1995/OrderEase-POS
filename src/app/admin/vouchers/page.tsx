
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { Voucher, CreateVoucherInput } from '@/types';
import { addVoucherAction, fetchVouchersAction, updateVoucherAction, deleteVoucherAction } from '@/app/actions/voucherActions';
import VoucherForm from '@/components/admin/VoucherForm';

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
  DialogDescription as ShadcnDialogDescription, // Renamed to avoid conflict
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card as PageCard, CardContent as PageCardContent, CardDescription as PageCardDescription, CardHeader as PageCardHeader, CardTitle as PageCardTitle } from '@/components/ui/card'; // Aliased Card imports
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { PlusCircle, Edit3, Trash2, Loader2, Ticket, AlertTriangle, Tag } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function VoucherManagementPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogSubmitting, setIsDialogSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [voucherToDelete, setVoucherToDelete] = useState<Voucher | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const loadVouchers = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await fetchVouchersAction();
      setVouchers(items);
    } catch (error) {
      toast({ title: "Error loading vouchers", description: (error as Error).message, variant: "destructive" });
      setVouchers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVouchers();
  }, [loadVouchers]);

  const handleFormSubmit = async (data: CreateVoucherInput) => {
    setIsDialogSubmitting(true);
    try {
      if (editingVoucher && editingVoucher.id) {
        const result = await updateVoucherAction(editingVoucher.id, data);
        if (result.success) {
          toast({ title: "Success", description: "Voucher updated." });
        } else {
          throw new Error(result.error || "Voucher update failed.");
        }
      } else {
        const result = await addVoucherAction(data);
        if (result.success && result.voucher) {
          toast({ title: "Success", description: `Voucher "${result.voucher.code}" added.` });
        } else {
          throw new Error(result.error || "Voucher addition failed.");
        }
      }
      await loadVouchers();
      setIsFormOpen(false);
      setEditingVoucher(null);
    } catch (error: any) {
      toast({ title: "Voucher Error", description: error.message, variant: "destructive" });
    } finally {
      setIsDialogSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!voucherToDelete || !voucherToDelete.id) return;
    setIsDialogSubmitting(true);
    try {
      const result = await deleteVoucherAction(voucherToDelete.id);
      if (result.success) {
        toast({ title: "Success", description: `Voucher "${voucherToDelete.code}" deleted.` });
        await loadVouchers();
      } else {
        throw new Error(result.error || "Failed to delete voucher.");
      }
    } catch (error: any) {
      toast({ title: "Error Deleting Voucher", description: error.message, variant: "destructive" });
    } finally {
      setIsDialogSubmitting(false);
      setIsDeleteDialogOpen(false);
      setVoucherToDelete(null);
    }
  };

  const handleToggleActive = async (voucher: Voucher) => {
    try {
      const result = await updateVoucherAction(voucher.id, { isActive: !voucher.isActive });
      if (result.success) {
        toast({ title: "Status Updated", description: `Voucher "${voucher.code}" status changed.` });
        await loadVouchers();
      } else {
        throw new Error(result.error || "Failed to update voucher status.");
      }
    } catch (error: any) {
      toast({ title: "Error Updating Status", description: error.message, variant: "destructive" });
    }
  };

  const openEditForm = (voucher: Voucher) => {
    setEditingVoucher(voucher);
    setIsFormOpen(true);
  };

  const openNewForm = () => {
    setEditingVoucher(null);
    setIsFormOpen(true);
  };

  const openDeleteDialog = (voucher: Voucher) => {
    setVoucherToDelete(voucher);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <PageCardHeader className="flex flex-row items-center justify-between mb-6 -mx-2 md:-mx-0">
        <div className="flex items-center space-x-3">
          <Ticket className="h-8 w-8 text-accent" />
          <div>
            <PageCardTitle className="text-2xl md:text-3xl">Voucher Management</PageCardTitle>
            <PageCardDescription>Create, manage, and track promotional vouchers.</PageCardDescription>
          </div>
        </div>
        <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
            setIsFormOpen(isOpen);
            if (!isOpen) setEditingVoucher(null);
          }}>
          <DialogTrigger asChild>
            <Button onClick={openNewForm} className="bg-accent hover:bg-accent/90">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Voucher
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl"> {/* Wider dialog for more fields */}
            <DialogHeader>
              <DialogTitle>{editingVoucher ? 'Edit Voucher' : 'Add New Voucher'}</DialogTitle>
              <ShadcnDialogDescription>
                {editingVoucher ? 'Update details for this voucher.' : 'Fill in the form to create a new voucher.'}
              </ShadcnDialogDescription>
            </DialogHeader>
            <VoucherForm
              key={editingVoucher ? editingVoucher.id : 'new'}
              initialData={editingVoucher}
              onSubmit={handleFormSubmit}
              isSubmitting={isDialogSubmitting}
              onCancel={() => { setIsFormOpen(false); setEditingVoucher(null);}}
            />
          </DialogContent>
        </Dialog>
      </PageCardHeader>
      <PageCard className="shadow-xl">
        <PageCardContent className={vouchers.length === 0 ? "pt-6" : "p-0 md:p-2"}>
          {isLoading ? (
             <div className="flex justify-center items-center h-60">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : vouchers.length === 0 ? (
             <div className="text-center py-10 text-muted-foreground">
                <Tag className="mx-auto h-16 w-16 mb-4" />
                <p className="text-lg font-medium">No vouchers found.</p>
                <p className="text-sm">Click "Add New Voucher" to get started!</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-350px)]">
              <Table>
                <TableHeader className="sticky top-0 bg-muted z-10">
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Min. Order</TableHead>
                    <TableHead>Valid From</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead className="text-center">Usage</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="w-[120px] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vouchers.map((voucher) => (
                    <TableRow key={voucher.id}>
                      <TableCell className="font-medium">{voucher.code}</TableCell>
                      <TableCell className="text-xs">{voucher.description || '-'}</TableCell>
                      <TableCell>{voucher.discountType}</TableCell>
                      <TableCell className="text-right">{voucher.discountType === 'percentage' ? `${voucher.discountValue}%` : `$${voucher.discountValue.toFixed(2)}`}</TableCell>
                      <TableCell className="text-right">${voucher.minOrderAmount?.toFixed(2) || '-'}</TableCell>
                      <TableCell>{voucher.validFrom ? format(parseISO(voucher.validFrom), 'MMM dd, yyyy') : '-'}</TableCell>
                      <TableCell>{voucher.validUntil ? format(parseISO(voucher.validUntil), 'MMM dd, yyyy') : '-'}</TableCell>
                      <TableCell className="text-center">{voucher.timesUsed} / {voucher.usageLimit || '∞'}</TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={voucher.isActive}
                          onCheckedChange={() => handleToggleActive(voucher)}
                          aria-label={`Toggle active state for ${voucher.code}`}
                        />
                      </TableCell>
                      <TableCell className="text-center space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditForm(voucher)} aria-label="Edit voucher" disabled={isDialogSubmitting}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(voucher)} className="text-destructive hover:text-destructive/80" aria-label="Delete voucher" disabled={isDialogSubmitting}>
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
              This action cannot be undone and will permanently delete the voucher.
            </ShadcnDialogDescription>
          </DialogHeader>
          <p className="py-2">
            Are you sure you want to delete the voucher: <strong>{voucherToDelete?.code}</strong>?
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
