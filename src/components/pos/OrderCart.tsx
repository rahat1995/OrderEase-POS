
"use client";

import React, { useState, useEffect } from 'react';
import { useOrder } from '@/contexts/OrderContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, PlusCircle, MinusCircle, Printer, User, Phone, ShoppingCart, Loader2, Ticket, XCircle } from 'lucide-react';
import type { CartItem, Order, Voucher } from '@/types'; 
import { toast } from '@/hooks/use-toast';

interface OrderCartProps {
  onPrintRequest: (order: Order | null) => void;
}

export default function OrderCart({ onPrintRequest }: OrderCartProps) {
  const {
    items,
    removeItem,
    updateItemQuantity,
    customerName,
    customerMobile,
    setCustomerInfo,
    appliedVoucher,
    voucherError,
    isVoucherLoading,
    applyVoucher,
    removeVoucher,
    getSubtotal,
    getDiscountAmount,
    getTotal,
    finalizeOrder,
    clearOrder,
  } = useOrder();

  const [currentVoucherCode, setCurrentVoucherCode] = useState('');
  const [currentCustomerName, setCurrentCustomerName] = useState(customerName);
  const [currentCustomerMobile, setCurrentCustomerMobile] = useState(customerMobile);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);

  useEffect(() => {
    setCurrentCustomerName(customerName);
    setCurrentCustomerMobile(customerMobile);
  }, [customerName, customerMobile]);

  const handleApplyVoucher = async () => {
    if (!currentVoucherCode.trim()) {
      toast({ title: "Voucher Code Required", description: "Please enter a voucher code to apply.", variant: "destructive"});
      return;
    }
    await applyVoucher(currentVoucherCode);
    // Don't clear currentVoucherCode here, user might want to see what they typed if it failed
  };
  
  const handleSetCustomerInfo = () => {
    setCustomerInfo(currentCustomerName, currentCustomerMobile);
  };
  
  const handleSaveAndPrint = async () => {
    setIsProcessingOrder(true);
    setCustomerInfo(currentCustomerName, currentCustomerMobile); 
    
    const order = await finalizeOrder();
    
    onPrintRequest(order); 
    setIsProcessingOrder(false);
    // clearOrder is called by PosClientPage after printing
  };

  const subtotal = getSubtotal();
  const discountAmount = getDiscountAmount();
  const total = getTotal();

  const isProcessing = isProcessingOrder || isVoucherLoading;

  return (
    <Card className="h-full flex flex-col shadow-xl">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center text-2xl">
          <ShoppingCart className="mr-2 h-7 w-7 text-accent" />
          Order Cart
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-grow overflow-hidden">
        <ScrollArea className="h-full p-4">
          {items.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">Your cart is empty.</p>
          ) : (
            <ul className="space-y-3">
              {items.map((item: CartItem) => (
                <li key={item.id} className="flex items-center space-x-2 p-2.5 bg-secondary/30 rounded-lg shadow-sm">
                  <img src={item.imageUrl} alt={item.name} data-ai-hint={item.dataAiHint} className="w-14 h-14 object-cover rounded-md" />
                  <div className="flex-grow">
                    <p className="font-semibold text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">${item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateItemQuantity(item.id, item.quantity - 1)} aria-label="Decrease quantity" disabled={isProcessing}>
                      <MinusCircle className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 0)}
                      className="w-10 text-center h-7 text-sm px-1.5 py-1"
                      aria-label={`${item.name} quantity`}
                      disabled={isProcessing}
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateItemQuantity(item.id, item.quantity + 1)} aria-label="Increase quantity" disabled={isProcessing}>
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="text-destructive hover:text-destructive/80 h-7 w-7" aria-label={`Remove ${item.name}`} disabled={isProcessing}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-3 border-t flex-col space-y-2.5">
        <div className="w-full">
          <Label htmlFor="customerName" className="flex items-center mb-0.5 text-xs"><User className="mr-1.5 h-3 w-3"/>Customer Name</Label>
          <Input 
            id="customerName" 
            placeholder="Optional" 
            value={currentCustomerName}
            onChange={(e) => setCurrentCustomerName(e.target.value)}
            onBlur={handleSetCustomerInfo} // Save on blur
            className="h-8 text-xs"
            disabled={isProcessing}
          />
        </div>
        <div className="w-full">
          <Label htmlFor="customerMobile" className="flex items-center mb-0.5 text-xs"><Phone className="mr-1.5 h-3 w-3"/>Mobile Number</Label>
          <Input 
            id="customerMobile" 
            placeholder="Optional" 
            value={currentCustomerMobile}
            onChange={(e) => setCurrentCustomerMobile(e.target.value)}
            onBlur={handleSetCustomerInfo} // Save on blur
            className="h-8 text-xs"
            disabled={isProcessing}
          />
        </div>
        
        {/* Voucher Section */}
        <div className="w-full">
          <Label htmlFor="voucherCode" className="mb-1 block text-xs flex items-center"><Ticket className="mr-1.5 h-3.5 w-3.5"/>Voucher Code</Label>
          <div className="flex space-x-1.5">
            <Input
              id="voucherCode"
              placeholder="Enter voucher code"
              value={currentVoucherCode}
              onChange={(e) => setCurrentVoucherCode(e.target.value)}
              className="flex-grow h-8 text-xs"
              disabled={isProcessing || !!appliedVoucher} // Disable if voucher applied or processing
            />
            {appliedVoucher ? (
              <Button onClick={removeVoucher} variant="outline" size="sm" className="h-8 px-2.5 text-xs" disabled={isProcessing}>
                <XCircle className="mr-1 h-4 w-4"/> Remove
              </Button>
            ) : (
              <Button onClick={handleApplyVoucher} variant="outline" size="sm" className="h-8 px-2.5 text-xs" disabled={isProcessing || !currentVoucherCode.trim()}>
                {isVoucherLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : "Apply"}
              </Button>
            )}
          </div>
          {voucherError && !appliedVoucher && <p className="text-xs text-destructive mt-1">{voucherError}</p>}
          {appliedVoucher && (
            <p className="text-xs text-green-600 mt-1">
              Voucher "{appliedVoucher.code}" applied: {appliedVoucher.discountType === 'percentage' ? `${appliedVoucher.discountValue}% off` : `$${appliedVoucher.discountValue.toFixed(2)} off`}.
            </p>
          )}
        </div>
        
        <div className="w-full space-y-0.5 text-right mt-1.5">
          <p className="text-xs">Subtotal: <span className="font-semibold">${subtotal.toFixed(2)}</span></p>
          {discountAmount > 0 && (
            <p  className="text-xs">Discount: <span className="font-semibold text-accent">-${discountAmount.toFixed(2)}</span></p>
          )}
          <p className="text-base font-bold">Total: <span className="text-accent">${total.toFixed(2)}</span></p>
        </div>
        
        <div className="w-full flex space-x-2 mt-1.5">
           <Button onClick={clearOrder} variant="outline" className="w-full h-9 text-sm" disabled={isProcessing}>Clear Cart</Button>
           <Button onClick={handleSaveAndPrint} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-9 text-sm" disabled={items.length === 0 || isProcessing}>
             {isProcessingOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
             {isProcessingOrder ? 'Processing...' : 'Save & Print'}
           </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
