
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
