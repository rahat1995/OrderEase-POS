
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import type { MenuItem } from '@/types';
import { deleteImageAction } from './storageActions'; // Import deleteImageAction

// Type for creating a menu item, ID is optional as Firestore generates it
export type CreateMenuItemInput = Omit<MenuItem, 'id'> & { id?: string };

export async function addMenuItemAction(itemData: CreateMenuItemInput): Promise<{ success: boolean; menuItem?: MenuItem; error?: string }> {
  try {
    // Ensure price is a number
    const dataToSave = {
      ...itemData,
      price: Number(itemData.price) || 0,
    };
    const docRef = await addDoc(collection(db, 'menuItems'), dataToSave);
    const newMenuItem: MenuItem = { ...dataToSave, id: docRef.id };
    console.log('Menu item added with ID: ', docRef.id);
    return { success: true, menuItem: newMenuItem };
  } catch (e) {
    console.error('Error adding menu item: ', e);
    return { success: false, error: e instanceof Error ? e.message : 'An unknown error occurred' };
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
    return [];
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
    await updateDoc(itemDocRef, updatesToSave);
    console.log('Menu item updated: ', itemId);
    return { success: true };
  } catch (e) {
    console.error('Error updating menu item: ', e);
    return { success: false, error: e instanceof Error ? e.message : 'An unknown error occurred' };
  }
}

export async function deleteMenuItemAction(itemId: string): Promise<{ success: boolean; error?: string }> {
  // Note: Image deletion from storage should be handled by the calling component (e.g., MenuManagementPage)
  // because this action only knows about Firestore data.
  try {
    const itemDocRef = doc(db, 'menuItems', itemId);
    await deleteDoc(itemDocRef);
    console.log('Menu item deleted from Firestore: ', itemId);
    return { success: true };
  } catch (e) {
    console.error('Error deleting menu item from Firestore: ', e);
    return { success: false, error: e instanceof Error ? e.message : 'An unknown error occurred' };
  }
}
