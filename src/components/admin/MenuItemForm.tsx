
"use client";

import React, { useState, useEffect, type ChangeEvent } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { MenuItem, CreateMenuItemInput } from '@/types';
import { uploadImageAction, deleteImageAction } from '@/app/actions/storageActions';

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
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, UploadCloud, XCircle, Image as ImageIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Schema for form fields excluding the image file itself
const menuItemFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  price: z.coerce.number().min(0, { message: "Price must be a positive number." }),
  dataAiHint: z.string().max(50, "AI Hint should be max 50 characters").optional(),
});

type MenuItemFormData = z.infer<typeof menuItemFormSchema>;

interface MenuItemFormProps {
  initialData?: MenuItem | null;
  onSubmit: (data: CreateMenuItemInput) => Promise<void>; // Parent's submit function
  isSubmitting: boolean; // Controlled by parent for overall dialog state
  onCancel?: () => void;
}

export default function MenuItemForm({ initialData, onSubmit, isSubmitting: isParentSubmitting, onCancel }: MenuItemFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imageUrl || null);
  const [isUploading, setIsUploading] = useState(false); // Internal submitting state for image upload + form submission
  const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>(initialData?.imageUrl);

  const form = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      price: initialData?.price || 0,
      dataAiHint: initialData?.dataAiHint || '',
    },
  });

  useEffect(() => {
    form.reset({
      name: initialData?.name || '',
      price: initialData?.price || 0,
      dataAiHint: initialData?.dataAiHint || '',
    });
    setImagePreview(initialData?.imageUrl || null);
    setCurrentImageUrl(initialData?.imageUrl);
    setSelectedFile(null); // Clear selected file when initialData changes
  }, [initialData, form]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      // If no file is selected (e.g., user cancels file dialog),
      // revert to initial image if editing, or null if new.
      setSelectedFile(null);
      setImagePreview(initialData?.imageUrl || null);
    }
  };

  const removeImage = () => {
    setSelectedFile(null);
    setImagePreview(null); 
    // For existing items, this means the image might be removed on save
    // if no new image is uploaded and initialData.imageUrl existed.
    // The actual deletion from storage will happen on submit if needed.
  };

  const internalFormSubmit: SubmitHandler<MenuItemFormData> = async (data) => {
    setIsUploading(true);
    let finalImageUrl = currentImageUrl; // Start with existing or undefined

    try {
      if (selectedFile) { // New image selected for upload
        // If there was an old image for an existing item, delete it from storage
        if (initialData && initialData.id && currentImageUrl && currentImageUrl !== imagePreview) {
           // Only delete if preview (new file) is different from current (old db) image
          const deleteResult = await deleteImageAction(currentImageUrl);
          if (!deleteResult.success) {
            toast({ title: "Warning", description: `Could not delete old image: ${deleteResult.error}`, variant: "destructive" });
            // Continue with upload and update despite old image deletion failure
          } else {
            console.log("Old image deleted successfully from storage.");
          }
        }

        const formData = new FormData();
        formData.append('imageFile', selectedFile);
        const uploadResult = await uploadImageAction(formData);

        if (uploadResult.success && uploadResult.imageUrl) {
          finalImageUrl = uploadResult.imageUrl;
        } else {
          throw new Error(uploadResult.error || "Image upload failed.");
        }
      } else if (!imagePreview && initialData && initialData.imageUrl) {
        // Image was removed by user (imagePreview is null), and there was an initial image.
        // This means we need to delete the existing image from storage.
        const deleteResult = await deleteImageAction(initialData.imageUrl);
        if (!deleteResult.success) {
           toast({ title: "Warning", description: `Could not delete image: ${deleteResult.error}`, variant: "destructive" });
        } else {
          console.log("Image explicitly removed and deleted from storage.");
        }
        finalImageUrl = `https://placehold.co/300x200.png?text=${encodeURIComponent(data.name || 'Item Removed')}`; // Set to placeholder
      }


      const submitData: CreateMenuItemInput = {
        ...data,
        price: Number(data.price), // Ensure price is number
        imageUrl: finalImageUrl || `https://placehold.co/300x200.png?text=${encodeURIComponent(data.name || 'Item')}`,
        dataAiHint: data.dataAiHint || '',
      };
      
      await onSubmit(submitData); // Call parent's submit function

    } catch (error) {
      toast({ title: "Submission Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };
  
  const combinedSubmitting = isParentSubmitting || isUploading;

  return (
    <Card className="w-full shadow-none border-none">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(internalFormSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Margherita Pizza" {...field} disabled={combinedSubmitting} />
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
                    <Input type="number" step="0.01" placeholder="e.g., 12.99" {...field} disabled={combinedSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormItem>
              <FormLabel>Image</FormLabel>
              <FormControl>
                <Input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  disabled={combinedSubmitting}
                />
              </FormControl>
              {imagePreview && (
                <div className="mt-2 relative w-48 h-32 border rounded-md overflow-hidden group">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-1 right-1 bg-black/50 text-white hover:bg-red-500/70 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={removeImage}
                    disabled={combinedSubmitting}
                    aria-label="Remove image"
                  >
                    <XCircle className="h-5 w-5" />
                  </Button>
                </div>
              )}
              {!imagePreview && (
                <div className="mt-2 w-48 h-32 border rounded-md flex flex-col items-center justify-center bg-muted/50 text-muted-foreground">
                  <ImageIcon className="h-10 w-10 mb-1" />
                  <p className="text-xs">No image selected</p>
                </div>
              )}
              <FormDescription>Upload an image for the menu item. (Max 2MB recommended)</FormDescription>
              <FormMessage />
            </FormItem>

            <FormField
              control={form.control}
              name="dataAiHint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AI Hint (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., pizza cheese" {...field} rows={2} disabled={combinedSubmitting} />
                  </FormControl>
                  <FormDescription>Keywords for AI image search (max 2 words, e.g., "classic burger").</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-end space-x-2 pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={combinedSubmitting}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={combinedSubmitting} className="bg-accent hover:bg-accent/90">
              {combinedSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (initialData ? null : <UploadCloud className="mr-2 h-4 w-4" />) }
              {isUploading ? 'Processing...' : (initialData ? 'Save Changes' : 'Add Item')}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
