
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import type { Order } from '@/types';

export async function saveOrderAction(order: Order): Promise<{ success: boolean; orderId?: string; error?: string }> {
  try {
    // Convert ISO date string to Firestore Timestamp for proper date querying
    const orderToSave = {
      ...order,
      orderDate: Timestamp.fromDate(new Date(order.orderDate)),
    };
    const docRef = await addDoc(collection(db, 'orders'), orderToSave);
    console.log('Order saved with ID: ', docRef.id);
    return { success: true, orderId: docRef.id };
  } catch (e) {
    console.error('Error adding document: ', e);
    return { success: false, error: e instanceof Error ? e.message : 'An unknown error occurred' };
  }
}

export async function fetchOrdersAction(startDate?: string, endDate?: string): Promise<Order[]> {
  try {
    const ordersCol = collection(db, 'orders');
    let q = query(ordersCol);

    if (startDate) {
      q = query(q, where('orderDate', '>=', Timestamp.fromDate(new Date(startDate))));
    }
    if (endDate) {
      // Adjust end date to include the entire day
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      q = query(q, where('orderDate', '<=', Timestamp.fromDate(endOfDay)));
    }
    
    const querySnapshot = await getDocs(q);
    const orders = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id, // Use Firestore document ID as the order ID
        orderDate: (data.orderDate as Timestamp).toDate().toISOString(), // Convert Timestamp back to ISO string
      } as Order;
    });
    return orders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()); // Sort by most recent
  } catch (error) {
    console.error("Error fetching orders: ", error);
    return [];
  }
}
