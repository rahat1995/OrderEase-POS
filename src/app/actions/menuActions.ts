
'use server';

import type { MenuItem } from '@/types';
import fs from 'fs/promises';
import path from 'path';

// Removed: formatFirebaseError, addMenuItemAction, updateMenuItemAction, deleteMenuItemAction
// Firestore db import is no longer needed for menu items.

export async function fetchMenuItemsAction(): Promise<MenuItem[]> {
  console.log('[Server Action] fetchMenuItemsAction: Fetching from JSON file');
  try {
    // Construct the path to menu-items.json relative to the project root
    const filePath = path.join(process.cwd(), 'public', 'menu-items.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const menuItems: MenuItem[] = JSON.parse(fileContent);
    
    console.log(`[Server Action] fetchMenuItemsAction: Success! Fetched ${menuItems.length} items from JSON.`);
    // Ensure items have a default dataAiHint if not present
    return menuItems.map(item => ({
      ...item,
      dataAiHint: item.dataAiHint || item.name.toLowerCase().split(' ').slice(0,2).join(' ') || 'food item',
      // Ensure price is a number
      price: Number(item.price) || 0,
    }));
  } catch (error) {
    console.error("[Server Action] fetchMenuItemsAction: Error reading menu-items.json!", error);
    // Return an empty array or throw a more specific error if the file is critical
    // For now, returning empty to prevent full app crash, but logging is important.
    return []; 
  }
}
