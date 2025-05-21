
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useOrder } from '@/contexts/OrderContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, PlusCircle, MinusCircle, Printer, User, Phone, ShoppingCart, Loader2, Ticket, XCircle, Percent, DollarSign, Eraser, Sparkles, CheckCircle2 } from 'lucide-react';
import type { CartItem, PrintRequestData, RestaurantProfile } from '@/types';
import { toast } from '@/hooks/use-toast';

interface OrderCartProps {
  onPrintRequest: (data: PrintRequestData) => void;
  restaurantProfile: RestaurantProfile | null;
}

export default function OrderCart({ onPrintRequest, restaurantProfile }: OrderCartProps) {
  const {
    items,
    removeItem,
    updateItemQuantity,
    customerName,
    customerMobile,
    setCustomerInfo,
    triggerLoyalCustomerCheck, // New from context
    appliedLoyalCustomerDiscount, // New from context
    appliedVoucher,
    voucherError,
    isVoucherLoading,
    applyVoucher,
    removeVoucher,
    manualDiscountType,
    manualDiscountValue,
    applyManualDiscount,
    removeManualDiscount,
    clearActiveDiscount, // New from context
    getSubtotal,
    getDiscountAmount,
    getTotal,
    finalizeOrder,
  } = useOrder();

  const [currentVoucherCode, setCurrentVoucherCode] = useState('');
  const [currentCustomerName, setCurrentCustomerName] = useState(customerName);
  const [currentCustomerMobile, setCurrentCustomerMobile] = useState(customerMobile);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);

  const [currentManualDiscountType, setCurrentManualDiscountType] = useState<'percentage' | 'fixed'>(manualDiscountType);
  const [currentManualDiscountValue, setCurrentManualDiscountValue] = useState<string>(manualDiscountValue > 0 ? manualDiscountValue.toString() : '');


  useEffect(() => {
    setCurrentCustomerName(customerName);
  }, [customerName]);

  useEffect(() => {
    setCurrentCustomerMobile(customerMobile);
  }, [customerMobile]);

  useEffect(() => {
    setCurrentManualDiscountType(manualDiscountType);
    setCurrentManualDiscountValue(manualDiscountValue > 0 ? manualDiscountValue.toString() : '');
  }, [manualDiscountType, manualDiscountValue]);

  const handleCustomerMobileBlur = async () => {
    setCustomerInfo(currentCustomerName, currentCustomerMobile); // Update context with potentially new name
    if (currentCustomerMobile.trim()) {
      await triggerLoyalCustomerCheck(currentCustomerMobile.trim());
    } else {
      // If mobile is cleared, ensure any loyal customer discount is also cleared
      if(appliedLoyalCustomerDiscount) clearActiveDiscount();
    }
  };
  
  const handleCustomerNameBlur = () => {
      setCustomerInfo(currentCustomerName, currentCustomerMobile);
  }

  const handleApplyVoucher = async () => {
    if (!currentVoucherCode.trim()) {
      toast({ title: "Voucher Code Required", description: "Please enter a voucher code to apply.", variant: "destructive"});
      return;
    }
    await applyVoucher(currentVoucherCode);
    // No need to clear manual discount here, applyVoucher in context handles it
  };

  const handleRemoveVoucher = () => {
    removeVoucher();
    setCurrentVoucherCode('');
  };

  const handleApplyManualDiscount = () => {
    const value = parseFloat(currentManualDiscountValue);
    if (isNaN(value) || value < 0) {
      toast({ title: "Invalid Discount", description: "Please enter a valid positive discount value.", variant: "destructive" });
      return;
    }
    if (currentManualDiscountType === 'percentage' && value > 100) {
        toast({ title: "Invalid Percentage", description: "Percentage discount cannot exceed 100%.", variant: "destructive" });
        return;
    }
    applyManualDiscount(currentManualDiscountType, value);
    // No need to clear voucher here, applyManualDiscount in context handles it
  };

  const handleRemoveManualDiscount = () => {
    removeManualDiscount();
  }

  const handleSaveAndPrint = async () => {
    setIsProcessingOrder(true);
    // Ensure latest customer info is in context if it was typed but not blurred
    setCustomerInfo(currentCustomerName, currentCustomerMobile); 
    // If mobile was updated and loyal check not yet run, run it
    if (customerMobile !== currentCustomerMobile && currentCustomerMobile.trim()) {
        await triggerLoyalCustomerCheck(currentCustomerMobile.trim());
    }


    // Give a slight delay for loyal customer check to potentially complete
    // This is a bit of a hack; ideally, state updates from loyal check would be awaited.
    // For now, it might mean the very first order might not pick it up if mobile is typed last and print clicked fast.
    await new Promise(resolve => setTimeout(resolve, 300));


    const order = await finalizeOrder();
    if (order) {
      onPrintRequest({ order, profile: restaurantProfile });
    }
    setIsProcessingOrder(false);
  };

  const subtotal = getSubtotal();
  const discountAmount = getDiscountAmount();
  const total = getTotal();

  const isProcessing = isProcessingOrder || isVoucherLoading; // isVoucherLoading now includes loyal customer check

  return (
    <Card className="h-full flex flex-col shadow-xl">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center text-xl">
          <ShoppingCart className="mr-2 h-6 w-6 text-accent" />
          Order Cart
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-grow overflow-hidden">
        <ScrollArea className="h-full p-3">
          {items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Your cart is empty.</p>
          ) : (
            <ul className="space-y-2.5">
              {items.map((item: CartItem) => (
                <li key={item.id} className="flex items-center space-x-2 p-2 bg-secondary/30 rounded-lg shadow-sm">
                  <img src={item.imageUrl} alt={item.name} data-ai-hint={item.dataAiHint} className="w-12 h-12 object-cover rounded-md" />
                  <div className="flex-grow">
                    <p className="font-semibold text-xs leading-tight">{item.name}</p>
                    <p className="text-xs text-muted-foreground">${item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateItemQuantity(item.id, item.quantity - 1)} aria-label="Decrease quantity" disabled={isProcessing}>
                      <MinusCircle className="h-3.5 w-3.5" />
                    </Button>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 0)}
                      className="w-10 text-center h-7 text-sm px-1.5 py-1"
                      aria-label={`${item.name} quantity`}
                      disabled={isProcessing}
                    />
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateItemQuantity(item.id, item.quantity + 1)} aria-label="Increase quantity" disabled={isProcessing}>
                      <PlusCircle className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="text-destructive hover:text-destructive/80 h-6 w-6" aria-label={`Remove ${item.name}`} disabled={isProcessing}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-2.5 border-t flex-col space-y-2">
        <div className="w-full">
          <Label htmlFor="customerName" className="flex items-center mb-0.5 text-xs"><User className="mr-1.5 h-3 w-3"/>Customer Name</Label>
          <Input
            id="customerName"
            placeholder="Optional"
            value={currentCustomerName}
            onChange={(e) => setCurrentCustomerName(e.target.value)}
            onBlur={handleCustomerNameBlur}
            className="h-8 text-xs"
            disabled={isProcessing}
          />
        </div>
        <div className="w-full">
          <Label htmlFor="customerMobile" className="flex items-center mb-0.5 text-xs"><Phone className="mr-1.5 h-3 w-3"/>Mobile Number</Label>
          <Input
            id="customerMobile"
            placeholder="Optional (for loyal discounts)"
            value={currentCustomerMobile}
            onChange={(e) => setCurrentCustomerMobile(e.target.value)}
            onBlur={handleCustomerMobileBlur}
            className="h-8 text-xs"
            disabled={isProcessing}
          />
        </div>
         {appliedLoyalCustomerDiscount && (
            <div className="w-full p-2 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-md text-center">
              <p className="text-xs text-green-700 dark:text-green-300 font-semibold flex items-center justify-center">
                <Sparkles className="h-4 w-4 mr-1.5" />
                Loyal Customer Discount Active!
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                {appliedLoyalCustomerDiscount.customerName ? `${appliedLoyalCustomerDiscount.customerName} - ` : ''}
                {appliedLoyalCustomerDiscount.discountValue}{appliedLoyalCustomerDiscount.discountType === 'percentage' ? '%' : '$'} off.
              </p>
            </div>
        )}

        <div className="w-full space-y-1">
          <Label htmlFor="voucherCode" className="text-xs flex items-center"><Ticket className="mr-1.5 h-3.5 w-3.5"/>Voucher Code</Label>
          <div className="flex space-x-1.5">
            <Input
              id="voucherCode"
              placeholder="Enter voucher"
              value={currentVoucherCode}
              onChange={(e) => setCurrentVoucherCode(e.target.value)}
              className="flex-grow h-8 text-xs"
              disabled={isProcessing || !!appliedLoyalCustomerDiscount}
            />
            {appliedVoucher ? (
              <Button onClick={handleRemoveVoucher} variant="outline" size="sm" className="h-8 px-2.5 text-xs" disabled={isProcessing || !!appliedLoyalCustomerDiscount}>
                <XCircle className="mr-1 h-4 w-4"/> Remove
              </Button>
            ) : (
              <Button onClick={handleApplyVoucher} variant="outline" size="sm" className="h-8 px-2.5 text-xs" disabled={isProcessing || !currentVoucherCode.trim() || !!appliedLoyalCustomerDiscount}>
                {isVoucherLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : "Apply"}
              </Button>
            )}
          </div>
          {voucherError && !appliedVoucher && <p className="text-xs text-destructive mt-0.5">{voucherError}</p>}
          {appliedVoucher && !appliedLoyalCustomerDiscount && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-0.5 flex items-center">
             <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-500"/> Voucher "{appliedVoucher.code}" applied: {appliedVoucher.discountType === 'percentage' ? `${appliedVoucher.discountValue}%` : `$${appliedVoucher.discountValue.toFixed(2)}`} off.
            </p>
          )}
        </div>

        <div className="w-full space-y-1">
          <Label className="text-xs flex items-center"><DollarSign className="mr-1.5 h-3.5 w-3.5"/>Manual Discount</Label>
          <div className="flex space-x-1.5 items-center">
            <Select
              value={currentManualDiscountType}
              onValueChange={(value: 'percentage' | 'fixed') => setCurrentManualDiscountType(value)}
              disabled={isProcessing || !!appliedLoyalCustomerDiscount || !!appliedVoucher}
            >
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed ($)</SelectItem>
                <SelectItem value="percentage">Percent (%)</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Value"
              value={currentManualDiscountValue}
              onChange={(e) => setCurrentManualDiscountValue(e.target.value)}
              className="flex-grow h-8 text-xs"
              disabled={isProcessing || !!appliedLoyalCustomerDiscount || !!appliedVoucher}
            />
            {manualDiscountValue > 0 ? (
                 <Button onClick={handleRemoveManualDiscount} variant="outline" size="sm" className="h-8 px-2.5 text-xs" disabled={isProcessing || !!appliedLoyalCustomerDiscount || !!appliedVoucher}>
                    <Eraser className="mr-1 h-3.5 w-3.5"/> Clear
                </Button>
            ) : (
                <Button onClick={handleApplyManualDiscount} variant="outline" size="sm" className="h-8 px-2.5 text-xs" disabled={isProcessing || !!appliedLoyalCustomerDiscount || !!appliedVoucher || !currentManualDiscountValue.trim() || parseFloat(currentManualDiscountValue) <= 0}>
                    Apply
                </Button>
            )}
          </div>
           {manualDiscountValue > 0 && !appliedLoyalCustomerDiscount && !appliedVoucher && (
             <p className="text-xs text-green-600 dark:text-green-400 mt-0.5 flex items-center">
               <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-500"/> Manual discount: {manualDiscountType === 'percentage' ? `${manualDiscountValue}%` : `$${parseFloat(currentManualDiscountValue || "0").toFixed(2)}`} off.
             </p>
           )}
        </div>

        <div className="w-full space-y-0.5 text-right mt-1">
          <p className="text-xs">Subtotal: <span className="font-semibold">${subtotal.toFixed(2)}</span></p>
          {discountAmount > 0 && (
            <p  className="text-xs">Discount: <span className="font-semibold text-accent">-${discountAmount.toFixed(2)}</span></p>
          )}
          <p className="text-base font-bold">Total: <span className="text-accent">${total.toFixed(2)}</span></p>
        </div>

        <div className="w-full flex space-x-2 mt-1">
           <Button onClick={handleSaveAndPrint} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-9 text-sm" disabled={items.length === 0 || isProcessing}>
             {isProcessingOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
             {isProcessingOrder ? 'Processing...' : 'Save & Print'}
           </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
