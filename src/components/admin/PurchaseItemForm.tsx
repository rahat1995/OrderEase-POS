
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { PurchaseItem, CreatePurchaseItemInput, CostCategory } from '@/types';
import { addPurchaseItemAction } from '@/app/actions/costActions';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Package, ListChecks, ScanBarcode } from 'lucide-react';

const purchaseItemFormSchema = z.object({
  name: z.string().min(2, { message: "Item name must be at least 2 characters." }).max(100, { message: "Item name must be max 100 characters." }),
  categoryId: z.string().min(1, { message: "Please select a category." }),
  code: z.string()
    .max(30, { message: "Code must be at most 30 characters." })
    .optional()
    .transform(val => val?.trim() === '' ? undefined : val?.trim().toUpperCase()), // Trim, convert to uppercase, and treat empty as undefined
});
type PurchaseItemFormData = z.infer<typeof purchaseItemFormSchema>;

interface PurchaseItemFormProps {
  costCategories: CostCategory[];
  onPurchaseItemAdded: (newItem: PurchaseItem) => void;
  initialPurchaseItems: PurchaseItem[];
}

export default function PurchaseItemForm({ costCategories, onPurchaseItemAdded, initialPurchaseItems }: PurchaseItemFormProps) {
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>(initialPurchaseItems);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  const form = useForm<PurchaseItemFormData>({
    resolver: zodResolver(purchaseItemFormSchema),
    defaultValues: { name: '', categoryId: '', code: '' },
  });

   useEffect(() => {
    setPurchaseItems(initialPurchaseItems.sort((a, b) => (a.code || '').localeCompare(b.code || '') || a.name.localeCompare(b.name)));
  }, [initialPurchaseItems]);

  const onSubmit: SubmitHandler<PurchaseItemFormData> = async (data) => {
    setIsSubmitting(true);
    const selectedCategory = costCategories.find(cat => cat.id === data.categoryId);
    if (!selectedCategory) {
      toast({ title: "Error", description: "Selected category not found.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    const itemData: CreatePurchaseItemInput = {
      name: data.name,
      categoryId: selectedCategory.id,
      categoryName: selectedCategory.name,
      code: data.code || undefined, // Ensure undefined is passed if empty
    };

    try {
      const result = await addPurchaseItemAction(itemData);
      if (result.success && result.item) {
        toast({ title: "Purchase Item Added", description: `Item "${result.item.name}" has been added.` });
        form.reset({ name: '', categoryId: data.categoryId, code: '' }); // Keep category selected
        const newItemsList = [...purchaseItems, result.item].sort((a,b) => (a.code || '').localeCompare(b.code || '') || a.name.localeCompare(b.name));
        setPurchaseItems(newItemsList);
        onPurchaseItemAdded(result.item);
      } else {
        throw new Error(result.error || "Failed to add purchase item.");
      }
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Package className="h-6 w-6 text-accent" />
          <CardTitle>Manage Purchase Items</CardTitle>
        </div>
        <CardDescription>Define items you regularly purchase. Item codes should be unique.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost Category *</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value} // Controlled component
                    disabled={isSubmitting || costCategories.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category for the item" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {costCategories.length === 0 && <SelectItem value="-" disabled>No cost categories available. Add one first.</SelectItem>}
                      {costCategories.map((cat) => (
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
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Purchase Item Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Flour 25kg, Tomatoes Box" {...field} disabled={isSubmitting} />
                    </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><ScanBarcode className="mr-1.5 h-4 w-4 text-muted-foreground"/>Item Code (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., SKU123, FLR001 (max 30 chars, unique)" {...field} disabled={isSubmitting} />
                    </FormControl>
                   <FormDescription>A unique code for this item (e.g., SKU). Will be converted to uppercase.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSubmitting || !form.formState.isValid} className="w-full bg-accent hover:bg-accent/90">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                Add Item
            </Button>
          </form>
        </Form>
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2 flex items-center"><ListChecks className="mr-2 h-5 w-5 text-primary"/>Existing Purchase Items</h3>
           {isLoadingItems ? (
            <div className="flex justify-center items-center h-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : purchaseItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No purchase items added yet.</p>
          ) : (
            <ScrollArea className="h-48 rounded-md border p-0 bg-muted/30">
              <Table size="sm">
                <TableHeader className="sticky top-0 bg-background/80 backdrop-blur-sm z-10">
                  <TableRow>
                    <TableHead className="w-[100px]">Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {purchaseItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs p-1.5">{item.code || 'N/A'}</TableCell>
                    <TableCell className="font-medium p-1.5">{item.name}</TableCell>
                    <TableCell className="p-1.5 text-xs">{item.categoryName}</TableCell>
                  </TableRow>
                ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
