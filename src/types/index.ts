
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
  categoryId: string;
  categoryName: string; // Denormalized
}
export type CreatePurchaseItemInput = Omit<PurchaseItem, 'id'>;

export interface PurchaseBill {
  id: string;
  billDate: string; // ISO string
  supplierName?: string;
  billNumber?: string;
  purchaseOrderNumber?: string; // Changed from orderNumber to avoid confusion with Sales Order
  supplierAddress?: string;
  supplierMobile?: string;
  totalAmount: number; // Sum of all cost entries in this bill
  createdAt: string; // ISO string, for record keeping
}
export type CreatePurchaseBillInput = Omit<PurchaseBill, 'id' | 'totalAmount' | 'createdAt'> & {
  items: Array<Omit<CreateCostEntryInput, 'date' | 'purchaseBillId' | 'categoryName' | 'categoryId' >>; // Items to be turned into CostEntries
};


export interface CostEntry {
  id: string; // Firestore document ID for the cost entry itself
  purchaseBillId: string; // FK to PurchaseBill
  purchaseItemId: string; // FK to PurchaseItem
  purchaseItemName: string; // Denormalized from PurchaseItem
  categoryId: string; // Denormalized from PurchaseItem/CostCategory
  categoryName: string; // Denormalized from PurchaseItem/CostCategory
  amount: number;
  date: string; // ISO string (this will be the billDate from PurchaseBill)
}

// This type is for what's needed to create a single cost entry,
// usually as part of a purchase bill.
export type CreateCostEntryInput = Omit<CostEntry, 'id'>;
