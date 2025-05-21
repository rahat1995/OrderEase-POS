
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { MenuItem, CartItem, Order, Voucher } from '@/types'; 
import { toast } from "@/hooks/use-toast";
import { saveOrderAction } from '@/app/actions/orderActions';
import { validateVoucherAction } from '@/app/actions/voucherActions'; 

interface OrderState {
  items: CartItem[];
  customerName: string;
  customerMobile: string;
  appliedVoucher: Voucher | null;
  voucherError: string | null;
  isVoucherLoading: boolean;
  manualDiscountType: 'percentage' | 'fixed';
  manualDiscountValue: number;
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
  applyManualDiscount: (type: 'percentage' | 'fixed', value: number) => void;
  removeManualDiscount: () => void;
  finalizeOrder: () => Promise<Order | null>; // Removed currentUser parameter
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

  const [manualDiscountType, setManualDiscountType] = useState<'percentage' | 'fixed'>('fixed');
  const [manualDiscountValue, setManualDiscountValue] = useState<number>(0);


  const addItem = useCallback((item: MenuItem) => {
    try {
      setItems((prevItems) => {
        const existingItem = prevItems.find((i) => i.id === item.id);
        if (existingItem) {
          return prevItems.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
          );
        }
        return [...prevItems, { ...item, quantity: 1 }];
      });
    } catch (e) {
      console.error("OrderContext: Error in addItem", e);
      toast({title: "Cart Error", description: "Could not add item to cart.", variant: "destructive"});
    }
  }, []);

  const removeItem = useCallback((itemId: string) => {
    try {
      setItems((prevItems) => prevItems.filter((i) => i.id !== itemId));
    } catch (e) {
      console.error("OrderContext: Error in removeItem", e);
      toast({title: "Cart Error", description: "Could not remove item from cart.", variant: "destructive"});
    }
  }, []);

  const updateItemQuantity = useCallback((itemId: string, quantity: number) => {
    try {
      if (quantity <= 0) {
        removeItem(itemId);
      } else {
        setItems((prevItems) =>
          prevItems.map((i) => (i.id === itemId ? { ...i, quantity } : i))
        );
      }
    } catch (e) {
      console.error("OrderContext: Error in updateItemQuantity", e);
      toast({title: "Cart Error", description: "Could not update item quantity.", variant: "destructive"});
    }
  }, [removeItem]);

  const setCustomerInfo = useCallback((name: string, mobile: string) => {
    try {
      setCustomerName(name);
      setCustomerMobile(mobile);
    } catch (e) {
      console.error("OrderContext: Error in setCustomerInfo", e);
    }
  }, []);

  const generateOrderToken = useCallback((): string => {
    try {
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      const timePart = Date.now().toString().slice(-6);
      return `TKN-${timePart}-${randomPart}`;
    } catch (e) {
      console.error("OrderContext: Error in generateOrderToken", e);
      return `TKN-ERROR-${Date.now()}`;
    }
  }, []);
  
  const getSubtotal = useCallback((): number => {
    try {
      return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    } catch (e) {
      console.error("OrderContext: Error in getSubtotal", e);
      return 0;
    }
  }, [items]);

  const removeManualDiscount = useCallback(() => {
    try {
      setManualDiscountType('fixed');
      setManualDiscountValue(0);
    } catch (e) {
      console.error("OrderContext: Error in removeManualDiscount", e);
    }
  }, []);

  const applyVoucher = useCallback(async (code: string) => {
    try {
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
        removeManualDiscount(); 
        toast({ title: "Voucher Applied", description: `Discount for "${result.voucher.code}" applied.` });
      } else {
        setAppliedVoucher(null);
        setVoucherError(result.error || "Failed to apply voucher.");
        toast({ title: "Voucher Error", description: result.error || "Invalid voucher.", variant: "destructive" });
      }
    } catch (e) {
        console.error("OrderContext: Error in applyVoucher", e);
        setAppliedVoucher(null);
        setVoucherError("An unexpected error occurred while applying voucher.");
        toast({ title: "Voucher System Error", description: "Could not apply voucher.", variant: "destructive" });
    } finally {
        setIsVoucherLoading(false);
    }
  }, [getSubtotal, removeManualDiscount]);

  const removeVoucher = useCallback(() => {
    try {
      setAppliedVoucher(null);
      setVoucherError(null);
      toast({ title: "Voucher Removed" });
    } catch (e) {
      console.error("OrderContext: Error in removeVoucher", e);
    }
  }, []);

  const applyManualDiscount = useCallback((type: 'percentage' | 'fixed', value: number) => {
    try {
      if (value < 0) {
        toast({ title: "Invalid Discount", description: "Discount value cannot be negative.", variant: "destructive" });
        return;
      }
      if (type === 'percentage' && value > 100) {
        toast({ title: "Invalid Discount", description: "Percentage discount cannot exceed 100%.", variant: "destructive" });
        return;
      }
      setManualDiscountType(type);
      setManualDiscountValue(value);
      setAppliedVoucher(null); 
      setVoucherError(null);
      toast({ title: "Manual Discount Applied", description: `${value}${type === 'percentage' ? '%' : '$'} discount applied.` });
    } catch (e) {
      console.error("OrderContext: Error in applyManualDiscount", e);
      toast({ title: "Discount Error", description: "Could not apply manual discount.", variant: "destructive" });
    }
  }, []);


  const getDiscountAmount = useCallback((): number => {
    try {
      const subtotal = getSubtotal();
      let calculatedDiscount = 0;

      if (appliedVoucher) {
        if (appliedVoucher.discountType === 'percentage') {
          calculatedDiscount = subtotal * (appliedVoucher.discountValue / 100);
        } else {
          calculatedDiscount = appliedVoucher.discountValue;
        }
      } else if (manualDiscountValue > 0) {
        if (manualDiscountType === 'percentage') {
          calculatedDiscount = subtotal * (manualDiscountValue / 100);
        } else {
          calculatedDiscount = manualDiscountValue;
        }
      }
      
      calculatedDiscount = Math.max(0, calculatedDiscount); 
      return Math.min(calculatedDiscount, subtotal); 
    } catch (e) {
      console.error("OrderContext: Error in getDiscountAmount", e);
      return 0;
    }
  }, [getSubtotal, appliedVoucher, manualDiscountType, manualDiscountValue]);

  const getTotal = useCallback((): number => {
    try {
      return getSubtotal() - getDiscountAmount();
    } catch (e) {
      console.error("OrderContext: Error in getTotal", e);
      return getSubtotal(); 
    }
  }, [getSubtotal, getDiscountAmount]);

  const clearOrder = useCallback(() => {
    try {
      setItems([]);
      setAppliedVoucher(null);
      setVoucherError(null);
      removeManualDiscount();
      setCustomerName('');
      setCustomerMobile('');
      toast({ title: "Cart Cleared", description: "Ready for a new order." });
    } catch (e) {
      console.error("OrderContext: Error in clearOrder", e);
      setItems([]);
      setAppliedVoucher(null);
      removeManualDiscount();
      setCustomerName('');
      setCustomerMobile('');
      toast({ title: "Cart Clearing Error", description: "Some items may not have cleared.", variant: "destructive" });
    }
  }, [removeManualDiscount]);

  const finalizeOrder = useCallback(async (): Promise<Order | null> => { // Removed currentUser parameter
    if (items.length === 0) {
      toast({ title: "Cannot Finalize", description: "Cart is empty.", variant: "destructive" });
      return null;
    }
    let orderData: Order | null = null;
    try {
      const token = generateOrderToken();
      const orderSubtotal = getSubtotal();
      const discountApplied = getDiscountAmount();
      const orderTotal = getTotal();

      orderData = {
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
        manualDiscountType: !appliedVoucher && manualDiscountValue > 0 ? manualDiscountType : undefined,
        manualDiscountValue: !appliedVoucher && manualDiscountValue > 0 ? manualDiscountValue : undefined,
        // Removed: createdByUid and createdByName
      };
    
      toast({ title: "Saving Order...", description: `Token: ${token}. Please wait.`});
      const result = await saveOrderAction(orderData); 
      if (result.success && result.orderId) {
        toast({ title: "Order Saved & Finalized", description: `DB ID: ${result.orderId}, Token: ${token}. Preparing for print.`});
        return { ...orderData, id: result.orderId }; 
      } else {
        throw new Error(result.error || "Failed to save order to database.");
      }
    } catch (error) {
      console.error("OrderContext: Error saving order:", error);
      toast({ title: "Error Saving Order", description: (error instanceof Error ? error.message : "Unknown error") + " Check console for details.", variant: "destructive" });
      if (orderData) { 
        toast({ title: "Order Finalized (Locally)", description: `Token: ${orderData.token}. DB save failed. Preparing for print.` , variant: "destructive"});
        return orderData; 
      }
      return null;
    }
  }, [items, getSubtotal, getDiscountAmount, getTotal, customerName, customerMobile, generateOrderToken, appliedVoucher, manualDiscountType, manualDiscountValue]);


  return (
    <OrderContext.Provider
      value={{
        items,
        customerName,
        customerMobile,
        appliedVoucher,
        voucherError,
        isVoucherLoading,
        manualDiscountType,
        manualDiscountValue,
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
        applyManualDiscount,
        removeManualDiscount,
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
