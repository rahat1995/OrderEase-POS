
import fs from 'fs/promises';
import path from 'path';
import type { MenuItem } from '@/types';
import PosClientPage from '@/components/pos/PosClientPage';

async function getMenuItems(): Promise<MenuItem[]> {
  try {
    const filePath = path.join(process.cwd(), 'public', 'menu-items.json');
    const jsonData = await fs.readFile(filePath, 'utf-8');
    const menuItems = JSON.parse(jsonData);
    return menuItems;
  } catch (error) {
    console.error("Failed to load menu items:", error);
    return []; // Return empty array or handle error as appropriate
  }
}

export default async function OrderPage() {
  const menuItems = await getMenuItems();

  return <PosClientPage initialMenuItems={menuItems} />;
}
