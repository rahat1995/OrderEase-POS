
"use client";

import React, { useState } from 'react';
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import type { CostCategory, PurchaseItem, PurchaseBill, CostEntry, Supplier } from '@/types';
import { addPurchaseBillWithEntriesAction } from '@/app/actions/costActions';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Loader2, PlusCircle, CalendarIcon, ReceiptText, PackagePlus, Trash2, FileText, Users } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const costEntryItemSchema = z.object({
  purchaseItemId: z.string().min(1, "Purchase item is required."),
  purchaseItemName: z.string(),
  purchaseItemCode: z.string().optional(),
  categoryId: z.string(),
  categoryName: z.string(),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
});

const purchaseBillFormSchema = z.object({
  billDate: z.date({ required_error: "Bill date is required." }),
  supplierId: z.string().optional(),
  billNumber: z.string().max(50).optional(),
  purchaseOrderNumber: z.string().max(50).optional(),
  items: z.array(costEntryItemSchema).min(1, { message: "Please add at least one item to the bill." }),
});

type PurchaseBillFormData = z.infer<typeof purchaseBillFormSchema>;

interface PurchaseBillFormProps {
  costCategories: CostCategory[];
  purchaseItems: PurchaseItem[];
  suppliers: Supplier[];
  onBillAdded: (bill: PurchaseBill, entries: CostEntry[]) => void;
}

const NO_SUPPLIER_VALUE = "_direct_expense_";

export default function PurchaseBillForm({ costCategories, purchaseItems, suppliers, onBillAdded }: PurchaseBillFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [currentItemId, setCurrentItemId] = useState('');
  const [currentItemAmount, setCurrentItemAmount] = useState('');

  const form = useForm<PurchaseBillFormData>({
    resolver: zodResolver(purchaseBillFormSchema),
    defaultValues: {
      billDate: new Date(),
      supplierId: NO_SUPPLIER_VALUE, // Default to "No Supplier"
      billNumber: '',
      purchaseOrderNumber: '',
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const filteredPurchaseItems = purchaseItems.filter(item => item.categoryId === selectedCategoryId);

  const handleAddItemToBill = () => {
    if (!currentItemId || !currentItemAmount) {
      toast({ title: "Missing Item Info", description: "Please select an item and enter an amount.", variant: "destructive" });
      return;
    }
    const amount = parseFloat(currentItemAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid positive amount.", variant: "destructive" });
      return;
    }

    const selectedPurchaseItem = purchaseItems.find(pi => pi.id === currentItemId);
    if (!selectedPurchaseItem) {
       toast({ title: "Item not found", description: "Selected purchase item is invalid.", variant: "destructive" });
      return;
    }

    append({
      purchaseItemId: selectedPurchaseItem.id,
      purchaseItemName: selectedPurchaseItem.name,
      purchaseItemCode: selectedPurchaseItem.code,
      categoryId: selectedPurchaseItem.categoryId,
      categoryName: selectedPurchaseItem.categoryName,
      amount: amount,
    });

    // Reset item input fields, but keep category if more items from same category are expected
    // setSelectedCategoryId(''); // Optional: reset category or keep it
    setCurrentItemId('');
    setCurrentItemAmount('');
    // Focus back on item selection or amount for faster entry? (Advanced)
  };

  const onSubmit: SubmitHandler<PurchaseBillFormData> = async (data) => {
    setIsSubmitting(true);

    let finalSupplierId: string | undefined = undefined;
    let finalSupplierName: string | undefined = undefined;

    if (data.supplierId && data.supplierId !== NO_SUPPLIER_VALUE) {
        const selectedSupplier = suppliers.find(s => s.id === data.supplierId);
        if (selectedSupplier) {
            finalSupplierId = selectedSupplier.id;
            finalSupplierName = selectedSupplier.name;
        }
    }

    const billDetails = {
      billDate: data.billDate.toISOString(),
      supplierId: finalSupplierId,
      supplierName: finalSupplierName,
      billNumber: data.billNumber?.trim() || undefined,
      purchaseOrderNumber: data.purchaseOrderNumber?.trim() || undefined,
    };

    const itemsForAction = data.items.map(item => ({
      purchaseItemId: item.purchaseItemId,
      purchaseItemName: item.purchaseItemName,
      purchaseItemCode: item.purchaseItemCode,
      amount: item.amount,
      categoryId: item.categoryId,
      categoryName: item.categoryName,
    }));

    try {
      const result = await addPurchaseBillWithEntriesAction(billDetails, itemsForAction);
      if (result.success && result.purchaseBill && result.costEntries) {
        toast({ title: "Purchase Bill Added", description: `Bill with ${result.costEntries.length} items saved.` });
        form.reset({
          billDate: new Date(),
          supplierId: NO_SUPPLIER_VALUE,
          billNumber: '',
          purchaseOrderNumber: '',
          items: [],
        });
        setSelectedCategoryId('');
        setCurrentItemId('');
        setCurrentItemAmount('');
        onBillAdded(result.purchaseBill, result.costEntries);
      } else {
        throw new Error(result.error || "Failed to add purchase bill.");
      }
    } catch (error) {
      toast({ title: "Error Adding Bill", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-lg col-span-1 md:col-span-2">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <ReceiptText className="h-7 w-7 text-accent" />
          <CardTitle className="text-xl">Enter New Purchase Bill</CardTitle>
        </div>
        <CardDescription>Record supplier bills and their individual item costs. Select a supplier or choose direct expense.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="billDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Bill Date *</FormLabel>
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
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || isSubmitting} initialFocus/>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Users className="mr-1.5 h-4 w-4 text-muted-foreground"/>Supplier</FormLabel>
                    <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select supplier or direct expense" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_SUPPLIER_VALUE}>No Supplier (Direct Expense)</SelectItem>
                        {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="billNumber" render={({ field }) => (<FormItem><FormLabel>Bill/Invoice Number</FormLabel><FormControl><Input placeholder="Optional" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="purchaseOrderNumber" render={({ field }) => (<FormItem><FormLabel>PO Number</FormLabel><FormControl><Input placeholder="Optional" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
            </div>

            <Card className="pt-4 border-dashed">
              <CardHeader className="p-2 pt-0">
                <CardTitle className="text-lg flex items-center"><PackagePlus className="mr-2 h-5 w-5 text-primary"/>Add Items to Bill</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-2">
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={(value) => {setSelectedCategoryId(value); setCurrentItemId('');}} value={selectedCategoryId} disabled={isSubmitting || costCategories.length === 0}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {costCategories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                    <FormItem>
                      <FormLabel>Purchase Item *</FormLabel>
                      <Select
                        key={`item-select-${selectedCategoryId}`}
                        onValueChange={(value) => setCurrentItemId(value)}
                        value={currentItemId}
                        disabled={isSubmitting || !selectedCategoryId || filteredPurchaseItems.length === 0}
                      >
                        <FormControl><SelectTrigger><SelectValue placeholder="Select Item" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {filteredPurchaseItems.length === 0 && <SelectItem value="-" disabled>{selectedCategoryId ? "No items in category" : "Select category first"}</SelectItem>}
                          {filteredPurchaseItems.map(item => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.code ? `[${item.code}] ` : ''}{item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                    <FormItem>
                      <FormLabel>Amount ($) *</FormLabel>
                      <Input type="number" step="0.01" placeholder="e.g., 50.25" value={currentItemAmount} onChange={(e) => setCurrentItemAmount(e.target.value)} disabled={isSubmitting} />
                    </FormItem>
                    <Button type="button" onClick={handleAddItemToBill} disabled={isSubmitting || !currentItemId || !currentItemAmount} className="w-full sm:w-auto self-end">
                      <PlusCircle className="mr-2 h-4 w-4"/>Add to Bill
                    </Button>
                 </div>
              </CardContent>
            </Card>

            {fields.length > 0 && (
              <div className="mt-4">
                <h4 className="text-md font-medium mb-2 flex items-center"><FileText className="mr-2 h-5 w-5 text-primary"/>Items in Current Bill</h4>
                <ScrollArea className="h-40 border rounded-md">
                  <Table>
                    <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="w-[50px]">Action</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {fields.map((field, index) => (
                        <TableRow key={field.id}>
                          <TableCell>{field.purchaseItemCode ? `[${field.purchaseItemCode}] ` : ''}{field.purchaseItemName}</TableCell>
                          <TableCell>{field.categoryName}</TableCell>
                          <TableCell className="text-right">${field.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={isSubmitting} className="text-destructive hover:text-destructive/80 h-7 w-7">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
                 <p className="text-right mt-2 font-semibold">
                    Total Bill Amount: ${form.getValues('items').reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
                 </p>
              </div>
            )}
             <FormField
                control={form.control}
                name="items"
                render={() => <FormMessage />} // For displaying array-level errors if any
              />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting || !form.formState.isValid || fields.length === 0} className="w-full bg-accent hover:bg-accent/90">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              Save Purchase Bill
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
