
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, Timestamp, orderBy, writeBatch, DocumentData, doc } from 'firebase/firestore';
import type { Supplier, SupplierPayment, CreateSupplierPaymentInput, PurchaseBill, SupplierBalance, SupplierPeriodicSummary, LedgerTransaction, SupplierLedgerData } from '@/types';
import { fetchSuppliersAction } from './supplierActions'; 
import { endOfDay, parseISO, startOfDay } from 'date-fns';


export async function calculateSupplierBalanceAction(supplierId: string): Promise<{ totalBilled: number; totalPaid: number; currentDue: number }> {
  let totalBilled = 0;
  let totalPaid = 0;

  // Calculate total billed amount from purchaseBills
  const billsQuery = query(collection(db, 'purchaseBills'), where('supplierId', '==', supplierId));
  const billsSnapshot = await getDocs(billsQuery);
  billsSnapshot.forEach(billDoc => { // Renamed doc to billDoc for clarity
    totalBilled += (billDoc.data() as PurchaseBill).totalAmount;
  });

  // Calculate total paid amount from supplierPayments
  const paymentsQuery = query(collection(db, 'supplierPayments'), where('supplierId', '==', supplierId));
  const paymentsSnapshot = await getDocs(paymentsQuery);
  paymentsSnapshot.forEach(paymentDoc => { // Renamed doc to paymentDoc
    totalPaid += (paymentDoc.data() as SupplierPayment).amountPaid;
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
    // Allow payment if due is negative (credit balance for supplier), but form might prevent it.
    // Only block if due is zero and trying to pay.
    if (balance.currentDue === 0 && paymentData.amountPaid > 0) { 
      return { success: false, error: `Supplier ${supplier.name} has no outstanding due. Cannot record payment.` };
    }
    if (paymentData.amountPaid > balance.currentDue && balance.currentDue > 0) { // Only check if currentDue is positive
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
    const payments = querySnapshot.docs.map(paymentDoc => { // Renamed doc to paymentDoc
      const data = paymentDoc.data();
      return {
        id: paymentDoc.id,
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
    // If no start date, fetch all bills and payments for the supplier to calculate historical opening due
    const allBillsQuery = query(billsCol, where('supplierId', '==', supplier.id));
    const allBillsSnapshot = await getDocs(allBillsQuery);
    allBillsSnapshot.forEach(doc => billsBeforePeriod += (doc.data() as PurchaseBill).totalAmount);
    
    const allPaymentsQuery = query(paymentsCol, where('supplierId', '==', supplier.id));
    const allPaymentsSnapshot = await getDocs(allPaymentsQuery);
    allPaymentsSnapshot.forEach(doc => paymentsBeforePeriod += (doc.data() as SupplierPayment).amountPaid);

    // If no start date, purchasesInPeriod and paymentsInPeriod effectively become zero
    // because the "period" hasn't started yet relative to filtering.
    // The openingDue will be the current total due.
  }
  const openingDue = billsBeforePeriod - paymentsBeforePeriod;


  // Calculate amounts within the period only if a period is defined
  if (startDateISO || endDateISO) {
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
  } else {
    // If no period is defined, there are no "in-period" transactions
    purchasesInPeriod = 0;
    paymentsInPeriod = 0;
  }


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
  } else {
    // If no start date, opening balance is the all-time balance before any "period" filtering
    const allBillsQuery = query(billsCol, where('supplierId', '==', supplierId));
    const allBillsSnapshot = await getDocs(allBillsQuery);
    allBillsSnapshot.forEach(doc => billsBeforePeriod += (doc.data().totalAmount as number));

    const allPaymentsQuery = query(paymentsCol, where('supplierId', '==', supplierId));
    const allPaymentsSnapshot = await getDocs(allPaymentsQuery);
    allPaymentsSnapshot.forEach(doc => paymentsBeforePeriod += (doc.data().amountPaid as number));
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
    const billData = doc.data();
    transactions.push({
      id: doc.id,
      date: (billData.billDate as Timestamp).toDate().toISOString(), // Convert Timestamp to ISO string
      type: 'purchase',
      description: `Bill #${billData.billNumber || doc.id.substring(0,6)} (PO: ${billData.purchaseOrderNumber || 'N/A'})`,
      amount: billData.totalAmount as number,
    });
    totalPurchasesInPeriod += billData.totalAmount as number;
  });

  // Fetch payments in period
  let paymentsInPeriodQuery = query(paymentsCol, where('supplierId', '==', supplierId));
  if (startDateISO) paymentsInPeriodQuery = query(paymentsInPeriodQuery, where('paymentDate', '>=', Timestamp.fromDate(startOfDay(parseISO(startDateISO)))));
  if (endDateISO) paymentsInPeriodQuery = query(paymentsInPeriodQuery, where('paymentDate', '<=', Timestamp.fromDate(endOfDay(parseISO(endDateISO)))));
  
  const paymentsInPeriodSnapshot = await getDocs(paymentsInPeriodQuery);
  paymentsInPeriodSnapshot.forEach(doc => {
    const paymentData = doc.data();
    transactions.push({
      id: doc.id,
      date: (paymentData.paymentDate as Timestamp).toDate().toISOString(), // Already converted in fetchSupplierPaymentsAction if used, but direct fetch needs it
      type: 'payment',
      description: `Payment via ${paymentData.paymentMethod}${paymentData.notes ? ` (${(paymentData.notes as string).substring(0,30)}...)` : ''}`,
      amount: paymentData.amountPaid as number,
    });
    totalPaymentsInPeriod += paymentData.amountPaid as number;
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


    