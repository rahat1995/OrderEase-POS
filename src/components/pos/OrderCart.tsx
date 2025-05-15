
"use client";

import React, { useState, useEffect } from 'react';
import { useOrder } from '@/contexts/OrderContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, PlusCircle, MinusCircle, Printer, User, Phone, ShoppingCart } from 'lucide-react';
import type { CartItem } from '@/types';

interface OrderCartProps {
  onPrint: (orderId: string) => void;
}

export default function OrderCart({ onPrint }: OrderCartProps) {
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
    finalizeOrder,
    clearOrder,
  } = useOrder();

  const [currentDiscountValue, setCurrentDiscountValue] = useState(discountValue.toString());
  const [currentDiscountType, setCurrentDiscountType] = useState<'percentage' | 'fixed'>(discountType);
  const [currentCustomerName, setCurrentCustomerName] = useState(customerName);
  const [currentCustomerMobile, setCurrentCustomerMobile] = useState(customerMobile);

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
  
  const handlePrint = () => {
    // Set customer info before finalizing, in case it was typed but not explicitly saved
    setCustomerInfo(currentCustomerName, currentCustomerMobile); 
    const order = finalizeOrder();
    if (order) {
      onPrint(order.id); // Pass order ID or token to parent for printing
      // The context's clearOrder will be called by the parent page after printing is initiated.
    }
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
            <ul className="space-y-4">
              {items.map((item: CartItem) => (
                <li key={item.id} className="flex items-center space-x-3 p-3 bg-secondary/30 rounded-lg">
                  <img src={item.imageUrl} alt={item.name} data-ai-hint={item.dataAiHint} className="w-16 h-16 object-cover rounded-md" />
                  <div className="flex-grow">
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-muted-foreground">${item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => updateItemQuantity(item.id, item.quantity - 1)} aria-label="Decrease quantity">
                      <MinusCircle className="h-5 w-5" />
                    </Button>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 0)}
                      className="w-12 text-center h-9"
                      aria-label={`${item.name} quantity`}
                    />
                    <Button variant="ghost" size="icon" onClick={() => updateItemQuantity(item.id, item.quantity + 1)} aria-label="Increase quantity">
                      <PlusCircle className="h-5 w-5" />
                    </Button>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="text-destructive hover:text-destructive/80" aria-label={`Remove ${item.name}`}>
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-4 border-t flex-col space-y-4">
        <div>
          <Label htmlFor="customerName" className="flex items-center mb-1"><User className="mr-2 h-4 w-4"/>Customer Name (Optional)</Label>
          <Input 
            id="customerName" 
            placeholder="John Doe" 
            value={currentCustomerName}
            onChange={(e) => setCurrentCustomerName(e.target.value)}
            onBlur={handleSetCustomerInfo}
          />
        </div>
        <div>
          <Label htmlFor="customerMobile" className="flex items-center mb-1"><Phone className="mr-2 h-4 w-4"/>Mobile Number (Optional)</Label>
          <Input 
            id="customerMobile" 
            placeholder="555-1234" 
            value={currentCustomerMobile}
            onChange={(e) => setCurrentCustomerMobile(e.target.value)}
            onBlur={handleSetCustomerInfo}
          />
        </div>
        <div className="w-full">
          <Label htmlFor="discountValue" className="mb-1 block">Discount</Label>
          <div className="flex space-x-2">
            <Input
              id="discountValue"
              type="number"
              placeholder="e.g. 10"
              value={currentDiscountValue}
              onChange={(e) => setCurrentDiscountValue(e.target.value)}
              className="flex-grow"
            />
            <Select value={currentDiscountType} onValueChange={(value: 'percentage' | 'fixed') => setCurrentDiscountType(value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">%</SelectItem>
                <SelectItem value="fixed">$</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleApplyDiscount} variant="outline">Apply</Button>
          </div>
        </div>
        
        <div className="w-full space-y-1 text-right">
          <p>Subtotal: <span className="font-semibold">${subtotal.toFixed(2)}</span></p>
          {discountAmount > 0 && (
            <p>Discount: <span className="font-semibold text-accent">-${discountAmount.toFixed(2)}</span></p>
          )}
          <p className="text-xl font-bold">Total: <span className="text-accent">${total.toFixed(2)}</span></p>
        </div>
        
        <div className="w-full flex space-x-2 mt-2">
           <Button onClick={clearOrder} variant="outline" className="w-full">Clear Cart</Button>
           <Button onClick={handlePrint} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={items.length === 0}>
             <Printer className="mr-2 h-5 w-5" /> Save & Print
           </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

