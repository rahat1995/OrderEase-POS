
'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import type { RestaurantProfile, UpdateRestaurantProfileInput } from '@/types';
import { uploadImageAction, deleteImageAction } from './storageActions';

const PROFILE_COLLECTION = 'restaurantProfile';
const PROFILE_DOC_ID = 'main_config';

export async function fetchRestaurantProfileAction(): Promise<RestaurantProfile | null> {
  try {
    const docRef = doc(db, PROFILE_COLLECTION, PROFILE_DOC_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name || '',
        address: data.address || '',
        contactNumber: data.contactNumber || '',
        logoUrl: data.logoUrl || '',
        updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate().toISOString() : undefined,
      } as RestaurantProfile;
    } else {
      // Return a default structure if no profile exists yet
      return {
        id: PROFILE_DOC_ID,
        name: '',
        address: '',
        contactNumber: '',
        logoUrl: '',
      };
    }
  } catch (e) {
    console.error('[Server Action] fetchRestaurantProfileAction: Error fetching profile', e);
    // In case of an error, return a default structure or null based on how you want to handle it client-side
    // Returning null might be better to indicate an actual fetch failure vs. no data found.
     return {
        id: PROFILE_DOC_ID,
        name: 'Error loading data',
        address: '',
        contactNumber: '',
        logoUrl: '',
      };
  }
}

export async function updateRestaurantProfileAction(
  data: UpdateRestaurantProfileInput,
  newLogoFile?: File
): Promise<{ success: boolean; error?: string; profile?: RestaurantProfile }> {
  try {
    const docRef = doc(db, PROFILE_COLLECTION, PROFILE_DOC_ID);
    let currentProfile = await fetchRestaurantProfileAction(); // Get current profile to check old logo
    let logoUrlToSave = currentProfile?.logoUrl;

    if (newLogoFile) {
      // If there's an old logo and it's a Firebase Storage URL, delete it
      if (logoUrlToSave && logoUrlToSave.includes('firebasestorage.googleapis.com')) {
        await deleteImageAction(logoUrlToSave);
      }

      // Upload new logo
      const formData = new FormData();
      formData.append('imageFile', newLogoFile);
      formData.append('folderName', 'restaurant_assets'); // Optional: specify a folder

      const uploadResult = await uploadImageAction(formData);
      if (uploadResult.success && uploadResult.imageUrl) {
        logoUrlToSave = uploadResult.imageUrl;
      } else {
        throw new Error(uploadResult.error || 'Logo upload failed.');
      }
    } else if (data.logoUrl === '' && currentProfile?.logoUrl && currentProfile.logoUrl.includes('firebasestorage.googleapis.com')) {
      // If logoUrl is explicitly set to empty string in data (meaning user wants to remove it)
      // and there was an old logo from Firebase Storage
      await deleteImageAction(currentProfile.logoUrl);
      logoUrlToSave = undefined; // Mark to remove from Firestore or set placeholder later if needed
    }


    const dataToSave: UpdateRestaurantProfileInput & { updatedAt: Timestamp; logoUrl?: string } = {
      name: data.name?.trim() || '',
      address: data.address?.trim() || '',
      contactNumber: data.contactNumber?.trim() || '',
      logoUrl: logoUrlToSave || undefined, // Ensure it's undefined if no logo, not empty string directly
      updatedAt: Timestamp.now(),
    };

    await setDoc(docRef, dataToSave, { merge: true });
    const updatedProfile = await fetchRestaurantProfileAction(); // Fetch again to return the full profile

    return { success: true, profile: updatedProfile || undefined };
  } catch (e) {
    console.error('[Server Action] updateRestaurantProfileAction: Error updating profile', e);
    let errorMessage = 'An unknown error occurred while updating the restaurant profile.';
    if (e instanceof Error) {
      errorMessage = e.message;
    }
     // Check for specific Firebase errors if needed
    if (typeof e === 'object' && e !== null && 'code' in e && typeof (e as any).code === 'string') {
        const firebaseError = e as { code: string; message: string };
        errorMessage = `Firebase Error (${firebaseError.code}): ${firebaseError.message}`;
         if (firebaseError.code === 'storage/object-not-found' && newLogoFile) {
            // This can happen if deleteImageAction tries to delete a non-existent old logo - generally okay to proceed
            console.warn("Old logo not found during update, proceeding with new logo upload.");
        } else if (firebaseError.code === 'storage/no-default-bucket' && newLogoFile) {
             return { success: false, error: `Firebase Storage: No default bucket found. Please ensure Storage is enabled and 'storageBucket' in .env.local is correct.` };
        }
    }
    return { success: false, error: errorMessage };
  }
}
