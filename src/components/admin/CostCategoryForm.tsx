
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { CostCategory, CreateCostCategoryInput } from '@/types';
import { addCostCategoryAction, fetchCostCategoriesAction } from '@/app/actions/costActions';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Tag, ListChecks } from 'lucide-react';

const categoryFormSchema = z.object({
  name: z.string().min(2, { message: "Category name must be at least 2 characters." }).max(50, { message: "Category name must be at most 50 characters." }),
});
type CategoryFormData = z.infer<typeof categoryFormSchema>;

interface CostCategoryFormProps {
  onCategoryAdded: (newCategory: CostCategory) => void; // Callback to update parent
  initialCategories: CostCategory[];
}

export default function CostCategoryForm({ onCategoryAdded, initialCategories }: CostCategoryFormProps) {
  const [categories, setCategories] = useState<CostCategory[]>(initialCategories);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: '' },
  });

  const loadCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const fetchedCategories = await fetchCostCategoriesAction();
      setCategories(fetchedCategories);
    } catch (error) {
      toast({ title: "Error loading categories", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    // If initialCategories changes (e.g. parent refetches), update local state.
    // This component primarily manages adding, but can reflect parent's full list.
    setCategories(initialCategories);
  }, [initialCategories]);


  const onSubmit: SubmitHandler<CategoryFormData> = async (data) => {
    setIsSubmitting(true);
    try {
      const result = await addCostCategoryAction({ name: data.name });
      if (result.success && result.category) {
        toast({ title: "Category Added", description: `Category "${result.category.name}" has been added.` });
        form.reset();
        // Update local list and call parent's callback
        const newCategoriesList = [...categories, result.category].sort((a, b) => a.name.localeCompare(b.name));
        setCategories(newCategoriesList);
        onCategoryAdded(result.category);
      } else {
        throw new Error(result.error || "Failed to add category.");
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
          <Tag className="h-6 w-6 text-accent" />
          <CardTitle>Manage Cost Categories</CardTitle>
        </div>
        <CardDescription>Add new categories for your expenses.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Category Name</FormLabel>
                  <div className="flex space-x-2">
                    <FormControl>
                      <Input placeholder="e.g., Rent, Utilities, Supplies" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <Button type="submit" disabled={isSubmitting || !form.formState.isValid} className="bg-accent hover:bg-accent/90">
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                      Add
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2 flex items-center"><ListChecks className="mr-2 h-5 w-5 text-primary"/>Existing Categories</h3>
          {isLoadingCategories ? (
            <div className="flex justify-center items-center h-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No categories added yet.</p>
          ) : (
            <ScrollArea className="h-40 rounded-md border p-2 bg-muted/30">
              <ul className="space-y-1">
                {categories.map((cat) => (
                  <li key={cat.id} className="text-sm p-1.5 bg-background rounded-sm shadow-sm">
                    {cat.name}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
