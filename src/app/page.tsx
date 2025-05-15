
import type { MenuItem } from '@/types';
import PosClientPage from '@/components/pos/PosClientPage';
import { fetchMenuItemsAction } from '@/app/actions/menuActions';

// This function is now server-side and fetches from Firestore
async function getMenuItems(): Promise<MenuItem[]> {
  try {
    const menuItems = await fetchMenuItemsAction();
    return menuItems;
  } catch (error) {
    console.error("Failed to load menu items from Firestore:", error);
    return []; 
  }
}

export default async function OrderPage() {
  const menuItems = await getMenuItems();

  return <PosClientPage initialMenuItems={menuItems} />;
}
