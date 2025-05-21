
'use server';

import type { MenuItem } from '@/types';
import fs from 'fs/promises';
import path from 'path';

// Removed: Firestore-related imports and actions (add, update, delete)

export async function fetchMenuItemsAction(): Promise<MenuItem[]> {
  console.log('[Server Action] fetchMenuItemsAction: Fetching from JSON file');
  try {
    const filePath = path.join(process.cwd(), 'public', 'menu-items.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const menuItems: MenuItem[] = JSON.parse(fileContent);
    
    console.log(`[Server Action] fetchMenuItemsAction: Success! Fetched ${menuItems.length} items from JSON.`);
    // Ensure items have necessary fields and defaults
    return menuItems.map(item => ({
      ...item,
      id: item.id || item.name.toLowerCase().replace(/\s+/g, '-'), // Ensure ID if missing
      price: Number(item.price) || 0,
      code: item.code || undefined, // Ensure code is present or undefined
      imageUrl: item.imageUrl || `https://placehold.co/300x200.png?text=${encodeURIComponent(item.name || 'Item')}`,
      dataAiHint: item.dataAiHint || item.name.toLowerCase().split(' ').slice(0,2).join(' ') || 'food item',
    }));
  } catch (error) {
    console.error("[Server Action] fetchMenuItemsAction: Error reading menu-items.json!", error);
    if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.warn("[Server Action] menu-items.json not found. Returning empty array. Please create the file.");
      // Optionally create an empty file here if desired, though usually it's better to prompt the user.
      // await fs.writeFile(filePath, '[]', 'utf-8');
    }
    return []; 
  }
}
