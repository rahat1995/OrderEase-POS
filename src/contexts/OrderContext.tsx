
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { MenuItem, CartItem, Order, Voucher } from '@/types';
import { toast } from "@/hooks/use-toast";
import { saveOrderAction } from '@/app/actions/orderActions';
import { validateVoucherAction } from '@/app/actions/voucherActions'; // New import

interface OrderState {
  items: CartItem[];
  customerName: string;
  customerMobile: string;
  appliedVoucher: Voucher | null;
  voucherError: string | null;
  isVoucherLoading: boolean;
}

interface OrderContextType extends OrderState {
  addItem: (item: MenuItem) => void;
  removeItem: (itemId: string) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  setCustomerInfo: (name: string, mobile: string) => void;
  generateOrderToken: () => string;
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getTotal: () => number;
  applyVoucher: (code: string) => Promise<void>;
  removeVoucher: () => void;
  finalizeOrder: () => Promise<Order | null>;
  clearOrder: () => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerMobile, setCustomerMobile] = useState<string>('');
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [isVoucherLoading, setIsVoucherLoading] = useState(false);

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

  const setCustomerInfo = useCallback((name: string, mobile: string) => {
    setCustomerName(name);
    setCustomerMobile(mobile);
  }, []);

  const generateOrderToken = useCallback((): string => {
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const timePart = Date.now().toString().slice(-6);
    return `TKN-${timePart}-${randomPart}`;
  }, []);
  
  const getSubtotal = useCallback((): number => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [items]);

  const applyVoucher = useCallback(async (code: string) => {
    if (!code.trim()) {
      setVoucherError("Please enter a voucher code.");
      setAppliedVoucher(null);
      return;
    }
    setIsVoucherLoading(true);
    setVoucherError(null);
    const subtotal = getSubtotal();
    const result = await validateVoucherAction(code, subtotal);
    if (result.success && result.voucher) {
      setAppliedVoucher(result.voucher);
      toast({ title: "Voucher Applied", description: `Discount for "${result.voucher.code}" applied.` });
    } else {
      setAppliedVoucher(null);
      setVoucherError(result.error || "Failed to apply voucher.");
      toast({ title: "Voucher Error", description: result.error || "Invalid voucher.", variant: "destructive" });
    }
    setIsVoucherLoading(false);
  }, [getSubtotal]);

  const removeVoucher = useCallback(() => {
    setAppliedVoucher(null);
    setVoucherError(null);
    toast({ title: "Voucher Removed" });
  }, []);

  const getDiscountAmount = useCallback((): number => {
    if (!appliedVoucher) return 0;
    const subtotal = getSubtotal();
    let calculatedDiscount = 0;
    if (appliedVoucher.discountType === 'percentage') {
      calculatedDiscount = subtotal * (appliedVoucher.discountValue / 100);
    } else {
      calculatedDiscount = appliedVoucher.discountValue;
    }
    calculatedDiscount = Math.max(0, calculatedDiscount); 
    return Math.min(calculatedDiscount, subtotal); // Discount cannot exceed subtotal
  }, [getSubtotal, appliedVoucher]);

  const getTotal = useCallback((): number => {
    return getSubtotal() - getDiscountAmount();
  }, [getSubtotal, getDiscountAmount]);

  const clearOrder = useCallback(() => {
    setItems([]);
    setAppliedVoucher(null);
    setVoucherError(null);
    setCustomerName('');
    setCustomerMobile('');
    toast({ title: "Cart Cleared", description: "Ready for a new order." });
  }, []);

  const finalizeOrder = useCallback(async (): Promise<Order | null> => {
    if (items.length === 0) {
      toast({ title: "Cannot Finalize", description: "Cart is empty.", variant: "destructive" });
      return null;
    }
    const token = generateOrderToken();
    const orderSubtotal = getSubtotal();
    const discountApplied = getDiscountAmount();
    const orderTotal = getTotal();

    const orderData: Order = {
      id: token, 
      token,
      items,
      subtotal: orderSubtotal,
      discountAmount: discountApplied,
      total: orderTotal,
      customerName: customerName || undefined,
      customerMobile: customerMobile || undefined,
      orderDate: new Date().toISOString(),
      appliedVoucherCode: appliedVoucher?.code,
      voucherDiscountDetails: appliedVoucher ? { type: appliedVoucher.discountType, value: appliedVoucher.discountValue } : undefined,
    };
    
    try {
      toast({ title: "Saving Order...", description: `Token: ${token}. Please wait.`});
      const result = await saveOrderAction(orderData); // saveOrderAction will handle incrementing voucher usage
      if (result.success && result.orderId) {
        toast({ title: "Order Saved & Finalized", description: `DB ID: ${result.orderId}, Token: ${token}. Preparing for print.`});
        return { ...orderData, id: result.orderId }; 
      } else {
        throw new Error(result.error || "Failed to save order to database.");
      }
    } catch (error) {
      console.error("Error saving order:", error);
      toast({ title: "Error Saving Order", description: (error instanceof Error ? error.message : "Unknown error") + " Check console for details.", variant: "destructive" });
      toast({ title: "Order Finalized (Locally)", description: `Token: ${token}. DB save failed. Preparing for print.` , variant: "destructive"});
      return orderData; 
    }
  }, [items, getSubtotal, getDiscountAmount, getTotal, customerName, customerMobile, generateOrderToken, appliedVoucher]);


  return (
    <OrderContext.Provider
      value={{
        items,
        customerName,
        customerMobile,
        appliedVoucher,
        voucherError,
        isVoucherLoading,
        addItem,
        removeItem,
        updateItemQuantity,
        setCustomerInfo,
        generateOrderToken,
        getSubtotal,
        getDiscountAmount,
        getTotal,
        applyVoucher,
        removeVoucher,
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
