
"use client";

import React, { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import type { CostCategory, CreateCostEntryInput } from '@/types';
// This action is likely being replaced by addPurchaseBillWithEntriesAction
// import { addCostEntryAction } from '@/app/actions/costActions'; 

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Loader2, PlusCircle, CalendarIcon, Landmark } from 'lucide-react';

// THIS COMPONENT IS LIKELY OBSOLETE due to the new PurchaseBillForm.
// It's kept here for reference or if a simple, single cost entry is ever needed again.
// Consider removing it if PurchaseBillForm fully replaces its functionality.

const costEntrySchema = z.object({
  date: z.date({ required_error: "Cost date is required." }),
  categoryId: z.string().min(1, { message: "Please select a category." }),
  // itemName: z.string().min(2, { message: "Item name must be at least 2 characters." }).max(100, { message: "Item name must be at most 100 characters." }),
  // Replacing itemName with purchaseItemId and purchaseItemName from the new flow
  purchaseItemId: z.string().min(1, "Please select a purchase item."),
  amount: z.coerce.number().positive({ message: "Amount must be a positive number." }),
});

type CostEntryFormData = z.infer<typeof costEntrySchema>;

interface CostEntryFormProps {
  categories: CostCategory[];
  onCostEntryAdded: (entry: any) => void; // Callback after adding an entry
}

export default function CostEntryForm({ categories, onCostEntryAdded }: CostEntryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CostEntryFormData>({
    resolver: zodResolver(costEntrySchema),
    defaultValues: {
      date: new Date(),
      categoryId: '',
      // itemName: '',
      purchaseItemId: '',
      amount: 0,
    },
  });

  const onSubmit: SubmitHandler<CostEntryFormData> = async (data) => {
    setIsSubmitting(true);
    // This logic would need to be updated significantly if this form is reused.
    // It currently doesn't align with the new PurchaseItem and PurchaseBill flow.
    toast({ title: "Form Obsolete", description: "This form is not used in the current bill-based costing flow.", variant: "destructive" });
    setIsSubmitting(false);
    return;


    // const selectedCategory = categories.find(cat => cat.id === data.categoryId);
    // if (!selectedCategory) {
    //   toast({ title: "Error", description: "Selected category not found.", variant: "destructive" });
    //   setIsSubmitting(false);
    //   return;
    // }

    // const entryData: CreateCostEntryInput = {
    //   ...data, // This spread needs to be carefully considered with new types
    //   categoryName: selectedCategory.name, // This would come from PurchaseItem now
    //   purchaseItemName: "N/A (Old Form)", // Placeholder
    //   purchaseBillId: "N/A (Old Form)", // Placeholder
    //   date: data.date.toISOString(), // Send as ISO string
    // };

    // try {
    //   // const result = await addCostEntryAction(entryData); // OLD ACTION
    //   // if (result.success && result.entry) {
    //   //   toast({ title: "Cost Entry Added", description: `Entry "${result.entry.purchaseItemName}" for $${result.entry.amount.toFixed(2)} added.` });
    //   //   form.reset({ date: new Date(), categoryId: '', purchaseItemId: '', amount: 0 }); // Reset form
    //   //   onCostEntryAdded(result.entry);
    //   // } else {
    //   //   throw new Error(result.error || "Failed to add cost entry.");
    //   // }
    // } catch (error) {
    //   toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    // } finally {
    //   setIsSubmitting(false);
    // }
  };

  return (
    <Card className="shadow-lg hidden"> {/* Hidden by default as it's likely obsolete */}
      <CardHeader>
         <div className="flex items-center space-x-2">
          <Landmark className="h-6 w-6 text-accent" />
          <CardTitle>Add New Cost Entry (Legacy)</CardTitle>
        </div>
        <CardDescription>This form is for single cost entries and may be obsolete.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Cost Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={isSubmitting}
                        >
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date() || date < new Date("1900-01-01") || isSubmitting}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.length === 0 && <SelectItem value="-" disabled>No categories available</SelectItem>}
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* This would need to change to select a PurchaseItem */}
            <FormField
              control={form.control}
              name="purchaseItemId" 
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purchase Item (Legacy - Needs Update)</FormLabel>
                  <FormControl>
                    <Input placeholder="Select or type item (Legacy)" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount ($)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="e.g., 75.50" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting || !form.formState.isValid} className="w-full bg-accent hover:bg-accent/90">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              Add Cost Entry (Legacy)
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
