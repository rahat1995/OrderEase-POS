
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, Timestamp, where, writeBatch, doc } from 'firebase/firestore';
import type { 
  CostCategory, CreateCostCategoryInput, 
  CostEntry, CreateCostEntryInput,
  PurchaseItem, CreatePurchaseItemInput,
  PurchaseBill, CreatePurchaseBillInput
} from '@/types';

// Cost Category Actions
export async function addCostCategoryAction(categoryData: CreateCostCategoryInput): Promise<{ success: boolean; category?: CostCategory; error?: string }> {
  try {
    const trimmedName = categoryData.name.trim();
    // Case-insensitive check for existing category
    const categoriesCol = collection(db, 'costCategories');
    const querySnapshot = await getDocs(categoriesCol);
    const existingCategory = querySnapshot.docs.find(
      doc => doc.data().name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (existingCategory) {
      return { success: false, error: `Category "${trimmedName}" already exists.` };
    }

    const docRef = await addDoc(collection(db, 'costCategories'), { name: trimmedName });
    const newCategory: CostCategory = { name: trimmedName, id: docRef.id };
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
      ...doc.data(),
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
    const trimmedCode = itemData.code?.trim();

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

    // Case-insensitive check for unique code if provided
    if (trimmedCode && trimmedCode.length > 0) {
      const codeQuery = query(itemsCol, where('code', '!=', null)); // Query items that have a code
      const codeQuerySnapshot = await getDocs(codeQuery);
      const existingItemByCode = codeQuerySnapshot.docs.find(
        doc => doc.data().code?.toLowerCase() === trimmedCode.toLowerCase()
      );
      if (existingItemByCode) {
        return { success: false, error: `Purchase item code "${trimmedCode}" already exists.` };
      }
    }
    
    const dataToSave: Omit<PurchaseItem, 'id'> = {
      name: trimmedName,
      categoryId: itemData.categoryId,
      categoryName: itemData.categoryName,
      code: trimmedCode || undefined, // Store as undefined if empty
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
  billData: Omit<CreatePurchaseBillInput, 'items'>, 
  items: Array<Omit<CreateCostEntryInput, 'date' | 'purchaseBillId' | 'categoryName' | 'categoryId' | 'purchaseItemCode' > & { categoryId: string, categoryName: string, purchaseItemCode?: string }> 
): Promise<{ success: boolean; purchaseBill?: PurchaseBill; costEntries?: CostEntry[], error?: string }> {
  const batch = writeBatch(db);

  try {
    const billDateTimestamp = Timestamp.fromDate(new Date(billData.billDate));
    const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    
    const purchaseBillRef = doc(collection(db, 'purchaseBills'));
    const newPurchaseBill: Omit<PurchaseBill, 'id'> = {
      billDate: billData.billDate, 
      supplierName: billData.supplierName || undefined,
      billNumber: billData.billNumber || undefined,
      purchaseOrderNumber: billData.purchaseOrderNumber || undefined,
      supplierAddress: billData.supplierAddress || undefined,
      supplierMobile: billData.supplierMobile || undefined,
      totalAmount,
      createdAt: new Date().toISOString(),
    };
    batch.set(purchaseBillRef, { ...newPurchaseBill, billDate: billDateTimestamp, createdAt: Timestamp.now() });

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

    const persistedBill: PurchaseBill = { ...newPurchaseBill, id: purchaseBillRef.id };
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
