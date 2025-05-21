
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, Timestamp, orderBy } from 'firebase/firestore';
import type { Order } from '@/types';
import { incrementVoucherUsageAction } from './voucherActions'; // New import

export async function saveOrderAction(order: Order): Promise<{ success: boolean; orderId?: string; error?: string }> {
  try {
    const orderToSave = {
      ...order,
      orderDate: Timestamp.fromDate(new Date(order.orderDate)),
    };
    const docRef = await addDoc(collection(db, 'orders'), orderToSave);
    console.log('Order saved with ID: ', docRef.id);

    // If a voucher was applied, increment its usage count
    if (order.appliedVoucherCode) {
      // We need the voucher's document ID, not just its code, to increment.
      // This assumes `validateVoucherAction` (or similar logic) would have fetched the voucher's ID.
      // For now, we'll assume the voucher code is unique and we can query by it.
      // A more robust approach might involve passing voucherId to saveOrderAction.
      const vouchersCol = collection(db, 'vouchers');
      const voucherQuery = query(vouchersCol, where('codeLower', '==', order.appliedVoucherCode.toLowerCase()));
      const voucherSnapshot = await getDocs(voucherQuery);

      if (!voucherSnapshot.empty) {
        const voucherId = voucherSnapshot.docs[0].id;
        const incrementResult = await incrementVoucherUsageAction(voucherId);
        if (!incrementResult.success) {
          console.warn(`Failed to increment usage for voucher ${order.appliedVoucherCode}: ${incrementResult.error}`);
          // Decide if this should be a critical error. For now, we'll just log it.
        }
      } else {
        console.warn(`Voucher code ${order.appliedVoucherCode} not found for incrementing usage.`);
      }
    }

    return { success: true, orderId: docRef.id };
  } catch (e) {
    console.error('Error adding document: ', e);
    return { success: false, error: e instanceof Error ? e.message : 'An unknown error occurred' };
  }
}

export async function fetchOrdersAction(
  startDate?: string,
  endDate?: string,
  customerName?: string,
  customerMobile?: string
): Promise<Order[]> {
  try {
    const ordersCol = collection(db, 'orders');
    let q = query(ordersCol); 

    if (startDate) {
      q = query(q, where('orderDate', '>=', Timestamp.fromDate(new Date(startDate))));
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      q = query(q, where('orderDate', '<=', Timestamp.fromDate(endOfDay)));
    }

    if (customerName && customerName.trim() !== '') {
      q = query(q, where('customerName', '==', customerName.trim()));
    }

    if (customerMobile && customerMobile.trim() !== '') {
      q = query(q, where('customerMobile', '==', customerMobile.trim()));
    }
    
    q = query(q, orderBy('orderDate', 'desc'));


    const querySnapshot = await getDocs(q);
    const orders = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id, 
        orderDate: (data.orderDate as Timestamp).toDate().toISOString(), 
      } as Order;
    });
    return orders;
  } catch (error) {
    console.error("Error fetching orders: ", error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }
    throw new Error("An unknown error occurred while fetching orders.");
  }
}
