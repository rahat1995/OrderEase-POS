
"use client";

import React, { useState, useEffect, type ChangeEvent } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { RestaurantProfile, UpdateRestaurantProfileInput } from '@/types';
import Image from 'next/image';

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
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription as FormCardDescription } from '@/components/ui/card';
import { Loader2, UploadCloud, XCircle, Image as ImageIcon, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const profileFormSchema = z.object({
  name: z.string().min(2, "Restaurant name must be at least 2 characters.").max(100),
  address: z.string().max(255).optional(),
  contactNumber: z.string().max(30).optional(),
  // logoUrl is handled separately with file upload, not directly in Zod schema for form data
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

interface RestaurantProfileFormProps {
  initialData: RestaurantProfile | null;
  onSubmit: (data: UpdateRestaurantProfileInput, newLogoFile?: File) => Promise<{success: boolean, error?: string, profile?: RestaurantProfile}>;
}

export default function RestaurantProfileForm({ initialData, onSubmit }: RestaurantProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(initialData?.logoUrl || null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      address: initialData?.address || '',
      contactNumber: initialData?.contactNumber || '',
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name || '',
        address: initialData.address || '',
        contactNumber: initialData.contactNumber || '',
      });
      setLogoPreview(initialData.logoUrl || null);
    }
    setSelectedLogoFile(null); // Clear selected file on initialData change
  }, [initialData, form]);

  const handleLogoFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      // If file selection is cancelled, revert based on if a new file was previously selected or not
      setSelectedLogoFile(null);
      setLogoPreview(initialData?.logoUrl || null); // Revert to initial or null
    }
  };

  const removeLogo = () => {
    setSelectedLogoFile(null);
    setLogoPreview(null); // User wants to remove the image
    // The actual deletion from storage will happen on submit if logoPreview was from initialData.logoUrl
  };

  const internalFormSubmit: SubmitHandler<ProfileFormData> = async (formData) => {
    setIsSubmitting(true);
    
    const profileUpdateData: UpdateRestaurantProfileInput = {
        ...formData,
    };

    // If logoPreview is null and there was an initialData.logoUrl, it means the user removed the logo.
    // We signal this to the server action by explicitly setting logoUrl to an empty string.
    if (logoPreview === null && initialData?.logoUrl) {
      profileUpdateData.logoUrl = '';
    } else if (selectedLogoFile) {
      // A new file is selected, server action will handle upload
      // No need to set logoUrl here, server action uses newLogoFile
    } else {
      // No change to logo, or no logo initially and none selected
      profileUpdateData.logoUrl = initialData?.logoUrl;
    }


    try {
      const result = await onSubmit(profileUpdateData, selectedLogoFile || undefined);
      if (result.success && result.profile) {
        toast({ title: "Success", description: "Restaurant profile updated." });
        // Parent component should update its state with result.profile
        // Form and preview will be reset by useEffect if initialData changes
      } else {
        throw new Error(result.error || "Profile update failed.");
      }
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Restaurant Information</CardTitle>
        <FormCardDescription>Update your restaurant's name, address, contact, and logo.</FormCardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(internalFormSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Restaurant Name *</FormLabel>
                  <FormControl><Input placeholder="e.g., The Gourmet Place" {...field} disabled={isSubmitting} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl><Textarea placeholder="e.g., 123 Main St, Anytown" {...field} rows={3} disabled={isSubmitting} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Number</FormLabel>
                  <FormControl><Input placeholder="e.g., (555) 123-4567" {...field} disabled={isSubmitting} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormItem>
              <FormLabel>Logo</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileChange}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  disabled={isSubmitting}
                />
              </FormControl>
              {logoPreview && (
                <div className="mt-2 relative w-48 h-32 border rounded-md overflow-hidden group bg-muted/30">
                  <Image
                    src={logoPreview}
                    alt="Logo Preview"
                    layout="fill"
                    objectFit="contain"
                    className="p-1"
                    onError={(e) => {
                        e.currentTarget.src = `https://placehold.co/300x200.png?text=Invalid+Logo`;
                        e.currentTarget.srcset = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 bg-black/50 text-white hover:bg-red-500/70 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={removeLogo}
                    disabled={isSubmitting}
                    aria-label="Remove logo"
                  >
                    <XCircle className="h-5 w-5" />
                  </Button>
                </div>
              )}
              {!logoPreview && (
                <div className="mt-2 w-48 h-32 border rounded-md flex flex-col items-center justify-center bg-muted/50 text-muted-foreground">
                  <ImageIcon className="h-10 w-10 mb-1" />
                  <p className="text-xs">No logo selected</p>
                </div>
              )}
              <FormDescription>Upload a logo for your restaurant (e.g., PNG, JPG. Max 2MB recommended).</FormDescription>
            </FormItem>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" disabled={isSubmitting || !form.formState.isDirty && !selectedLogoFile} className="bg-accent hover:bg-accent/90">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
