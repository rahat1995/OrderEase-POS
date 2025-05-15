
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
    <Card className="flex flex-col overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="p-0">
        <div className="aspect-square relative w-full"> {/* Changed to aspect-square for more compact vertical items */}
          <Image
            src={item.imageUrl}
            alt={item.name}
            layout="fill"
            objectFit="cover"
            data-ai-hint={item.dataAiHint}
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 16vw, (max-width: 1536px) 12.5vw, 10vw"
          />
        </div>
      </CardHeader>
      <CardContent className="p-2 flex-grow"> {/* Reduced padding */}
        <CardTitle className="text-xs font-medium mb-0.5 leading-tight h-8 overflow-hidden"> {/* Reduced font, mb, and set height for consistent 2 lines */}
          {item.name}
        </CardTitle>
        <p className="text-xs text-foreground/80 font-semibold">${item.price.toFixed(2)}</p>
      </CardContent>
      <CardFooter className="p-2 pt-0"> {/* Reduced padding */}
        <Button 
          onClick={() => addItem(item)} 
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-8 text-xs px-2" /* Reduced height, text size, padding */
          aria-label={`Add ${item.name} to cart`}
          size="sm" 
        >
          <PlusCircle className="mr-1 h-3.5 w-3.5" /> Add {/* Reduced icon size and margin */}
        </Button>
      </CardFooter>
    </Card>
  );
}
