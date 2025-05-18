
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, Timestamp, orderBy, writeBatch } from 'firebase/firestore';
import type { Supplier, SupplierPayment, CreateSupplierPaymentInput, PurchaseBill, SupplierBalance } from '@/types';
import { fetchSuppliersAction } from './supplierActions'; // To get supplier details

export async function calculateSupplierBalanceAction(supplierId: string, supplierName: string): Promise<{ totalBilled: number; totalPaid: number; currentDue: number }> {
  let totalBilled = 0;
  let totalPaid = 0;

  // Calculate total billed amount from purchaseBills
  const billsQuery = query(collection(db, 'purchaseBills'), where('supplierId', '==', supplierId));
  const billsSnapshot = await getDocs(billsQuery);
  billsSnapshot.forEach(doc => {
    totalBilled += (doc.data() as PurchaseBill).totalAmount;
  });

  // Calculate total paid amount from supplierPayments
  const paymentsQuery = query(collection(db, 'supplierPayments'), where('supplierId', '==', supplierId));
  const paymentsSnapshot = await getDocs(paymentsQuery);
  paymentsSnapshot.forEach(doc => {
    totalPaid += (doc.data() as SupplierPayment).amountPaid;
  });

  const currentDue = totalBilled - totalPaid;
  return { totalBilled, totalPaid, currentDue };
}

export async function addSupplierPaymentAction(paymentData: CreateSupplierPaymentInput): Promise<{ success: boolean; payment?: SupplierPayment; error?: string }> {
  try {
    const suppliers = await fetchSuppliersAction();
    const supplier = suppliers.find(s => s.id === paymentData.supplierId);

    if (!supplier) {
      return { success: false, error: 'Supplier not found.' };
    }

    const balance = await calculateSupplierBalanceAction(paymentData.supplierId, supplier.name);

    if (paymentData.amountPaid <= 0) {
        return { success: false, error: 'Payment amount must be positive.' };
    }
    if (balance.currentDue <= 0) {
      return { success: false, error: `Supplier ${supplier.name} has no outstanding due. Cannot record payment.` };
    }
    if (paymentData.amountPaid > balance.currentDue) {
      return { success: false, error: `Payment amount ($${paymentData.amountPaid.toFixed(2)}) cannot exceed current due ($${balance.currentDue.toFixed(2)}).` };
    }

    const dataToSave: Omit<SupplierPayment, 'id'> = {
      ...paymentData,
      supplierName: supplier.name,
      paymentDate: paymentData.paymentDate, // Already ISO string
      createdAt: new Date().toISOString(),
    };

    const paymentDateTimestamp = Timestamp.fromDate(new Date(paymentData.paymentDate));
    const createdAtTimestamp = Timestamp.now();

    const docRef = await addDoc(collection(db, 'supplierPayments'), {
        ...dataToSave,
        paymentDate: paymentDateTimestamp,
        createdAt: createdAtTimestamp,
    });
    
    const newPayment: SupplierPayment = { ...dataToSave, id: docRef.id };
    return { success: true, payment: newPayment };

  } catch (e) {
    console.error('Error adding supplier payment: ', e);
    return { success: false, error: e instanceof Error ? e.message : 'An unknown error occurred' };
  }
}

export async function fetchSupplierPaymentsAction(supplierId?: string): Promise<SupplierPayment[]> {
  try {
    const paymentsCol = collection(db, 'supplierPayments');
    let q;
    if (supplierId) {
      q = query(paymentsCol, where('supplierId', '==', supplierId), orderBy('paymentDate', 'desc'));
    } else {
      q = query(paymentsCol, orderBy('paymentDate', 'desc'));
    }
    
    const querySnapshot = await getDocs(q);
    const payments = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        paymentDate: (data.paymentDate as Timestamp).toDate().toISOString(),
        createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
      } as SupplierPayment;
    });
    return payments;
  } catch (error) {
    console.error("Error fetching supplier payments: ", error);
    return [];
  }
}

export async function fetchSuppliersWithBalancesAction(): Promise<SupplierBalance[]> {
  try {
    const suppliers = await fetchSuppliersAction(); // Fetches all suppliers
    const suppliersWithBalances: SupplierBalance[] = [];

    for (const supplier of suppliers) {
      const balance = await calculateSupplierBalanceAction(supplier.id, supplier.name);
      suppliersWithBalances.push({
        ...supplier,
        totalBilled: balance.totalBilled,
        totalPaid: balance.totalPaid,
        currentDue: balance.currentDue,
      });
    }
    return suppliersWithBalances.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error fetching suppliers with balances: ", error);
    return [];
  }
}
