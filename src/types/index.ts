
export interface MenuItem {
  id: string; // Firestore document ID
  name: string;
  price: number;
  imageUrl: string;
  dataAiHint?: string;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface Order {
  id: string; // Order ID / Firestore Document ID
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  customerName?: string;
  customerMobile?: string;
  orderDate: string; // ISO string
  token: string; // User-facing token
}

// Costing Module Types
export interface CostCategory {
  id: string;
  name: string;
}

export type CreateCostCategoryInput = Omit<CostCategory, 'id'>;

export interface CostEntry {
  id: string;
  categoryId: string;
  categoryName: string; // Denormalized for easier display
  itemName: string;
  amount: number;
  date: string; // ISO string from client, stored as Timestamp in Firestore
}

export type CreateCostEntryInput = Omit<CostEntry, 'id'>;
