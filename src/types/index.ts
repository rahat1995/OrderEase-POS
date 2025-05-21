
export interface MenuItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  code?: string;
  dataAiHint?: string;
}
export type CreateMenuItemInput = Omit<MenuItem, 'id'>;


export interface CartItem extends MenuItem {
  quantity: number;
}

export interface Voucher {
  id: string;
  code: string;
  codeLower: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount?: number;
  validFrom?: string; // ISO string
  validUntil?: string; // ISO string
  isActive: boolean;
  usageLimit?: number;
  timesUsed: number;
  createdAt: string; // ISO string
}
export type CreateVoucherInput = Omit<Voucher, 'id' | 'codeLower' | 'timesUsed' | 'createdAt'>;

export interface LoyalCustomerDiscount {
  id: string;
  mobileNumber: string;
  customerName?: string; // For admin reference
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  isActive: boolean;
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string
}
export type CreateLoyalCustomerDiscountInput = Omit<LoyalCustomerDiscount, 'id' | 'createdAt' | 'updatedAt'>;


export interface Order {
  id: string;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  customerName?: string;
  customerMobile?: string;
  orderDate: string; // ISO string
  token: string;
  // Discount details
  appliedLoyalDiscountDetails?: {
    mobileNumber: string;
    type: 'percentage' | 'fixed';
    value: number;
  };
  appliedVoucherCode?: string;
  voucherDiscountDetails?: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  manualDiscountType?: 'percentage' | 'fixed';
  manualDiscountValue?: number;
}

// Costing Module Types
export interface CostCategory {
  id: string;
  name: string;
  nameLower?: string;
}

export type CreateCostCategoryInput = Omit<CostCategory, 'id' | 'nameLower'>;

export interface PurchaseItem {
  id: string;
  name: string;
  code?: string;
  categoryId: string;
  categoryName: string;
}
export type CreatePurchaseItemInput = Omit<PurchaseItem, 'id'>;

export interface Supplier {
  id: string;
  name: string;
  nameLower?: string;
  address?: string;
  mobile?: string;
  contactPerson?: string;
  email?: string;
}
export type CreateSupplierInput = Omit<Supplier, 'id' | 'nameLower'>;

export interface PurchaseBill {
  id: string;
  billDate: string; // ISO string
  supplierId?: string;
  supplierName?: string;
  billNumber?: string;
  purchaseOrderNumber?: string;
  totalAmount: number;
  createdAt: string; // ISO string
}
export type CreatePurchaseBillInput = Omit<PurchaseBill, 'id' | 'totalAmount' | 'createdAt'> & {
  items: Array<Omit<CreateCostEntryInput, 'date' | 'purchaseBillId' | 'categoryName' | 'categoryId' | 'purchaseItemCode' > & { categoryId: string, categoryName: string, purchaseItemCode?: string }>;
};


export interface CostEntry {
  id: string;
  purchaseBillId: string;
  purchaseItemId: string;
  purchaseItemName: string;
  purchaseItemCode?: string;
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
  supplierName: string;
  paymentDate: string; // ISO String
  amountPaid: number;
  paymentMethod: string;
  notes?: string;
  createdAt: string; // ISO String
}

export type CreateSupplierPaymentInput = Omit<SupplierPayment, 'id' | 'createdAt' | 'supplierName'>;

export interface SupplierBalance extends Supplier {
  totalBilled: number;
  totalPaid: number;
  currentDue: number;
}

export interface SupplierPeriodicSummary extends Supplier {
  openingDue: number;
  purchasesInPeriod: number;
  paymentsInPeriod: number;
  closingDue: number;
}

export interface LedgerTransaction {
  id: string;
  date: string; // ISO string
  type: 'purchase' | 'payment';
  description: string;
  amount: number;
}

export interface SupplierLedgerData {
  supplier: Supplier;
  openingBalance: number;
  transactions: LedgerTransaction[];
  totalPurchasesInPeriod: number;
  totalPaymentsInPeriod: number;
  closingBalance: number;
}

export interface RestaurantProfile {
  id: string;
  name?: string;
  address?: string;
  contactNumber?: string;
  logoUrl?: string;
  updatedAt?: string; // ISO string
}

export type UpdateRestaurantProfileInput = Partial<Omit<RestaurantProfile, 'id' | 'updatedAt'>>;

export interface PrintRequestData {
  order: Order | null;
  profile: RestaurantProfile | null;
}
