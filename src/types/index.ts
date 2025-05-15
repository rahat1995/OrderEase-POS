
export interface MenuItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  dataAiHint?: string;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface Order {
  id: string; // Order ID / Token
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  customerName?: string;
  customerMobile?: string;
  orderDate: string;
  token: string;
}
