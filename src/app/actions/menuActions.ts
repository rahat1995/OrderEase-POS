
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import type { MenuItem } from '@/types';

// Type for creating a menu item, ID is optional as Firestore generates it
export type CreateMenuItemInput = Omit<MenuItem, 'id'> & { id?: string };

export async function addMenuItemAction(itemData: CreateMenuItemInput): Promise<{ success: boolean; menuItem?: MenuItem; error?: string }> {
  try {
    const docRef = await addDoc(collection(db, 'menuItems'), itemData);
    const newMenuItem: MenuItem = { ...itemData, id: docRef.id };
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
    // Optionally, order by name or another field
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
    await updateDoc(itemDocRef, updates);
    console.log('Menu item updated: ', itemId);
    return { success: true };
  } catch (e) {
    console.error('Error updating menu item: ', e);
    return { success: false, error: e instanceof Error ? e.message : 'An unknown error occurred' };
  }
}

export async function deleteMenuItemAction(itemId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const itemDocRef = doc(db, 'menuItems', itemId);
    await deleteDoc(itemDocRef);
    console.log('Menu item deleted: ', itemId);
    return { success: true };
  } catch (e) {
    console.error('Error deleting menu item: ', e);
    return { success: false, error: e instanceof Error ? e.message : 'An unknown error occurred' };
  }
}
