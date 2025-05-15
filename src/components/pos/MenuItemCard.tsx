
"use client";

import Image from 'next/image';
import type { MenuItem } from '@/types';
import { useOrder } from '@/contexts/OrderContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';

interface MenuItemCardProps {
  item: MenuItem;
}

export default function MenuItemCard({ item }: MenuItemCardProps) {
  const { addItem } = useOrder();

  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="p-0">
        <div className="aspect-[3/2] relative w-full">
          <Image
            src={item.imageUrl}
            alt={item.name}
            layout="fill"
            objectFit="cover"
            data-ai-hint={item.dataAiHint}
          />
        </div>
      </CardHeader>
      <CardContent className="p-3 flex-grow">
        <CardTitle className="text-base font-medium mb-1 leading-tight">{item.name}</CardTitle>
        <p className="text-sm text-foreground/80 font-semibold">${item.price.toFixed(2)}</p>
      </CardContent>
      <CardFooter className="p-3 pt-0">
        <Button 
          onClick={() => addItem(item)} 
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          aria-label={`Add ${item.name} to cart`}
          size="sm"
        >
          <PlusCircle className="mr-1.5 h-4 w-4" /> Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
}
