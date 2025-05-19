
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import type { MenuItem, CreateMenuItemInput } from '@/types';

function formatFirebaseError(e: unknown, defaultMessage: string): string {
  console.error("Raw error in formatFirebaseError:", e); // Log the raw error
  if (e instanceof Error) {
    if (typeof e === 'object' && e !== null && 'code' in e && typeof (e as any).code === 'string' && 'message' in e && typeof (e as any).message === 'string') {
      return `Firebase Error (${(e as any).code}): ${(e as any).message}`;
    }
    return e.message;
  }
  if (typeof e === 'string') {
    return e;
  }
  return defaultMessage;
}

export async function addMenuItemAction(itemData: CreateMenuItemInput): Promise<{ success: boolean; menuItem?: MenuItem; error?: string }> {
  console.log('[Server Action] addMenuItemAction: Entered with data:', JSON.stringify(itemData, null, 2));
  try {
    const dataToSave = {
      ...itemData,
      price: Number(itemData.price) || 0,
      imageUrl: itemData.imageUrl || `https://placehold.co/300x200.png?text=${encodeURIComponent(itemData.name || 'Item')}`,
      dataAiHint: itemData.dataAiHint || '',
    };
    console.log('[Server Action] addMenuItemAction: Data prepared for Firestore:', JSON.stringify(dataToSave, null, 2));

    const docRef = await addDoc(collection(db, 'menuItems'), dataToSave);
    const newMenuItem: MenuItem = { ...dataToSave, id: docRef.id };
    console.log('[Server Action] addMenuItemAction: Success! Menu item added with ID:', docRef.id);
    return { success: true, menuItem: newMenuItem };
  } catch (e) {
    console.error('[Server Action] addMenuItemAction: Error caught!', e);
    const errorMessage = formatFirebaseError(e, 'An unknown error occurred while adding the menu item.');
    console.log('[Server Action] addMenuItemAction: Returning error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

export async function fetchMenuItemsAction(): Promise<MenuItem[]> {
  console.log('[Server Action] fetchMenuItemsAction: Entered');
  try {
    const menuItemsCol = collection(db, 'menuItems');
    const q = query(menuItemsCol, orderBy('name'));
    const querySnapshot = await getDocs(q);
    const menuItems = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as MenuItem));
    console.log(`[Server Action] fetchMenuItemsAction: Success! Fetched ${menuItems.length} items.`);
    return menuItems;
  } catch (error) {
    console.error("[Server Action] fetchMenuItemsAction: Error caught!", error);
    throw error; // Re-throw for client-side handling
  }
}

export async function updateMenuItemAction(itemId: string, updates: Partial<Omit<MenuItem, 'id'>>): Promise<{ success: boolean; error?: string }> {
  console.log(`[Server Action] updateMenuItemAction: Entered for itemId: ${itemId} with updates:`, JSON.stringify(updates, null, 2));
  try {
    const itemDocRef = doc(db, 'menuItems', itemId);
    const updatesToSave = { ...updates };
    if (updates.price !== undefined) {
      updatesToSave.price = Number(updates.price) || 0;
    }
    if (updates.imageUrl === undefined && updates.name) {
        updatesToSave.imageUrl = `https://placehold.co/300x200.png?text=${encodeURIComponent(updates.name || 'Item')}`;
    }
    console.log('[Server Action] updateMenuItemAction: Data prepared for Firestore update:', JSON.stringify(updatesToSave, null, 2));

    await updateDoc(itemDocRef, updatesToSave);
    console.log('[Server Action] updateMenuItemAction: Success! Menu item updated:', itemId);
    return { success: true };
  } catch (e) {
    console.error(`[Server Action] updateMenuItemAction: Error caught for itemId ${itemId}!`, e);
    const errorMessage = formatFirebaseError(e, 'An unknown error occurred while updating the menu item.');
    console.log('[Server Action] updateMenuItemAction: Returning error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

export async function deleteMenuItemAction(itemId: string): Promise<{ success: boolean; error?: string }> {
  console.log(`[Server Action] deleteMenuItemAction: Entered for itemId: ${itemId}`);
  try {
    const itemDocRef = doc(db, 'menuItems', itemId);
    await deleteDoc(itemDocRef);
    console.log('[Server Action] deleteMenuItemAction: Success! Menu item deleted from Firestore:', itemId);
    return { success: true };
  } catch (e) {
    console.error(`[Server Action] deleteMenuItemAction: Error caught for itemId ${itemId}!`, e);
    const errorMessage = formatFirebaseError(e, 'An unknown error occurred while deleting the menu item from Firestore.');
    console.log('[Server Action] deleteMenuItemAction: Returning error:', errorMessage);
    return { success: false, error: errorMessage };
  }
}
