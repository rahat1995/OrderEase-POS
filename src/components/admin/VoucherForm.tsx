
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Voucher, CreateVoucherInput } from '@/types';
import { format, parseISO } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, CalendarIcon, Percent, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

const voucherFormSchema = z.object({
  code: z.string().min(3, "Code must be at least 3 characters.").max(50),
  description: z.string().max(255).optional(),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.coerce.number().positive("Discount value must be positive."),
  minOrderAmount: z.coerce.number().min(0).optional().nullable(),
  validFrom: z.date().optional().nullable(),
  validUntil: z.date().optional().nullable(),
  isActive: z.boolean().default(true),
  usageLimit: z.coerce.number().int().min(0).optional().nullable(),
}).refine(data => {
  if (data.discountType === 'percentage' && data.discountValue > 100) {
    return false;
  }
  return true;
}, {
  message: "Percentage discount cannot exceed 100%.",
  path: ["discountValue"],
}).refine(data => {
    if (data.validFrom && data.validUntil && data.validFrom > data.validUntil) {
        return false;
    }
    return true;
}, {
    message: "Valid 'From' date cannot be after 'Until' date.",
    path: ["validUntil"],
});

type VoucherFormData = z.infer<typeof voucherFormSchema>;

interface VoucherFormProps {
  initialData?: Voucher | null;
  onSubmit: (data: CreateVoucherInput) => Promise<void>;
  isSubmitting: boolean;
  onCancel?: () => void;
}

export default function VoucherForm({ initialData, onSubmit, isSubmitting, onCancel }: VoucherFormProps) {
  const form = useForm<VoucherFormData>({
    resolver: zodResolver(voucherFormSchema),
    defaultValues: {
      code: initialData?.code || '',
      description: initialData?.description || '',
      discountType: initialData?.discountType || 'fixed',
      discountValue: initialData?.discountValue || 0,
      minOrderAmount: initialData?.minOrderAmount ?? null,
      validFrom: initialData?.validFrom ? parseISO(initialData.validFrom) : null,
      validUntil: initialData?.validUntil ? parseISO(initialData.validUntil) : null,
      isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
      usageLimit: initialData?.usageLimit ?? null,
    },
  });

  useEffect(() => {
    form.reset({
      code: initialData?.code || '',
      description: initialData?.description || '',
      discountType: initialData?.discountType || 'fixed',
      discountValue: initialData?.discountValue || 0,
      minOrderAmount: initialData?.minOrderAmount ?? null,
      validFrom: initialData?.validFrom ? parseISO(initialData.validFrom) : null,
      validUntil: initialData?.validUntil ? parseISO(initialData.validUntil) : null,
      isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
      usageLimit: initialData?.usageLimit ?? null,
    });
  }, [initialData, form]);

  const internalFormSubmit: SubmitHandler<VoucherFormData> = async (data) => {
    const submitData: CreateVoucherInput = {
        ...data,
        discountValue: Number(data.discountValue),
        minOrderAmount: data.minOrderAmount ? Number(data.minOrderAmount) : undefined,
        validFrom: data.validFrom ? data.validFrom.toISOString() : undefined,
        validUntil: data.validUntil ? data.validUntil.toISOString() : undefined,
        usageLimit: data.usageLimit ? Number(data.usageLimit) : undefined,
    };
    await onSubmit(submitData);
  };

  return (
    <Card className="w-full shadow-none border-none">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(internalFormSubmit)}>
          <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto p-2 pr-4">
            <FormField control={form.control} name="code" render={({ field }) => ( <FormItem> <FormLabel>Voucher Code *</FormLabel> <FormControl><Input placeholder="e.g., SUMMER20OFF" {...field} disabled={isSubmitting} /></FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={form.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description (Optional)</FormLabel> <FormControl><Textarea placeholder="e.g., Summer promotion for all items" {...field} rows={2} disabled={isSubmitting} /></FormControl> <FormMessage /> </FormItem> )}/>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="discountType" render={({ field }) => (
                  <FormItem> <FormLabel>Discount Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select discount type" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="fixed"><DollarSign className="inline h-4 w-4 mr-1"/> Fixed Amount</SelectItem>
                        <SelectItem value="percentage"><Percent className="inline h-4 w-4 mr-1"/> Percentage</SelectItem>
                      </SelectContent>
                    </Select> <FormMessage />
                  </FormItem> )}/>
              <FormField control={form.control} name="discountValue" render={({ field }) => ( <FormItem> <FormLabel>Discount Value *</FormLabel> <FormControl><Input type="number" step={form.getValues("discountType") === "percentage" ? "0.1" : "0.01"} placeholder="e.g., 10 or 15.50" {...field} disabled={isSubmitting} /></FormControl> <FormMessage /> </FormItem> )}/>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField control={form.control} name="minOrderAmount" render={({ field }) => ( <FormItem> <FormLabel>Min. Order Amount (Optional)</FormLabel> <FormControl><Input type="number" step="0.01" placeholder="e.g., 50.00" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : parseFloat(e.target.value))} disabled={isSubmitting} /></FormControl><FormDescription>Leave blank if no minimum.</FormDescription> <FormMessage /> </FormItem> )}/>
                 <FormField control={form.control} name="usageLimit" render={({ field }) => ( <FormItem> <FormLabel>Global Usage Limit (Optional)</FormLabel> <FormControl><Input type="number" step="1" placeholder="e.g., 100" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value, 10))} disabled={isSubmitting} /></FormControl><FormDescription>Total times this voucher can be used. Leave blank for unlimited.</FormDescription> <FormMessage /> </FormItem> )}/>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField control={form.control} name="validFrom" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Valid From (Optional)</FormLabel>
                    <Popover>
                      <FormControl>
                        <PopoverTrigger asChild>
                          <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={isSubmitting}>
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                      </FormControl>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} disabled={isSubmitting} initialFocus/>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem> 
                )}/>
                <FormField control={form.control} name="validUntil" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Valid Until (Optional)</FormLabel>
                    <Popover>
                      <FormControl>
                        <PopoverTrigger asChild>
                          <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={isSubmitting}>
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                      </FormControl>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} disabled={(date) => (field.value && field.value > date) || isSubmitting } initialFocus/>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}/>
            </div>
             <FormField control={form.control} name="isActive" render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} /></FormControl>
                    <div className="space-y-1 leading-none"> <FormLabel>Active</FormLabel> <FormDescription>Uncheck to disable this voucher temporarily.</FormDescription></div>
                </FormItem> )}/>
          </CardContent>
          <CardFooter className="flex justify-end space-x-2 pt-4 sticky bottom-0 bg-background py-3 border-t">
            {onCancel && ( <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}> Cancel </Button> )}
            <Button type="submit" disabled={isSubmitting || !form.formState.isValid } className="bg-accent hover:bg-accent/90">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null }
              {initialData ? 'Save Changes' : 'Add Voucher'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
