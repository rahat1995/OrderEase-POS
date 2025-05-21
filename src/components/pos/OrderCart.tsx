
"use client";

import React, { useState, useEffect } from 'react';
import { useOrder } from '@/contexts/OrderContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, PlusCircle, MinusCircle, Printer, User, Phone, ShoppingCart, Loader2, Ticket, XCircle, Percent, DollarSign, Eraser } from 'lucide-react';
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
    manualDiscountType,
    manualDiscountValue,
    applyManualDiscount,
    removeManualDiscount,
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

  // State for manual discount inputs
  const [currentManualDiscountType, setCurrentManualDiscountType] = useState<'percentage' | 'fixed'>(manualDiscountType);
  const [currentManualDiscountValue, setCurrentManualDiscountValue] = useState<string>(manualDiscountValue > 0 ? manualDiscountValue.toString() : '');

  useEffect(() => {
    setCurrentCustomerName(customerName);
    setCurrentCustomerMobile(customerMobile);
  }, [customerName, customerMobile]);

  useEffect(() => {
    setCurrentManualDiscountType(manualDiscountType);
    setCurrentManualDiscountValue(manualDiscountValue > 0 ? manualDiscountValue.toString() : '');
  }, [manualDiscountType, manualDiscountValue]);


  const handleApplyVoucher = async () => {
    if (!currentVoucherCode.trim()) {
      toast({ title: "Voucher Code Required", description: "Please enter a voucher code to apply.", variant: "destructive"});
      return;
    }
    await applyVoucher(currentVoucherCode);
    // If voucher applied successfully, context clears manual discount. Update local state:
    if (appliedVoucher) {
        setCurrentManualDiscountType('fixed');
        setCurrentManualDiscountValue('');
    }
  };

  const handleRemoveVoucher = () => {
    removeVoucher();
    setCurrentVoucherCode(''); // Clear input field as well
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
    // If manual discount applied, context clears voucher. Update local state:
    setCurrentVoucherCode('');
  };

  const handleRemoveManualDiscount = () => {
    removeManualDiscount();
    setCurrentManualDiscountType('fixed');
    setCurrentManualDiscountValue('');
  }

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
  const hasActiveDiscount = !!appliedVoucher || manualDiscountValue > 0;

  return (
    <Card className="h-full flex flex-col shadow-xl">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center text-xl"> {/* Reduced size */}
          <ShoppingCart className="mr-2 h-6 w-6 text-accent" />
          Order Cart
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-grow overflow-hidden">
        <ScrollArea className="h-full p-3"> {/* Reduced padding */}
          {items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Your cart is empty.</p>
          ) : (
            <ul className="space-y-2.5"> {/* Reduced space */}
              {items.map((item: CartItem) => (
                <li key={item.id} className="flex items-center space-x-2 p-2 bg-secondary/30 rounded-lg shadow-sm"> {/* Reduced padding */}
                  <img src={item.imageUrl} alt={item.name} data-ai-hint={item.dataAiHint} className="w-12 h-12 object-cover rounded-md" /> {/* Reduced image size */}
                  <div className="flex-grow">
                    <p className="font-semibold text-xs leading-tight">{item.name}</p> {/* Reduced font size */}
                    <p className="text-xs text-muted-foreground">${item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center space-x-1"> {/* Reduced space */}
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateItemQuantity(item.id, item.quantity - 1)} aria-label="Decrease quantity" disabled={isProcessing}>
                      <MinusCircle className="h-3.5 w-3.5" />
                    </Button>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 0)}
                      className="w-8 text-center h-6 text-xs px-1 py-0.5" /* Reduced size & padding */
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
      <CardFooter className="p-2.5 border-t flex-col space-y-2"> {/* Reduced padding */}
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
        
        {/* Voucher Section */}
        <div className="w-full space-y-1">
          <Label htmlFor="voucherCode" className="text-xs flex items-center"><Ticket className="mr-1.5 h-3.5 w-3.5"/>Voucher Code</Label>
          <div className="flex space-x-1.5">
            <Input
              id="voucherCode"
              placeholder="Enter voucher"
              value={currentVoucherCode}
              onChange={(e) => setCurrentVoucherCode(e.target.value)}
              className="flex-grow h-8 text-xs"
              disabled={isProcessing || !!appliedVoucher || manualDiscountValue > 0}
            />
            {appliedVoucher ? (
              <Button onClick={handleRemoveVoucher} variant="outline" size="sm" className="h-8 px-2.5 text-xs" disabled={isProcessing}>
                <XCircle className="mr-1 h-4 w-4"/> Remove
              </Button>
            ) : (
              <Button onClick={handleApplyVoucher} variant="outline" size="sm" className="h-8 px-2.5 text-xs" disabled={isProcessing || !currentVoucherCode.trim() || manualDiscountValue > 0}>
                {isVoucherLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : "Apply"}
              </Button>
            )}
          </div>
          {voucherError && !appliedVoucher && <p className="text-xs text-destructive mt-0.5">{voucherError}</p>}
          {appliedVoucher && (
            <p className="text-xs text-green-600 mt-0.5">
              Voucher "{appliedVoucher.code}" applied: {appliedVoucher.discountType === 'percentage' ? `${appliedVoucher.discountValue}%` : `$${appliedVoucher.discountValue.toFixed(2)}`} off.
            </p>
          )}
        </div>

        {/* Manual Discount Section */}
        <div className="w-full space-y-1">
          <Label className="text-xs flex items-center"><DollarSign className="mr-1.5 h-3.5 w-3.5"/>Manual Discount</Label>
          <div className="flex space-x-1.5 items-center">
            <Select 
              value={currentManualDiscountType} 
              onValueChange={(value: 'percentage' | 'fixed') => setCurrentManualDiscountType(value)}
              disabled={isProcessing || !!appliedVoucher}
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
              disabled={isProcessing || !!appliedVoucher}
            />
            {manualDiscountValue > 0 ? (
                 <Button onClick={handleRemoveManualDiscount} variant="outline" size="sm" className="h-8 px-2.5 text-xs" disabled={isProcessing || !!appliedVoucher}>
                    <Eraser className="mr-1 h-3.5 w-3.5"/> Clear
                </Button>
            ) : (
                <Button onClick={handleApplyManualDiscount} variant="outline" size="sm" className="h-8 px-2.5 text-xs" disabled={isProcessing || !!appliedVoucher || !currentManualDiscountValue.trim() || parseFloat(currentManualDiscountValue) <= 0}>
                    Apply
                </Button>
            )}
          </div>
           {manualDiscountValue > 0 && !appliedVoucher && (
             <p className="text-xs text-green-600 mt-0.5">
               Manual discount: {manualDiscountType === 'percentage' ? `${manualDiscountValue}%` : `$${parseFloat(manualDiscountValue).toFixed(2)}`} off.
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
