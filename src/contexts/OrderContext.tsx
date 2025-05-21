
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'; // Added useEffect
import type { MenuItem, CartItem, Order, Voucher, LoyalCustomerDiscount } from '@/types';
import { toast } from "@/hooks/use-toast";
import { saveOrderAction } from '@/app/actions/orderActions';
import { validateVoucherAction } from '@/app/actions/voucherActions';
import { fetchActiveLoyalCustomerDiscountByMobileAction } from '@/app/actions/loyalCustomerActions'; // New import

interface OrderState {
  items: CartItem[];
  customerName: string;
  customerMobile: string;
  appliedLoyalCustomerDiscount: LoyalCustomerDiscount | null; // New
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
  triggerLoyalCustomerCheck: (mobile: string) => Promise<void>; // New method to explicitly check
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getTotal: () => number;
  applyVoucher: (code: string) => Promise<void>;
  removeVoucher: () => void;
  applyManualDiscount: (type: 'percentage' | 'fixed', value: number) => void;
  removeManualDiscount: () => void;
  clearActiveDiscount: () => void; // New utility
  finalizeOrder: () => Promise<Order | null>;
  clearOrder: () => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerMobile, setCustomerMobile] = useState<string>('');

  const [appliedLoyalCustomerDiscount, setAppliedLoyalCustomerDiscount] = useState<LoyalCustomerDiscount | null>(null); // New
  const [isLoyalCustomerCheckLoading, setIsLoyalCustomerCheckLoading] = useState(false); // New

  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [isVoucherLoading, setIsVoucherLoading] = useState(false);

  const [manualDiscountType, setManualDiscountType] = useState<'percentage' | 'fixed'>('fixed');
  const [manualDiscountValue, setManualDiscountValue] = useState<number>(0);

  const clearActiveDiscount = useCallback(() => {
    setAppliedLoyalCustomerDiscount(null);
    setAppliedVoucher(null);
    setVoucherError(null);
    setManualDiscountType('fixed');
    setManualDiscountValue(0);
  }, []);

  const triggerLoyalCustomerCheck = useCallback(async (mobile: string) => {
    if (!mobile || mobile.trim().length < 5) { // Basic validation
      if(appliedLoyalCustomerDiscount) clearActiveDiscount(); // Clear if mobile becomes invalid
      return;
    }
    setIsLoyalCustomerCheckLoading(true);
    try {
      const discount = await fetchActiveLoyalCustomerDiscountByMobileAction(mobile.trim());
      if (discount) {
        clearActiveDiscount(); // Clear other discounts
        setAppliedLoyalCustomerDiscount(discount);
        toast({ title: "Loyal Customer Discount Applied", description: `${discount.discountValue}${discount.discountType === 'percentage' ? '%' : '$'} off for ${discount.customerName || discount.mobileNumber}.` });
      } else {
        // If no discount found for new mobile, and a loyal discount was previously applied, clear it.
        if(appliedLoyalCustomerDiscount) setAppliedLoyalCustomerDiscount(null);
      }
    } catch (error) {
      console.error("Error checking for loyal customer discount:", error);
      toast({ title: "Error", description: "Could not check for loyal customer discount.", variant: "destructive" });
    } finally {
      setIsLoyalCustomerCheckLoading(false);
    }
  }, [clearActiveDiscount, appliedLoyalCustomerDiscount]);


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
      // Don't auto-trigger loyal customer check here. Let OrderCart handle it on blur.
    } catch (e) {
      console.error("OrderContext: Error in setCustomerInfo", e);
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

  const applyVoucher = useCallback(async (code: string) => {
    if (appliedLoyalCustomerDiscount) {
      toast({ title: "Discount Conflict", description: "A loyal customer discount is already active. Cannot apply voucher.", variant: "default" });
      return;
    }
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
        clearActiveDiscount(); // Clear loyal and manual
        setAppliedVoucher(result.voucher);
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
  }, [getSubtotal, clearActiveDiscount, appliedLoyalCustomerDiscount]);

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
    if (appliedLoyalCustomerDiscount) {
      toast({ title: "Discount Conflict", description: "A loyal customer discount is already active. Cannot apply manual discount.", variant: "default" });
      return;
    }
    try {
      if (value < 0) {
        toast({ title: "Invalid Discount", description: "Discount value cannot be negative.", variant: "destructive" });
        return;
      }
      if (type === 'percentage' && value > 100) {
        toast({ title: "Invalid Discount", description: "Percentage discount cannot exceed 100%.", variant: "destructive" });
        return;
      }
      clearActiveDiscount(); // Clear loyal and voucher
      setManualDiscountType(type);
      setManualDiscountValue(value);
      toast({ title: "Manual Discount Applied", description: `${value}${type === 'percentage' ? '%' : '$'} discount applied.` });
    } catch (e) {
      console.error("OrderContext: Error in applyManualDiscount", e);
      toast({ title: "Discount Error", description: "Could not apply manual discount.", variant: "destructive" });
    }
  }, [clearActiveDiscount, appliedLoyalCustomerDiscount]);

  const removeManualDiscount = useCallback(() => {
    try {
      setManualDiscountType('fixed');
      setManualDiscountValue(0);
      // No toast here, clearing is usually silent unless part of a larger action
    } catch (e) {
      console.error("OrderContext: Error in removeManualDiscount", e);
    }
  }, []);

  const getDiscountAmount = useCallback((): number => {
    try {
      const subtotal = getSubtotal();
      let calculatedDiscount = 0;

      if (appliedLoyalCustomerDiscount) {
        if (appliedLoyalCustomerDiscount.discountType === 'percentage') {
          calculatedDiscount = subtotal * (appliedLoyalCustomerDiscount.discountValue / 100);
        } else {
          calculatedDiscount = appliedLoyalCustomerDiscount.discountValue;
        }
      } else if (appliedVoucher) {
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
  }, [getSubtotal, appliedLoyalCustomerDiscount, appliedVoucher, manualDiscountType, manualDiscountValue]);

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
      clearActiveDiscount(); // Clears all types of discounts
      setCustomerName('');
      setCustomerMobile('');
      // No toast here, typically called after finalizeOrder which gives its own toast
    } catch (e) {
      console.error("OrderContext: Error in clearOrder", e);
      toast({ title: "Cart Clearing Error", description: "Some items may not have cleared.", variant: "destructive" });
    }
  }, [clearActiveDiscount]);

  const finalizeOrder = useCallback(async (): Promise<Order | null> => {
    if (items.length === 0) {
      toast({ title: "Cannot Finalize", description: "Cart is empty.", variant: "destructive" });
      return null;
    }
    let orderData: Order | null = null;
    try {
      const token = Math.random().toString(36).substring(2, 8).toUpperCase(); // Simplified token
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
        appliedLoyalDiscountDetails: appliedLoyalCustomerDiscount ? {
          mobileNumber: appliedLoyalCustomerDiscount.mobileNumber,
          type: appliedLoyalCustomerDiscount.discountType,
          value: appliedLoyalCustomerDiscount.discountValue,
        } : undefined,
        appliedVoucherCode: !appliedLoyalCustomerDiscount && appliedVoucher ? appliedVoucher.code : undefined,
        voucherDiscountDetails: !appliedLoyalCustomerDiscount && appliedVoucher ? {
          type: appliedVoucher.discountType,
          value: appliedVoucher.discountValue
        } : undefined,
        manualDiscountType: !appliedLoyalCustomerDiscount && !appliedVoucher && manualDiscountValue > 0 ? manualDiscountType : undefined,
        manualDiscountValue: !appliedLoyalCustomerDiscount && !appliedVoucher && manualDiscountValue > 0 ? manualDiscountValue : undefined,
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
  }, [
      items,
      getSubtotal,
      getDiscountAmount,
      getTotal,
      customerName,
      customerMobile,
      appliedLoyalCustomerDiscount,
      appliedVoucher,
      manualDiscountType,
      manualDiscountValue
    ]);


  return (
    <OrderContext.Provider
      value={{
        items,
        customerName,
        customerMobile,
        appliedLoyalCustomerDiscount,
        appliedVoucher,
        voucherError,
        isVoucherLoading: isVoucherLoading || isLoyalCustomerCheckLoading, // Combine loading states
        manualDiscountType,
        manualDiscountValue,
        addItem,
        removeItem,
        updateItemQuantity,
        setCustomerInfo,
        triggerLoyalCustomerCheck,
        getSubtotal,
        getDiscountAmount,
        getTotal,
        applyVoucher,
        removeVoucher,
        applyManualDiscount,
        removeManualDiscount,
        clearActiveDiscount,
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
