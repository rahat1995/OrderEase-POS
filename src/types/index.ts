
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

export interface PurchaseItem {
  id: string;
  name: string;
  code?: string; // Optional item code
  categoryId: string;
  categoryName: string; // Denormalized
}
export type CreatePurchaseItemInput = Omit<PurchaseItem, 'id'>;

export interface PurchaseBill {
  id: string;
  billDate: string; // ISO string
  supplierName?: string;
  billNumber?: string;
  purchaseOrderNumber?: string;
  supplierAddress?: string;
  supplierMobile?: string;
  totalAmount: number; // Sum of all cost entries in this bill
  createdAt: string; // ISO string, for record keeping
}
export type CreatePurchaseBillInput = Omit<PurchaseBill, 'id' | 'totalAmount' | 'createdAt'> & {
  items: Array<Omit<CreateCostEntryInput, 'date' | 'purchaseBillId' | 'categoryName' | 'categoryId' >>; 
};


export interface CostEntry {
  id: string; 
  purchaseBillId: string; 
  purchaseItemId: string; 
  purchaseItemName: string; 
  purchaseItemCode?: string; // Denormalized from PurchaseItem
  categoryId: string; 
  categoryName: string; 
  amount: number;
  date: string; // ISO string (this will be the billDate from PurchaseBill)
}

export type CreateCostEntryInput = Omit<CostEntry, 'id'>;
