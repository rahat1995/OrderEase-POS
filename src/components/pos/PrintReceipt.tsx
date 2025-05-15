
"use client";

import type { Order } from '@/types';
import { format } from 'date-fns';

interface PrintReceiptProps {
  order: Order | null;
}

export default function PrintReceipt({ order }: PrintReceiptProps) {
  if (!order) return null;

  return (
    <div id="print-receipt" className="p-2 bg-white text-black font-mono text-xs">
      <div className="text-center mb-2">
        <h2 className="text-lg font-bold">OrderEase POS</h2>
        <p>Thank you for your order!</p>
        <p>Date: {format(new Date(order.orderDate), 'yyyy-MM-dd HH:mm:ss')}</p>
      </div>

      {order.customerName && <p>Customer: {order.customerName}</p>}
      {order.customerMobile && <p>Mobile: {order.customerMobile}</p>}
      
      <hr className="my-2 border-black" />
      
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="text-left">Item</th>
            <th className="text-center">Qty</th>
            <th className="text-right">Price</th>
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td className="text-center">{item.quantity}</td>
              <td className="text-right">${item.price.toFixed(2)}</td>
              <td className="text-right">${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr className="my-2 border-black" />

      <div className="text-right">
        <p>Subtotal: ${order.subtotal.toFixed(2)}</p>
        {order.discountAmount > 0 && (
          <p>Discount: -${order.discountAmount.toFixed(2)}</p>
        )}
        <p className="font-bold text-sm">Total: ${order.total.toFixed(2)}</p>
      </div>

      <div className="text-center mt-4">
        <p className="font-bold">TOKEN NUMBER:</p>
        <p className="token-number">{order.token}</p>
      </div>
      
      <div className="text-center mt-2">
        <p>Please present this receipt to the kitchen.</p>
        <p>--- KITCHEN COPY ---</p>
      </div>
       <div className="text-center mt-6">
        <p>--- CUSTOMER COPY ---</p>
      </div>
    </div>
  );
}
