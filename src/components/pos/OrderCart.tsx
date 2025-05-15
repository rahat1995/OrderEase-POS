
"use client";

import React, { useState, useEffect } from 'react';
import { useOrder } from '@/contexts/OrderContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, PlusCircle, MinusCircle, Printer, User, Phone, ShoppingCart, Loader2 } from 'lucide-react';
import type { CartItem, Order } from '@/types'; // Added Order type

interface OrderCartProps {
  onPrintRequest: (order: Order | null) => void; // Changed prop name and type
}

export default function OrderCart({ onPrintRequest }: OrderCartProps) {
  const {
    items,
    removeItem,
    updateItemQuantity,
    discountValue,
    discountType,
    applyDiscount,
    customerName,
    customerMobile,
    setCustomerInfo,
    getSubtotal,
    getDiscountAmount,
    getTotal,
    finalizeOrder, // This is now async
    clearOrder,
  } = useOrder();

  const [currentDiscountValue, setCurrentDiscountValue] = useState(discountValue.toString());
  const [currentDiscountType, setCurrentDiscountType] = useState<'percentage' | 'fixed'>(discountType);
  const [currentCustomerName, setCurrentCustomerName] = useState(customerName);
  const [currentCustomerMobile, setCurrentCustomerMobile] = useState(customerMobile);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setCurrentDiscountValue(discountValue.toString());
  }, [discountValue]);

  useEffect(() => {
    setCurrentDiscountType(discountType);
  }, [discountType]);
  
  useEffect(() => {
    setCurrentCustomerName(customerName);
    setCurrentCustomerMobile(customerMobile);
  }, [customerName, customerMobile]);


  const handleApplyDiscount = () => {
    const numericValue = parseFloat(currentDiscountValue);
    if (!isNaN(numericValue)) {
      applyDiscount(numericValue, currentDiscountType);
    }
  };

  const handleSetCustomerInfo = () => {
    setCustomerInfo(currentCustomerName, currentCustomerMobile);
  };
  
  const handleSaveAndPrint = async () => {
    setIsProcessing(true);
    // Set customer info before finalizing, in case it was typed but not explicitly saved
    setCustomerInfo(currentCustomerName, currentCustomerMobile); 
    
    const order = await finalizeOrder(); // finalizeOrder is now async
    
    onPrintRequest(order); // Pass the full order object (or null if failed)
    // The context's clearOrder will be called by PosClientPage after printing is initiated and order is processed.
    setIsProcessing(false);
  };

  const subtotal = getSubtotal();
  const discountAmount = getDiscountAmount();
  const total = getTotal();

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
                      className="w-10 text-center h-7 text-sm"
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
            onBlur={handleSetCustomerInfo}
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
            onBlur={handleSetCustomerInfo}
            className="h-8 text-xs"
            disabled={isProcessing}
          />
        </div>
        <div className="w-full">
          <Label htmlFor="discountValue" className="mb-1 block text-xs">Discount</Label>
          <div className="flex space-x-1.5">
            <Input
              id="discountValue"
              type="number"
              placeholder="e.g. 10"
              value={currentDiscountValue}
              onChange={(e) => setCurrentDiscountValue(e.target.value)}
              className="flex-grow h-8 text-xs"
              disabled={isProcessing}
            />
            <Select value={currentDiscountType} onValueChange={(value: 'percentage' | 'fixed') => setCurrentDiscountType(value)} disabled={isProcessing}>
              <SelectTrigger className="w-[90px] h-8 text-xs">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed" className="text-xs">$</SelectItem>
                <SelectItem value="percentage" className="text-xs">%</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleApplyDiscount} variant="outline" size="sm" className="h-8 px-2.5 text-xs" disabled={isProcessing}>Apply</Button>
          </div>
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
             {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
             {isProcessing ? 'Processing...' : 'Save & Print'}
           </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
