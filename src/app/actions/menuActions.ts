
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import type { MenuItem } from '@/types';
// deleteImageAction is not used directly here anymore, it's called from the client page
// import { deleteImageAction } from './storageActions';

// Type for creating a menu item, ID is optional as Firestore generates it
export type CreateMenuItemInput = Omit<MenuItem, 'id'> & { id?: string };

function formatFirebaseError(e: unknown, defaultMessage: string): string {
  if (e instanceof Error) {
    // Check if it's a FirebaseError-like object with a code
    if (typeof e === 'object' && e !== null && 'code' in e && typeof (e as any).code === 'string') {
      return `Firebase Error (${(e as any).code}): ${e.message}`;
    }
    return e.message;
  }
  return defaultMessage;
}

export async function addMenuItemAction(itemData: CreateMenuItemInput): Promise<{ success: boolean; menuItem?: MenuItem; error?: string }> {
  try {
    // Ensure price is a number
    const dataToSave = {
      ...itemData,
      price: Number(itemData.price) || 0,
      imageUrl: itemData.imageUrl || `https://placehold.co/300x200.png?text=${encodeURIComponent(itemData.name || 'Item')}`,
      dataAiHint: itemData.dataAiHint || '',
    };
    const docRef = await addDoc(collection(db, 'menuItems'), dataToSave);
    const newMenuItem: MenuItem = { ...dataToSave, id: docRef.id };
    console.log('Menu item added with ID: ', docRef.id);
    return { success: true, menuItem: newMenuItem };
  } catch (e) {
    console.error('Error adding menu item: ', e);
    const errorMessage = formatFirebaseError(e, 'An unknown error occurred while adding the menu item.');
    return { success: false, error: errorMessage };
  }
}

export async function fetchMenuItemsAction(): Promise<MenuItem[]> {
  try {
    const menuItemsCol = collection(db, 'menuItems');
    const q = query(menuItemsCol, orderBy('name')); 
    const querySnapshot = await getDocs(q);
    const menuItems = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as MenuItem));
    return menuItems;
  } catch (error) {
    console.error("Error fetching menu items: ", error);
    // This function is typically called by client components that handle their own errors/toasts
    // Re-throwing allows the client to know the fetch failed.
    throw error; 
  }
}

export async function updateMenuItemAction(itemId: string, updates: Partial<Omit<MenuItem, 'id'>>): Promise<{ success: boolean; error?: string }> {
  try {
    const itemDocRef = doc(db, 'menuItems', itemId);
     // Ensure price is a number if it's being updated
    const updatesToSave = { ...updates };
    if (updates.price !== undefined) {
      updatesToSave.price = Number(updates.price) || 0;
    }
    if (updates.imageUrl === undefined && updates.name) { // if imageUrl is undefined (likely removed), ensure placeholder with new name
        updatesToSave.imageUrl = `https://placehold.co/300x200.png?text=${encodeURIComponent(updates.name || 'Item')}`;
    }


    await updateDoc(itemDocRef, updatesToSave);
    console.log('Menu item updated: ', itemId);
    return { success: true };
  } catch (e) {
    console.error('Error updating menu item: ', e);
    const errorMessage = formatFirebaseError(e, 'An unknown error occurred while updating the menu item.');
    return { success: false, error: errorMessage };
  }
}

export async function deleteMenuItemAction(itemId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const itemDocRef = doc(db, 'menuItems', itemId);
    await deleteDoc(itemDocRef);
    console.log('Menu item deleted from Firestore: ', itemId);
    return { success: true };
  } catch (e) {
    console.error('Error deleting menu item from Firestore: ', e);
    const errorMessage = formatFirebaseError(e, 'An unknown error occurred while deleting the menu item from Firestore.');
    return { success: false, error: errorMessage };
  }
}
