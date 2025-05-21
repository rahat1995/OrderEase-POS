
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { RestaurantProfile, UpdateRestaurantProfileInput } from '@/types';
import { fetchRestaurantProfileAction, updateRestaurantProfileAction } from '@/app/actions/restaurantProfileActions';
import RestaurantProfileForm from '@/components/admin/RestaurantProfileForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Building, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function RestaurantProfilePage() {
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchRestaurantProfileAction();
      if (data) {
        setProfile(data);
      } else {
        // This case might occur if the action explicitly returns null on certain errors,
        // or if the default empty profile is what's intended on first load.
        setProfile({ id: 'main_config', name: '', address: '', contactNumber: '', logoUrl: '' });
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Failed to load restaurant profile.";
      setError(errorMessage);
      toast({ title: "Error Loading Profile", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleFormSubmit = async (
    data: UpdateRestaurantProfileInput,
    newLogoFile?: File
  ): Promise<{success: boolean, error?: string, profile?: RestaurantProfile}> => {
    const result = await updateRestaurantProfileAction(data, newLogoFile);
    if (result.success && result.profile) {
      setProfile(result.profile); // Update local state with the successfully saved profile
    }
    return result; // Return the full result for the form to handle toast messages
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8 flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg">Loading Restaurant Profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2" /> Error Loading Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <p className="mt-2 text-sm text-muted-foreground">Please try refreshing the page. If the problem persists, check server logs or contact support.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
       <CardHeader className="px-0 mb-4">
        <div className="flex items-center space-x-3">
          <Building className="h-8 w-8 text-accent" />
          <div>
            <CardTitle className="text-2xl md:text-3xl">Restaurant Profile Settings</CardTitle>
            <CardDescription>Manage your restaurant's general information and branding.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <RestaurantProfileForm
        initialData={profile}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
