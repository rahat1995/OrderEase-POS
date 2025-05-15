
'use server';

import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid'; // For generating unique filenames

export async function uploadImageAction(
  formData: FormData
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  try {
    const file = formData.get('imageFile') as File;
    if (!file) {
      return { success: false, error: 'No image file provided.' };
    }

    // Generate a unique filename to prevent overwrites and ensure valid characters
    const fileExtension = file.name.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    const storageRef = ref(storage, `menu_images/${uniqueFileName}`);

    // Upload the file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    console.log('Image uploaded successfully: ', downloadURL);
    return { success: true, imageUrl: downloadURL };
  } catch (e) {
    console.error('Error uploading image: ', e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during image upload.';
    // Attempt to provide more specific Firebase Storage error codes if available
    if (typeof e === 'object' && e !== null && 'code' in e) {
        const firebaseError = e as { code: string; message: string };
        return { success: false, error: `Firebase Storage Error (${firebaseError.code}): ${firebaseError.message}` };
    }
    return { success: false, error: errorMessage };
  }
}

export async function deleteImageAction(imageUrl: string): Promise<{ success: boolean; error?: string }> {
  if (!imageUrl || !imageUrl.includes('firebasestorage.googleapis.com')) {
    // Not a Firebase Storage URL or empty, so nothing to delete or can't handle
    return { success: true }; // Consider it a success as there's nothing to do from our side
  }
  try {
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
    console.log('Image deleted successfully: ', imageUrl);
    return { success: true };
  } catch (e) {
    console.error('Error deleting image: ', e);
     const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during image deletion.';
    if (typeof e === 'object' && e !== null && 'code' in e) {
        const firebaseError = e as { code: string; message: string };
        // Firebase Storage error code 'storage/object-not-found' can be ignored if we attempt to delete non-existent file
        if (firebaseError.code === 'storage/object-not-found') {
            console.warn('Attempted to delete an image that was not found in Firebase Storage:', imageUrl);
            return { success: true }; // File already doesn't exist, consider it a success
        }
        return { success: false, error: `Firebase Storage Error (${firebaseError.code}): ${firebaseError.message}` };
    }
    return { success: false, error: errorMessage };
  }
}
