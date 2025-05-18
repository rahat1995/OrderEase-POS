
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, Timestamp, orderBy, writeBatch, DocumentData } from 'firebase/firestore';
import type { Supplier, SupplierPayment, CreateSupplierPaymentInput, PurchaseBill, SupplierBalance, SupplierPeriodicSummary, LedgerTransaction, SupplierLedgerData } from '@/types';
import { fetchSuppliersAction } from './supplierActions'; 
import { endOfDay, parseISO, startOfDay } from 'date-fns';


export async function calculateSupplierBalanceAction(supplierId: string): Promise<{ totalBilled: number; totalPaid: number; currentDue: number }> {
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

    const balance = await calculateSupplierBalanceAction(paymentData.supplierId);

    if (paymentData.amountPaid <= 0) {
        return { success: false, error: 'Payment amount must be positive.' };
    }
    if (balance.currentDue <= 0 && paymentData.amountPaid > 0) { // Allow zero payment if due is zero (though form might prevent)
      return { success: false, error: `Supplier ${supplier.name} has no outstanding due. Cannot record payment.` };
    }
    if (paymentData.amountPaid > balance.currentDue) {
      return { success: false, error: `Payment amount ($${paymentData.amountPaid.toFixed(2)}) cannot exceed current due ($${balance.currentDue.toFixed(2)}).` };
    }

    const dataToSave: Omit<SupplierPayment, 'id'> = {
      ...paymentData,
      supplierName: supplier.name,
      paymentDate: paymentData.paymentDate, 
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

export async function fetchSupplierPaymentsAction(supplierId?: string, startDateISO?: string, endDateISO?: string): Promise<SupplierPayment[]> {
  try {
    const paymentsCol = collection(db, 'supplierPayments');
    let q = query(paymentsCol);

    if (supplierId) {
      q = query(q, where('supplierId', '==', supplierId));
    }
    if (startDateISO) {
      q = query(q, where('paymentDate', '>=', Timestamp.fromDate(startOfDay(parseISO(startDateISO)))));
    }
    if (endDateISO) {
      q = query(q, where('paymentDate', '<=', Timestamp.fromDate(endOfDay(parseISO(endDateISO)))));
    }
    
    q = query(q, orderBy('paymentDate', 'desc'));
    
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
    const suppliers = await fetchSuppliersAction(); 
    const suppliersWithBalances: SupplierBalance[] = [];

    for (const supplier of suppliers) {
      const balance = await calculateSupplierBalanceAction(supplier.id);
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


// For Supplier Due Report - All Suppliers View
export async function fetchSupplierPeriodicSummaryAction(
  supplier: Supplier, 
  startDateISO?: string, 
  endDateISO?: string
): Promise<SupplierPeriodicSummary> {
  let billsBeforePeriod = 0;
  let paymentsBeforePeriod = 0;
  let purchasesInPeriod = 0;
  let paymentsInPeriod = 0;

  const billsCol = collection(db, 'purchaseBills');
  const paymentsCol = collection(db, 'supplierPayments');

  // Calculate amounts before the start date for opening due
  if (startDateISO) {
    const startTimestamp = Timestamp.fromDate(startOfDay(parseISO(startDateISO)));

    const billsBeforeQuery = query(billsCol, where('supplierId', '==', supplier.id), where('billDate', '<', startTimestamp));
    const billsBeforeSnapshot = await getDocs(billsBeforeQuery);
    billsBeforeSnapshot.forEach(doc => billsBeforePeriod += (doc.data() as PurchaseBill).totalAmount);

    const paymentsBeforeQuery = query(paymentsCol, where('supplierId', '==', supplier.id), where('paymentDate', '<', startTimestamp));
    const paymentsBeforeSnapshot = await getDocs(paymentsBeforeQuery);
    paymentsBeforeSnapshot.forEach(doc => paymentsBeforePeriod += (doc.data() as SupplierPayment).amountPaid);
  } else {
    // If no start date, opening due is effectively 0 as we consider from the beginning of time
    billsBeforePeriod = 0;
    paymentsBeforePeriod = 0;
  }
  const openingDue = billsBeforePeriod - paymentsBeforePeriod;

  // Calculate amounts within the period
  let billsInPeriodQuery = query(billsCol, where('supplierId', '==', supplier.id));
  let paymentsInPeriodQuery = query(paymentsCol, where('supplierId', '==', supplier.id));

  if (startDateISO) {
    billsInPeriodQuery = query(billsInPeriodQuery, where('billDate', '>=', Timestamp.fromDate(startOfDay(parseISO(startDateISO)))));
    paymentsInPeriodQuery = query(paymentsInPeriodQuery, where('paymentDate', '>=', Timestamp.fromDate(startOfDay(parseISO(startDateISO)))));
  }
  if (endDateISO) {
    billsInPeriodQuery = query(billsInPeriodQuery, where('billDate', '<=', Timestamp.fromDate(endOfDay(parseISO(endDateISO)))));
    paymentsInPeriodQuery = query(paymentsInPeriodQuery, where('paymentDate', '<=', Timestamp.fromDate(endOfDay(parseISO(endDateISO)))));
  }
  
  const billsInPeriodSnapshot = await getDocs(billsInPeriodQuery);
  billsInPeriodSnapshot.forEach(doc => purchasesInPeriod += (doc.data() as PurchaseBill).totalAmount);

  const paymentsInPeriodSnapshot = await getDocs(paymentsInPeriodQuery);
  paymentsInPeriodSnapshot.forEach(doc => paymentsInPeriod += (doc.data() as SupplierPayment).amountPaid);

  const closingDue = openingDue + purchasesInPeriod - paymentsInPeriod;

  return {
    ...supplier,
    openingDue,
    purchasesInPeriod,
    paymentsInPeriod,
    closingDue,
  };
}

// For Supplier Due Report - Individual Ledger View
export async function fetchSupplierLedgerDataAction(
  supplierId: string, 
  startDateISO?: string, 
  endDateISO?: string
): Promise<SupplierLedgerData | null> {
  const suppliers = await fetchSuppliersAction();
  const supplier = suppliers.find(s => s.id === supplierId);
  if (!supplier) return null;

  let billsBeforePeriod = 0;
  let paymentsBeforePeriod = 0;
  
  const billsCol = collection(db, 'purchaseBills');
  const paymentsCol = collection(db, 'supplierPayments');

  if (startDateISO) {
    const startTimestamp = Timestamp.fromDate(startOfDay(parseISO(startDateISO)));
    const billsBeforeQuery = query(billsCol, where('supplierId', '==', supplierId), where('billDate', '<', startTimestamp));
    const billsBeforeSnapshot = await getDocs(billsBeforeQuery);
    billsBeforeSnapshot.forEach(doc => billsBeforePeriod += (doc.data() as PurchaseBill).totalAmount);

    const paymentsBeforeQuery = query(paymentsCol, where('supplierId', '==', supplierId), where('paymentDate', '<', startTimestamp));
    const paymentsBeforeSnapshot = await getDocs(paymentsBeforeQuery);
    paymentsBeforeSnapshot.forEach(doc => paymentsBeforePeriod += (doc.data() as SupplierPayment).amountPaid);
  }
  const openingBalance = billsBeforePeriod - paymentsBeforePeriod;

  const transactions: LedgerTransaction[] = [];
  let totalPurchasesInPeriod = 0;
  let totalPaymentsInPeriod = 0;

  // Fetch bills in period
  let billsInPeriodQuery = query(billsCol, where('supplierId', '==', supplierId));
  if (startDateISO) billsInPeriodQuery = query(billsInPeriodQuery, where('billDate', '>=', Timestamp.fromDate(startOfDay(parseISO(startDateISO)))));
  if (endDateISO) billsInPeriodQuery = query(billsInPeriodQuery, where('billDate', '<=', Timestamp.fromDate(endOfDay(parseISO(endDateISO)))));
  
  const billsInPeriodSnapshot = await getDocs(billsInPeriodQuery);
  billsInPeriodSnapshot.forEach(doc => {
    const bill = doc.data() as PurchaseBill & { id: string }; // Cast to include id
    bill.id = doc.id; // Ensure id is set
    transactions.push({
      id: bill.id,
      date: bill.billDate,
      type: 'purchase',
      description: `Bill #${bill.billNumber || bill.id.substring(0,6)} (PO: ${bill.purchaseOrderNumber || 'N/A'})`,
      amount: bill.totalAmount,
    });
    totalPurchasesInPeriod += bill.totalAmount;
  });

  // Fetch payments in period
  let paymentsInPeriodQuery = query(paymentsCol, where('supplierId', '==', supplierId));
  if (startDateISO) paymentsInPeriodQuery = query(paymentsInPeriodQuery, where('paymentDate', '>=', Timestamp.fromDate(startOfDay(parseISO(startDateISO)))));
  if (endDateISO) paymentsInPeriodQuery = query(paymentsInPeriodQuery, where('paymentDate', '<=', Timestamp.fromDate(endOfDay(parseISO(endDateISO)))));
  
  const paymentsInPeriodSnapshot = await getDocs(paymentsInPeriodQuery);
  paymentsInPeriodSnapshot.forEach(doc => {
    const payment = doc.data() as SupplierPayment & { id: string }; // Cast
    payment.id = doc.id; // Ensure id
    transactions.push({
      id: payment.id,
      date: payment.paymentDate,
      type: 'payment',
      description: `Payment via ${payment.paymentMethod}${payment.notes ? ` (${payment.notes.substring(0,30)}...)` : ''}`,
      amount: payment.amountPaid,
    });
    totalPaymentsInPeriod += payment.amountPaid;
  });

  transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const closingBalance = openingBalance + totalPurchasesInPeriod - totalPaymentsInPeriod;

  return {
    supplier,
    openingBalance,
    transactions,
    totalPurchasesInPeriod,
    totalPaymentsInPeriod,
    closingBalance
  };
}
