
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
        logoUrl: data.logoUrl || '', // Keep as empty string if that's what's stored
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
    let currentProfile = await fetchRestaurantProfileAction();
    let logoUrlToSave: string | undefined = currentProfile?.logoUrl;

    if (newLogoFile) {
      if (logoUrlToSave && logoUrlToSave.includes('firebasestorage.googleapis.com')) {
        await deleteImageAction(logoUrlToSave);
      }

      const formData = new FormData();
      formData.append('imageFile', newLogoFile);
      formData.append('folderName', 'restaurant_assets');

      const uploadResult = await uploadImageAction(formData);
      if (uploadResult.success && uploadResult.imageUrl) {
        logoUrlToSave = uploadResult.imageUrl;
      } else {
        throw new Error(uploadResult.error || 'Logo upload failed.');
      }
    } else if (data.logoUrl === '' && currentProfile?.logoUrl && currentProfile.logoUrl.includes('firebasestorage.googleapis.com')) {
      // User explicitly wants to remove the logo by clearing the field, and there was an old Firebase Storage logo.
      await deleteImageAction(currentProfile.logoUrl);
      logoUrlToSave = ''; // Set to empty string to reflect removal, which Firestore allows.
    } else if (data.logoUrl !== undefined) {
      // If data.logoUrl is provided (and not empty, handled above), it means the user might have manually entered a URL
      // or the existing URL was passed through.
      logoUrlToSave = data.logoUrl;
    }
    // If data.logoUrl is undefined, it means no change was intended for the logo URL from the form's text fields,
    // and logoUrlToSave retains its value from currentProfile or from newLogoFile upload.


    const dataForFirestore: { name: string; address: string; contactNumber: string; updatedAt: Timestamp; logoUrl?: string } = {
      name: data.name?.trim() || '',
      address: data.address?.trim() || '',
      contactNumber: data.contactNumber?.trim() || '',
      updatedAt: Timestamp.now(),
    };

    // Only include logoUrl in dataForFirestore if it's a non-empty string or an empty string (explicitly cleared).
    // If logoUrlToSave is undefined (e.g. new profile, no logo uploaded), it will be omitted from Firestore.
    if (logoUrlToSave !== undefined) {
      dataForFirestore.logoUrl = logoUrlToSave;
    }
    // If logoUrlToSave is undefined (e.g. new profile and no logo ever set or uploaded), 
    // the logoUrl field will be omitted from the setDoc call, which is fine with Firestore.
    // If logoUrlToSave is an empty string (user cleared it), it will be saved as an empty string.

    await setDoc(docRef, dataForFirestore, { merge: true });
    const updatedProfile = await fetchRestaurantProfileAction();

    return { success: true, profile: updatedProfile || undefined };
  } catch (e) {
    console.error('[Server Action] updateRestaurantProfileAction: Error updating profile', e);
    let errorMessage = 'An unknown error occurred while updating the restaurant profile.';
    if (e instanceof Error) {
      errorMessage = e.message;
    }
    if (typeof e === 'object' && e !== null && 'code' in e && typeof (e as any).code === 'string') {
        const firebaseError = e as { code: string; message: string };
        errorMessage = `Firebase Error (${firebaseError.code}): ${firebaseError.message}`;
         if (firebaseError.code === 'storage/object-not-found' && newLogoFile) {
            console.warn("Old logo not found during update, proceeding with new logo upload.");
        } else if (firebaseError.code === 'storage/no-default-bucket' && newLogoFile) {
             return { success: false, error: `Firebase Storage: No default bucket found. Please ensure Storage is enabled and 'storageBucket' in .env.local is correct.` };
        }
    }
    return { success: false, error: errorMessage };
  }
}
