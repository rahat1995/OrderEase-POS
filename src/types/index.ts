
export interface MenuItem {
  id: string; // Firestore document ID
  name: string;
  price: number;
  imageUrl: string;
  dataAiHint?: string; // Reinstated for AI hint
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
  // nameLower: string; // Internal for uniqueness, not exposed in type
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

export interface Supplier {
  id: string;
  name: string;
  address?: string;
  mobile?: string;
  contactPerson?: string;
  email?: string;
  // nameLower: string; // Internal for uniqueness, not exposed in type
}
export type CreateSupplierInput = Omit<Supplier, 'id'>;

export interface PurchaseBill {
  id: string;
  billDate: string; // ISO string
  supplierId?: string; // Link to Supplier collection
  supplierName?: string; // Denormalized for easy display
  billNumber?: string;
  purchaseOrderNumber?: string;
  totalAmount: number; // Sum of all cost entries in this bill
  createdAt: string; // ISO string, for record keeping
}
export type CreatePurchaseBillInput = Omit<PurchaseBill, 'id' | 'totalAmount' | 'createdAt'> & {
  items: Array<Omit<CreateCostEntryInput, 'date' | 'purchaseBillId' | 'categoryName' | 'categoryId' | 'purchaseItemCode' > & { categoryId: string, categoryName: string, purchaseItemCode?: string }>;
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

// Supplier Payment Module Types
export interface SupplierPayment {
  id: string;
  supplierId: string;
  supplierName: string; // Denormalized
  paymentDate: string; // ISO String
  amountPaid: number;
  paymentMethod: string; // e.g., "Cash", "Bank Transfer", "Check"
  notes?: string;
  createdAt: string; // ISO String
}

export type CreateSupplierPaymentInput = Omit<SupplierPayment, 'id' | 'createdAt' | 'supplierName'>;

export interface SupplierBalance extends Supplier {
  totalBilled: number;
  totalPaid: number;
  currentDue: number;
}

// For Supplier Due Report - All Suppliers View
export interface SupplierPeriodicSummary extends Supplier {
  openingDue: number;
  purchasesInPeriod: number;
  paymentsInPeriod: number;
  closingDue: number;
}

// For Supplier Due Report - Individual Ledger View
export interface LedgerTransaction {
  id: string;
  date: string; // ISO string
  type: 'purchase' | 'payment';
  description: string;
  amount: number; // Positive for purchase, positive for payment (sign handled by type)
  // runningBalance will be calculated on client
}

export interface SupplierLedgerData {
  supplier: Supplier;
  openingBalance: number;
  transactions: LedgerTransaction[];
  totalPurchasesInPeriod: number;
  totalPaymentsInPeriod:
  closingBalance: number; // This will be the last runningBalance
}
