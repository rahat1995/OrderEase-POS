
"use client";

import React from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { LoyalCustomerDiscount, CreateLoyalCustomerDiscountInput } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, Percent, DollarSign } from 'lucide-react';

const loyalCustomerDiscountFormSchema = z.object({
  mobileNumber: z.string().min(5, "Mobile number must be at least 5 digits.").max(20, "Mobile number too long."),
  customerName: z.string().max(100).optional(),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.coerce.number().positive("Discount value must be positive."),
  isActive: z.boolean().default(true),
}).refine(data => {
  if (data.discountType === 'percentage' && data.discountValue > 100) {
    return false;
  }
  return true;
}, {
  message: "Percentage discount cannot exceed 100%.",
  path: ["discountValue"],
});

type LoyalCustomerDiscountFormData = z.infer<typeof loyalCustomerDiscountFormSchema>;

interface LoyalCustomerDiscountFormProps {
  initialData?: LoyalCustomerDiscount | null;
  onSubmit: (data: CreateLoyalCustomerDiscountInput | (Partial<Omit<LoyalCustomerDiscount, 'id'|'createdAt'|'updatedAt'>> & { mobileNumber?: string })) => Promise<void>;
  isSubmitting: boolean;
  onCancel?: () => void;
}

export default function LoyalCustomerDiscountForm({
  initialData,
  onSubmit,
  isSubmitting,
  onCancel
}: LoyalCustomerDiscountFormProps) {
  const form = useForm<LoyalCustomerDiscountFormData>({
    resolver: zodResolver(loyalCustomerDiscountFormSchema),
    defaultValues: {
      mobileNumber: initialData?.mobileNumber || '',
      customerName: initialData?.customerName || '',
      discountType: initialData?.discountType || 'fixed',
      discountValue: initialData?.discountValue || 0,
      isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
    },
  });

  React.useEffect(() => {
    form.reset({
      mobileNumber: initialData?.mobileNumber || '',
      customerName: initialData?.customerName || '',
      discountType: initialData?.discountType || 'fixed',
      discountValue: initialData?.discountValue || 0,
      isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
    });
  }, [initialData, form]);

  const internalFormSubmit: SubmitHandler<LoyalCustomerDiscountFormData> = async (data) => {
    await onSubmit(data);
  };

  return (
    <Card className="w-full shadow-none border-none">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(internalFormSubmit)}>
          <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto p-2 pr-4">
            <FormField
              control={form.control}
              name="mobileNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile Number *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 01711XXXXXX" {...field} disabled={isSubmitting || !!initialData} />
                  </FormControl>
                  {!!initialData && <FormDescription>Mobile number cannot be changed after creation.</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., John Doe" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="discountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="fixed"><DollarSign className="inline h-4 w-4 mr-1"/> Fixed Amount</SelectItem>
                        <SelectItem value="percentage"><Percent className="inline h-4 w-4 mr-1"/> Percentage</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="discountValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Value *</FormLabel>
                    <FormControl>
                      <Input type="number" step={form.getValues("discountType") === "percentage" ? "0.1" : "0.01"} placeholder="e.g., 10 or 5.50" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} /></FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>Uncheck to disable this loyal customer discount.</FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-end space-x-2 pt-4 sticky bottom-0 bg-background py-3 border-t">
            {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>}
            <Button type="submit" disabled={isSubmitting || !form.formState.isValid} className="bg-accent hover:bg-accent/90">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {initialData ? 'Save Changes' : 'Add Discount Rule'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
