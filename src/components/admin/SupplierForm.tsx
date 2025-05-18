
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Supplier, CreateSupplierInput } from '@/types';
import { addSupplierAction } from '@/app/actions/supplierActions';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Users, ListChecks } from 'lucide-react';

const supplierFormSchema = z.object({
  name: z.string().min(2, "Supplier name must be at least 2 characters.").max(100),
  address: z.string().max(200).optional(),
  mobile: z.string().max(20).optional(),
  contactPerson: z.string().max(100).optional(),
  email: z.string().email({ message: "Invalid email address." }).max(100).optional().or(z.literal('')),
});
type SupplierFormData = z.infer<typeof supplierFormSchema>;

interface SupplierFormProps {
  onSupplierAdded: (newSupplier: Supplier) => void;
  initialSuppliers: Supplier[];
}

export default function SupplierForm({ onSupplierAdded, initialSuppliers }: SupplierFormProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: { name: '', address: '', mobile: '', contactPerson: '', email: '' },
  });

   useEffect(() => {
    setSuppliers(initialSuppliers.sort((a, b) => a.name.localeCompare(b.name)));
  }, [initialSuppliers]);

  const onSubmit: SubmitHandler<SupplierFormData> = async (data) => {
    setIsSubmitting(true);
    const supplierData: CreateSupplierInput = {
      name: data.name,
      address: data.address || undefined,
      mobile: data.mobile || undefined,
      contactPerson: data.contactPerson || undefined,
      email: data.email || undefined,
    };

    try {
      const result = await addSupplierAction(supplierData);
      if (result.success && result.supplier) {
        toast({ title: "Supplier Added", description: `Supplier "${result.supplier.name}" has been added.` });
        form.reset();
        const newSuppliersList = [...suppliers, result.supplier].sort((a,b) => a.name.localeCompare(b.name));
        setSuppliers(newSuppliersList);
        onSupplierAdded(result.supplier);
      } else {
        throw new Error(result.error || "Failed to add supplier.");
      }
    } catch (error) {
      toast({ title: "Error Adding Supplier", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Users className="h-6 w-6 text-accent" />
          <CardTitle>Manage Suppliers</CardTitle>
        </div>
        <CardDescription>Add new suppliers or view existing ones.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Supplier Name *</FormLabel> <FormControl><Input placeholder="e.g., City Wholesale Foods" {...field} disabled={isSubmitting} /></FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={form.control} name="contactPerson" render={({ field }) => ( <FormItem> <FormLabel>Contact Person</FormLabel> <FormControl><Input placeholder="Optional" {...field} disabled={isSubmitting} /></FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={form.control} name="mobile" render={({ field }) => ( <FormItem> <FormLabel>Mobile Number</FormLabel> <FormControl><Input placeholder="Optional" {...field} disabled={isSubmitting} /></FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={form.control} name="email" render={({ field }) => ( <FormItem> <FormLabel>Email</FormLabel> <FormControl><Input type="email" placeholder="Optional, e.g., sales@supplier.com" {...field} disabled={isSubmitting} /></FormControl> <FormMessage /> </FormItem> )}/>
            <FormField control={form.control} name="address" render={({ field }) => ( <FormItem> <FormLabel>Address</FormLabel> <FormControl><Textarea placeholder="Optional" {...field} rows={2} disabled={isSubmitting} /></FormControl> <FormMessage /> </FormItem> )}/>
            
            <Button type="submit" disabled={isSubmitting || !form.formState.isValid} className="w-full bg-accent hover:bg-accent/90">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                Add Supplier
            </Button>
          </form>
        </Form>
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2 flex items-center"><ListChecks className="mr-2 h-5 w-5 text-primary"/>Existing Suppliers</h3>
           {suppliers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No suppliers added yet.</p>
          ) : (
            <ScrollArea className="h-48 rounded-md border p-0 bg-muted/30">
              <Table size="sm">
                <TableHeader className="sticky top-0 bg-background/80 backdrop-blur-sm z-10">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Mobile</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium p-1.5">{supplier.name}</TableCell>
                    <TableCell className="p-1.5 text-xs">{supplier.contactPerson || 'N/A'}</TableCell>
                    <TableCell className="p-1.5 text-xs">{supplier.mobile || 'N/A'}</TableCell>
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
