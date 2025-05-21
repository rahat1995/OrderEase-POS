
"use client";

import type { Order, RestaurantProfile } from '@/types';
import { format } from 'date-fns';
import Image from 'next/image';

interface PrintReceiptProps {
  order: Order | null;
  profile: RestaurantProfile | null;
}

export default function PrintReceipt({ order, profile }: PrintReceiptProps) {
  if (!order) return null;

  return (
    <div id="print-receipt" className="p-2 bg-white text-black font-mono text-xs">
      {profile && (
        <div className="text-center mb-2">
          {profile.logoUrl && (
            <Image 
              src={profile.logoUrl} 
              alt={profile.name || "Logo"} 
              width={80} 
              height={40} 
              className="mx-auto my-1 object-contain print-receipt-logo"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          )}
          <h2 className="text-base font-bold">{profile.name || 'Your Restaurant'}</h2>
          {profile.address && <p className="text-xs">{profile.address}</p>}
          {profile.contactNumber && <p className="text-xs">Contact: {profile.contactNumber}</p>}
        </div>
      )}
      <hr className="my-1 border-black" />
      <div className="text-center mb-1">
        <p className="text-xs">Date: {format(new Date(order.orderDate), 'yyyy-MM-dd HH:mm:ss')}</p>
        <p className="text-xs">Receipt No / Token: {order.token}</p>
      </div>

      {order.customerName && <p className="text-xs">Customer: {order.customerName}</p>}
      {order.customerMobile && <p className="text-xs">Mobile: {order.customerMobile}</p>}
      
      <hr className="my-1 border-black" />
      
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="text-left font-semibold">Item</th>
            <th className="text-center font-semibold">Qty</th>
            <th className="text-right font-semibold">Price</th>
            <th className="text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td className="py-0.5">{item.name}</td>
              <td className="text-center py-0.5">{item.quantity}</td>
              <td className="text-right py-0.5">${item.price.toFixed(2)}</td>
              <td className="text-right py-0.5">${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr className="my-1 border-black" />

      <div className="text-right mt-1">
        <p>Subtotal: ${order.subtotal.toFixed(2)}</p>
        {order.discountAmount > 0 && (
          <p>Discount: -${order.discountAmount.toFixed(2)}</p>
        )}
         {(order.appliedVoucherCode || order.manualDiscountValue) && (
          <p className="text-xs italic">
            (
            {order.appliedVoucherCode 
              ? `Voucher: ${order.appliedVoucherCode}` 
              : `Manual: ${order.manualDiscountValue}${order.manualDiscountType === 'percentage' ? '%' : '$'}`
            }
            )
          </p>
        )}
        <p className="font-bold text-sm">Total: ${order.total.toFixed(2)}</p>
      </div>
      
      <div className="text-center mt-3">
        <p>Thank you for your order!</p>
        {/* KOT Specific Section - for kitchen */}
        <div className="mt-2 pt-2 border-t border-dashed border-black">
            <p className="font-bold text-sm">KITCHEN ORDER TICKET (KOT)</p>
            <p className="text-xs">Token: {order.token}</p>
            <p className="text-xs">Date: {format(new Date(order.orderDate), 'HH:mm')}</p>
            <table className="w-full text-xs mt-1">
                <thead>
                <tr>
                    <th className="text-left font-semibold">Item</th>
                    <th className="text-right font-semibold">Qty</th>
                </tr>
                </thead>
                <tbody>
                {order.items.map((item) => (
                    <tr key={`kot-${item.id}`}>
                    <td className="py-0.5">{item.name}</td>
                    <td className="text-right py-0.5">{item.quantity}</td>
                    </tr>
                ))}
                </tbody>
            </table>
             {order.customerName && <p className="text-xs mt-1">Customer: {order.customerName}</p>}
        </div>
      </div>
    </div>
  );
}
