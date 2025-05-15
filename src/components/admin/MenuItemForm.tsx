
"use client";

import React from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { MenuItem, CreateMenuItemInput } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardFooter } from '@/components/ui/card'; // Removed CardHeader, CardTitle
import { Loader2 } from 'lucide-react';

const menuItemSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  price: z.coerce.number().min(0, { message: "Price must be a positive number." }),
  imageUrl: z.string().url({ message: "Please enter a valid URL." }).or(z.literal('')), // Allow empty string for optional image
  dataAiHint: z.string().optional(),
});

type MenuItemFormData = z.infer<typeof menuItemSchema>;

interface MenuItemFormProps {
  initialData?: MenuItem | null;
  onSubmit: (data: CreateMenuItemInput) => Promise<void>;
  isSubmitting: boolean;
  onCancel?: () => void;
}

export default function MenuItemForm({ initialData, onSubmit, isSubmitting, onCancel }: MenuItemFormProps) {
  const form = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name: initialData?.name || '',
      price: initialData?.price || 0,
      imageUrl: initialData?.imageUrl || '',
      dataAiHint: initialData?.dataAiHint || '',
    },
  });

  // Reset form when initialData changes (e.g., switching from "Add New" to "Edit" or vice-versa)
  React.useEffect(() => {
    form.reset({
      name: initialData?.name || '',
      price: initialData?.price || 0,
      imageUrl: initialData?.imageUrl || '',
      dataAiHint: initialData?.dataAiHint || '',
    });
  }, [initialData, form]);


  const handleFormSubmit: SubmitHandler<MenuItemFormData> = async (data) => {
    const submitData: CreateMenuItemInput = { 
      ...data,
      // Ensure imageUrl is a valid URL or a placeholder if empty
      imageUrl: data.imageUrl || `https://placehold.co/300x200.png?text=${encodeURIComponent(data.name || 'Item')}`,
    };
    if (initialData?.id) {
      await onSubmit(submitData);
    } else {
      await onSubmit(submitData);
    }
  };

  return (
    // The DialogContent provides the card-like shell and title.
    // This Card is now mainly for structuring FormContent and FormFooter.
    <Card className="w-full shadow-none border-none">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)}>
          {/* CardContent by default has p-6 pt-0. DialogContent's grid provides gap. */}
          <CardContent className="space-y-4"> {/* Reduced space-y from 6 to 4 for compactness */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Margherita Pizza" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price ($)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="e.g., 12.99" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://placehold.co/300x200.png" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormDescription>Leave blank to use a default placeholder.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dataAiHint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AI Hint (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., pizza cheese" {...field} rows={2} disabled={isSubmitting} />
                  </FormControl>
                  <FormDescription>Keywords for AI image search (max 2 words).</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-end space-x-2 pt-4"> {/* Reduced pt from 6 to 4 */}
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting} className="bg-accent hover:bg-accent/90">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {initialData ? 'Save Changes' : 'Add Item'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

