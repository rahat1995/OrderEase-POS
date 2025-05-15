
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { MenuItem, CartItem, Order } from '@/types';
import { toast } from "@/hooks/use-toast";

interface OrderState {
  items: CartItem[];
  discountValue: number;
  discountType: 'percentage' | 'fixed';
  customerName: string;
  customerMobile: string;
}

interface OrderContextType extends OrderState {
  addItem: (item: MenuItem) => void;
  removeItem: (itemId: string) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  applyDiscount: (value: number, type: 'percentage' | 'fixed') => void;
  setCustomerInfo: (name: string, mobile: string) => void;
  generateOrderToken: () => string;
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getTotal: () => number;
  finalizeOrder: () => Order | null;
  clearOrder: () => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('fixed'); // Default to fixed
  const [customerName, setCustomerName] = useState<string>('');
  const [customerMobile, setCustomerMobile] = useState<string>('');

  const addItem = useCallback((item: MenuItem) => {
    setItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.id === item.id);
      if (existingItem) {
        return prevItems.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prevItems, { ...item, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems((prevItems) => prevItems.filter((i) => i.id !== itemId));
  }, []);

  const updateItemQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
    } else {
      setItems((prevItems) =>
        prevItems.map((i) => (i.id === itemId ? { ...i, quantity } : i))
      );
    }
  }, [removeItem]);

  const applyDiscount = useCallback((value: number, type: 'percentage' | 'fixed') => {
    setDiscountValue(value < 0 ? 0 : value); // Ensure discount is not negative
    setDiscountType(type);
  }, []);

  const setCustomerInfo = useCallback((name: string, mobile: string) => {
    setCustomerName(name);
    setCustomerMobile(mobile);
  }, []);

  const generateOrderToken = useCallback((): string => {
    return `TKN-${Date.now().toString().slice(-6)}`;
  }, []);
  
  const getSubtotal = useCallback((): number => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [items]);

  const getDiscountAmount = useCallback((): number => {
    const subtotal = getSubtotal();
    let calculatedDiscount = 0;
    if (discountType === 'percentage') {
      calculatedDiscount = subtotal * (discountValue / 100);
    } else {
      calculatedDiscount = discountValue;
    }
    // Discount cannot exceed subtotal, and discount cannot be negative
    calculatedDiscount = Math.max(0, calculatedDiscount); 
    return Math.min(calculatedDiscount, subtotal);
  }, [getSubtotal, discountValue, discountType]);

  const getTotal = useCallback((): number => {
    return getSubtotal() - getDiscountAmount();
  }, [getSubtotal, getDiscountAmount]);

  const clearOrder = useCallback(() => {
    setItems([]);
    setDiscountValue(0);
    setDiscountType('fixed'); // Reset to fixed
    setCustomerName('');
    setCustomerMobile('');
    toast({ title: "Cart Cleared", description: "Ready for a new order." });
  }, []);

  const finalizeOrder = useCallback((): Order | null => {
    if (items.length === 0) {
      toast({ title: "Cannot Finalize", description: "Cart is empty.", variant: "destructive" });
      return null;
    }
    const token = generateOrderToken();
    const order: Order = {
      id: token,
      token,
      items,
      subtotal: getSubtotal(),
      discountAmount: getDiscountAmount(),
      total: getTotal(),
      customerName: customerName || undefined,
      customerMobile: customerMobile || undefined,
      orderDate: new Date().toISOString(),
    };
    
    // Simulate saving to Excel
    console.log("Order Saved (Simulated):", JSON.stringify(order, null, 2));
    toast({ title: "Order Finalized", description: `Token: ${token}. Preparing for print.`});
    return order;
  }, [items, getSubtotal, getDiscountAmount, getTotal, customerName, customerMobile, generateOrderToken]);


  return (
    <OrderContext.Provider
      value={{
        items,
        discountValue,
        discountType,
        customerName,
        customerMobile,
        addItem,
        removeItem,
        updateItemQuantity,
        applyDiscount,
        setCustomerInfo,
        generateOrderToken,
        getSubtotal,
        getDiscountAmount,
        getTotal,
        finalizeOrder,
        clearOrder,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = (): OrderContextType => {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
};
