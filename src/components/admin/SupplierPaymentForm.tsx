
"use client";

import React, { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import type { CreateSupplierPaymentInput, SupplierBalance } from '@/types';
import { addSupplierPaymentAction } from '@/app/actions/supplierPaymentActions';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'; // For Dialog content
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Loader2, CalendarIcon, Banknote } from 'lucide-react';

const paymentFormSchema = z.object({
  paymentDate: z.date({ required_error: "Payment date is required." }),
  amountPaid: z.coerce.number().positive({ message: "Amount must be a positive number." }),
  paymentMethod: z.string().min(1, { message: "Payment method is required." }),
  notes: z.string().optional(),
});
type PaymentFormData = z.infer<typeof paymentFormSchema>;

interface SupplierPaymentFormProps {
  supplierBalance: SupplierBalance;
  onPaymentAdded: () => void; // Callback to refresh parent list or close dialog
  onCancel: ()_VOID;
}

export default function SupplierPaymentForm({ supplierBalance, onPaymentAdded, onCancel }: SupplierPaymentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      paymentDate: new Date(),
      amountPaid: Math.max(0, supplierBalance.currentDue), // Default to current due, but not less than 0
      paymentMethod: '',
      notes: '',
    },
  });
  
  // Watch the amountPaid field to provide real-time feedback or validation if needed
  const amountPaidValue = form.watch('amountPaid');

  const onSubmit: SubmitHandler<PaymentFormData> = async (data) => {
    setIsSubmitting(true);
    if (data.amountPaid > supplierBalance.currentDue) {
      form.setError("amountPaid", { type: "manual", message: `Cannot pay more than current due ($${supplierBalance.currentDue.toFixed(2)}).` });
      setIsSubmitting(false);
      return;
    }
     if (supplierBalance.currentDue <= 0) {
      toast({ title: "No Due", description: `${supplierBalance.name} has no outstanding payments.`, variant: "destructive" });
      setIsSubmitting(false);
      onCancel(); // Close form as there's nothing to pay
      return;
    }


    const paymentData: CreateSupplierPaymentInput = {
      supplierId: supplierBalance.id,
      paymentDate: data.paymentDate.toISOString(),
      amountPaid: data.amountPaid,
      paymentMethod: data.paymentMethod,
      notes: data.notes || undefined,
    };

    try {
      const result = await addSupplierPaymentAction(paymentData);
      if (result.success && result.payment) {
        toast({ title: "Payment Added", description: `Payment of $${result.payment.amountPaid.toFixed(2)} for ${supplierBalance.name} recorded.` });
        form.reset();
        onPaymentAdded(); // Trigger parent refresh/close
      } else {
        throw new Error(result.error || "Failed to add payment.");
      }
    } catch (error) {
      toast({ title: "Error Adding Payment", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center">
          <Banknote className="mr-2 h-6 w-6 text-accent"/>
          Record Payment for {supplierBalance.name}
        </DialogTitle>
        <DialogDescription>
          Current Due: <span className="font-semibold text-destructive">${supplierBalance.currentDue.toFixed(2)}</span>. 
          Enter payment details below.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <FormField
            control={form.control}
            name="paymentDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Payment Date *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                        disabled={isSubmitting}
                      >
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || isSubmitting} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="amountPaid"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount Paid *</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="e.g., 100.00" {...field} disabled={isSubmitting} />
                </FormControl>
                {amountPaidValue > supplierBalance.currentDue && (
                   <p className="text-sm text-destructive">Amount cannot exceed current due of ${supplierBalance.currentDue.toFixed(2)}.</p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Method *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Check">Check</SelectItem>
                    <SelectItem value="Online Payment">Online Payment</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (Optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="e.g., Cleared invoice #123, partial payment for PO #456" {...field} rows={3} disabled={isSubmitting}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <DialogFooter className="pt-4">
             <DialogClose asChild>
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
             </DialogClose>
            <Button type="submit" disabled={isSubmitting || !form.formState.isValid || amountPaidValue > supplierBalance.currentDue || supplierBalance.currentDue <= 0} className="bg-accent hover:bg-accent/90">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Banknote className="mr-2 h-4 w-4" />}
              Record Payment
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
