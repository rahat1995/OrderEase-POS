
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, Timestamp, orderBy } from 'firebase/firestore';
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

export async function fetchOrdersAction(
  startDate?: string,
  endDate?: string,
  customerName?: string,
  customerMobile?: string
): Promise<Order[]> {
  try {
    const ordersCol = collection(db, 'orders');
    let q = query(ordersCol); // Base query

    // Apply date filters
    if (startDate) {
      q = query(q, where('orderDate', '>=', Timestamp.fromDate(new Date(startDate))));
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      q = query(q, where('orderDate', '<=', Timestamp.fromDate(endOfDay)));
    }

    // Apply customer name filter (exact match, case-sensitive)
    if (customerName && customerName.trim() !== '') {
      q = query(q, where('customerName', '==', customerName.trim()));
    }

    // Apply customer mobile filter (exact match)
    if (customerMobile && customerMobile.trim() !== '') {
      q = query(q, where('customerMobile', '==', customerMobile.trim()));
    }
    
    // Add ordering after all filters
    q = query(q, orderBy('orderDate', 'desc'));


    const querySnapshot = await getDocs(q);
    const orders = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id, // Use Firestore document ID as the order ID
        orderDate: (data.orderDate as Timestamp).toDate().toISOString(), // Convert Timestamp back to ISO string
      } as Order;
    });
    // Sorting is now handled by Firestore's orderBy
    return orders;
  } catch (error) {
    console.error("Error fetching orders: ", error);
    // Propagate the error to be handled by the client
    if (error instanceof Error) {
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }
    throw new Error("An unknown error occurred while fetching orders.");
  }
}
