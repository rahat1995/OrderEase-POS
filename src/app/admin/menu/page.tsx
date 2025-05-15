
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { MenuItem, CreateMenuItemInput } from '@/types';
import { addMenuItemAction, fetchMenuItemsAction, updateMenuItemAction, deleteMenuItemAction } from '@/app/actions/menuActions';
import MenuItemForm from '@/components/admin/MenuItemForm';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription as PageCardDescription, CardHeader as PageCardHeader, CardTitle as PageCardTitle } from '@/components/ui/card'; // Renamed to avoid conflict
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { PlusCircle, Edit3, Trash2, Loader2, ListPlus, AlertTriangle, ImageOff } from 'lucide-react';

export default function MenuManagementPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const loadMenuItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await fetchMenuItemsAction();
      setMenuItems(items);
    } catch (error) {
      toast({ title: "Error loading menu items", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenuItems();
  }, [loadMenuItems]);

  const handleFormSubmit = async (data: CreateMenuItemInput) => {
    setIsSubmitting(true);
    try {
      if (editingItem && editingItem.id) {
        const result = await updateMenuItemAction(editingItem.id, data);
        if (result.success) {
          toast({ title: "Success", description: "Menu item updated." });
        } else {
          throw new Error(result.error || "Failed to update menu item.");
        }
      } else {
        const result = await addMenuItemAction(data);
        if (result.success && result.menuItem) {
          toast({ title: "Success", description: "New menu item added." });
        } else {
          throw new Error(result.error || "Failed to add menu item.");
        }
      }
      await loadMenuItems();
      setIsFormOpen(false);
      setEditingItem(null);
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete || !itemToDelete.id) return;
    setIsSubmitting(true);
    try {
      const result = await deleteMenuItemAction(itemToDelete.id);
      if (result.success) {
        toast({ title: "Success", description: `Menu item "${itemToDelete.name}" deleted.` });
        await loadMenuItems();
      } else {
        throw new Error(result.error || "Failed to delete menu item.");
      }
    } catch (error) {
      toast({ title: "Error deleting item", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const openEditForm = (item: MenuItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const openNewForm = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };
  
  const openDeleteDialog = (item: MenuItem) => {
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
  };

  if (isLoading && menuItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Card className="shadow-xl">
        <PageCardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center space-x-3">
            <ListPlus className="h-8 w-8 text-accent" />
            <div>
              <PageCardTitle className="text-2xl md:text-3xl">Menu Management</PageCardTitle>
              <PageCardDescription>Add, edit, or delete menu items.</PageCardDescription>
            </div>
          </div>
          <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
              setIsFormOpen(isOpen);
              if (!isOpen) setEditingItem(null); // Reset editing item when dialog closes
            }}>
            <DialogTrigger asChild>
              <Button onClick={openNewForm} className="bg-accent hover:bg-accent/90">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}</DialogTitle>
                <DialogDescription>
                  {editingItem ? 'Update the details for this menu item.' : 'Fill in the form to add a new item to the menu.'}
                </DialogDescription>
              </DialogHeader>
              <MenuItemForm
                key={editingItem ? editingItem.id : 'new'} // Add key to re-initialize form on edit/new
                initialData={editingItem}
                onSubmit={handleFormSubmit}
                isSubmitting={isSubmitting}
                onCancel={() => { setIsFormOpen(false); setEditingItem(null);}}
              />
            </DialogContent>
          </Dialog>
        </PageCardHeader>
        <CardContent>
          {isLoading && <div className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></div>}
          {!isLoading && menuItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">No menu items found. Add one to get started!</p>
          ) : (
            <ScrollArea className="h-[calc(100vh-300px)]"> {/* Adjust height as needed */}
              <Table>
                <TableHeader className="sticky top-0 bg-muted z-10">
                  <TableRow>
                    <TableHead className="w-[80px]">Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="w-[150px] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menuItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <img 
                          src={item.imageUrl || 'https://placehold.co/60x60.png'} 
                          alt={item.name} 
                          className="w-12 h-12 object-cover rounded-md"
                          data-ai-hint={item.dataAiHint || "food item"}
                          onError={(e) => (e.currentTarget.src = 'https://placehold.co/60x60.png?text=Error')}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                      <TableCell className="text-center space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditForm(item)} aria-label="Edit item">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(item)} className="text-destructive hover:text-destructive/80" aria-label="Delete item">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center"><AlertTriangle className="mr-2 h-5 w-5 text-destructive"/>Confirm Deletion</DialogTitle>
            <DialogDescription>
              This action cannot be undone and will permanently delete the menu item.
            </DialogDescription>
          </DialogHeader>
          <p className="py-2">
            Are you sure you want to delete the menu item: <strong>{itemToDelete?.name}</strong>?
          </p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

