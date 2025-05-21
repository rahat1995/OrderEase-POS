
"use client";

import Image from 'next/image';
import type { MenuItem } from '@/types';
import { useOrder } from '@/contexts/OrderContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MenuItemCardProps {
  item: MenuItem;
}

export default function MenuItemCard({ item }: MenuItemCardProps) {
  const { addItem } = useOrder();

  const handleCardClick = () => {
    addItem(item);
  };

  return (
    <Card 
      className="flex flex-col overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick();}}
      aria-label={`Add ${item.name} to cart`}
    >
      <CardHeader className="p-0">
        <div className="aspect-square relative w-full">
          <Image
            src={item.imageUrl}
            alt={item.name}
            layout="fill"
            objectFit="cover"
            data-ai-hint={item.dataAiHint}
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 16vw, (max-width: 1536px) 12.5vw, 10vw"
            className="pointer-events-none" // Prevents image from capturing click if not needed
          />
        </div>
      </CardHeader>
      <CardContent className="p-2 flex-grow flex flex-col justify-between"> {/* Reduced padding */}
        <CardTitle 
            className="text-xs font-medium leading-tight h-8 overflow-hidden text-ellipsis" // Adjusted for ~2 lines
            title={item.name} // Full name on hover
        > 
          {item.name}
        </CardTitle>
        <p className="text-xs text-foreground/80 font-semibold mt-0.5">${item.price.toFixed(2)}</p>
      </CardContent>
    </Card>
  );
}
