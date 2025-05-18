
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, Timestamp, where, writeBatch, doc } from 'firebase/firestore';
import type {
  CostCategory, CreateCostCategoryInput,
  CostEntry, CreateCostEntryInput,
  PurchaseItem, CreatePurchaseItemInput,
  PurchaseBill, // CreatePurchaseBillInput is handled per form
  Supplier
} from '@/types';

// Cost Category Actions
export async function addCostCategoryAction(categoryData: CreateCostCategoryInput): Promise<{ success: boolean; category?: CostCategory; error?: string }> {
  try {
    const trimmedName = categoryData.name.trim();
    // Case-insensitive check for existing category
    const categoriesCol = collection(db, 'costCategories');
    const nameQuery = query(categoriesCol, where('nameLower', '==', trimmedName.toLowerCase()));
    const querySnapshot = await getDocs(nameQuery);

    if (!querySnapshot.empty) {
      return { success: false, error: `Category "${trimmedName}" already exists.` };
    }

    const dataToSave = {
      name: trimmedName,
      nameLower: trimmedName.toLowerCase(),
    };

    const docRef = await addDoc(collection(db, 'costCategories'), dataToSave);
    const newCategory: CostCategory = { name: trimmedName, id: docRef.id }; // nameLower is not part of CostCategory type
    return { success: true, category: newCategory };
  } catch (e) {
    console.error('Error adding cost category: ', e);
    return { success: false, error: e instanceof Error ? e.message : 'An unknown error occurred' };
  }
}

export async function fetchCostCategoriesAction(): Promise<CostCategory[]> {
  try {
    const categoriesCol = collection(db, 'costCategories');
    const q = query(categoriesCol, orderBy('name'));
    const querySnapshot = await getDocs(q);
    const categories = querySnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name, // Ensure only 'name' is mapped from data
    } as CostCategory));
    return categories;
  } catch (error) {
    console.error("Error fetching cost categories: ", error);
    return [];
  }
}

// Purchase Item Actions
export async function addPurchaseItemAction(itemData: CreatePurchaseItemInput): Promise<{ success: boolean; item?: PurchaseItem; error?: string }> {
  try {
    const trimmedName = itemData.name.trim();
    const trimmedCode = itemData.code?.trim().toUpperCase();

    const itemsCol = collection(db, 'purchaseItems');

    // Case-insensitive check for existing item name within the same category
    const nameQuery = query(itemsCol, where('categoryId', '==', itemData.categoryId));
    const nameQuerySnapshot = await getDocs(nameQuery);
    const existingItemByName = nameQuerySnapshot.docs.find(
      doc => doc.data().name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (existingItemByName) {
      return { success: false, error: `Purchase item named "${trimmedName}" already exists in category "${itemData.categoryName}".` };
    }

    // Case-insensitive check for unique code if provided (globally unique for codes)
    if (trimmedCode && trimmedCode.length > 0) {
      const codeQuery = query(itemsCol, where('code', '==', trimmedCode)); // Direct match, already uppercase
      const codeQuerySnapshot = await getDocs(codeQuery);
      if (!codeQuerySnapshot.empty) {
        return { success: false, error: `Purchase item code "${trimmedCode}" already exists.` };
      }
    }

    const dataToSave: Omit<PurchaseItem, 'id'> = {
      name: trimmedName,
      categoryId: itemData.categoryId,
      categoryName: itemData.categoryName,
      code: trimmedCode || undefined,
    };

    const docRef = await addDoc(itemsCol, dataToSave);
    const newItem: PurchaseItem = { ...dataToSave, id: docRef.id };
    return { success: true, item: newItem };
  } catch (e) {
    console.error('Error adding purchase item: ', e);
    return { success: false, error: e instanceof Error ? e.message : 'An unknown error occurred' };
  }
}

export async function fetchPurchaseItemsAction(categoryId?: string): Promise<PurchaseItem[]> {
  try {
    const itemsCol = collection(db, 'purchaseItems');
    let q = query(itemsCol, orderBy('categoryName'), orderBy('name'));
    if (categoryId) {
      q = query(itemsCol, where('categoryId', '==', categoryId), orderBy('name'));
    }
    const querySnapshot = await getDocs(q);
    const items = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as PurchaseItem));
    return items;
  } catch (error) {
    console.error("Error fetching purchase items: ", error);
    return [];
  }
}


// Purchase Bill and associated Cost Entries Action
export async function addPurchaseBillWithEntriesAction(
  billData: { // Modified to accept supplierId and supplierName
    billDate: string; // ISO string
    supplierId?: string;
    supplierName?: string;
    billNumber?: string;
    purchaseOrderNumber?: string;
  },
  items: Array<Omit<CreateCostEntryInput, 'date' | 'purchaseBillId' | 'categoryName' | 'categoryId' | 'purchaseItemCode' > & { categoryId: string, categoryName: string, purchaseItemCode?: string }>
): Promise<{ success: boolean; purchaseBill?: PurchaseBill; costEntries?: CostEntry[], error?: string }> {
  const batch = writeBatch(db);

  try {
    const billDateTimestamp = Timestamp.fromDate(new Date(billData.billDate));
    const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const purchaseBillRef = doc(collection(db, 'purchaseBills'));
    const newPurchaseBillData: Omit<PurchaseBill, 'id' > = {
      billDate: billData.billDate,
      supplierId: billData.supplierId || undefined,
      supplierName: billData.supplierName || undefined,
      billNumber: billData.billNumber || undefined,
      purchaseOrderNumber: billData.purchaseOrderNumber || undefined,
      totalAmount,
      createdAt: new Date().toISOString(),
    };
    batch.set(purchaseBillRef, { ...newPurchaseBillData, billDate: billDateTimestamp, createdAt: Timestamp.now() });

    const createdCostEntries: CostEntry[] = [];
    for (const item of items) {
      const costEntryRef = doc(collection(db, 'costEntries'));
      const costEntryData: CreateCostEntryInput = {
        purchaseBillId: purchaseBillRef.id,
        purchaseItemId: item.purchaseItemId,
        purchaseItemName: item.purchaseItemName,
        purchaseItemCode: item.purchaseItemCode || undefined,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        amount: Number(item.amount) || 0,
        date: billData.billDate,
      };
      batch.set(costEntryRef, { ...costEntryData, date: billDateTimestamp });
      createdCostEntries.push({ ...costEntryData, id: costEntryRef.id });
    }

    await batch.commit();

    const persistedBill: PurchaseBill = { ...newPurchaseBillData, id: purchaseBillRef.id };
    return { success: true, purchaseBill: persistedBill, costEntries: createdCostEntries };

  } catch (e) {
    console.error('Error adding purchase bill and entries: ', e);
    return { success: false, error: e instanceof Error ? e.message : 'An unknown error occurred' };
  }
}


// Cost Entry Actions (Fetch only, add is handled by addPurchaseBillWithEntriesAction)
export async function fetchCostEntriesAction(startDate?: string, endDate?: string): Promise<CostEntry[]> {
  try {
    const entriesCol = collection(db, 'costEntries');
    let q = query(entriesCol, orderBy('date', 'desc'));

    if (startDate) {
      q = query(q, where('date', '>=', Timestamp.fromDate(new Date(startDate))));
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      q = query(q, where('date', '<=', Timestamp.fromDate(endOfDay)));
    }

    const querySnapshot = await getDocs(q);
    const entries = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: (data.date as Timestamp).toDate().toISOString(),
      } as CostEntry;
    });
    return entries;
  } catch (error) {
    console.error("Error fetching cost entries: ", error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch cost entries: ${error.message}`);
    }
    throw new Error("An unknown error occurred while fetching cost entries.");
  }
}
