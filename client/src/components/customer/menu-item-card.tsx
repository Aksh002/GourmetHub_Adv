import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { MenuItem } from "@shared/schema";

interface MenuItemCardProps {
  item: MenuItem;
  formatPrice: (price: number) => string;
  onAddToCart: (item: MenuItem) => void;
  disabled?: boolean;
}

export default function MenuItemCard({
  item,
  formatPrice,
  onAddToCart,
  disabled = false,
}: MenuItemCardProps) {
  const { name, description, price, category, imageUrl, tags } = item;

  return (
    <Card className="overflow-hidden h-full glossy gradient-border">
      <div className="relative pt-[60%] overflow-hidden bg-background/30">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-background/50 to-background/10">
            <span className="text-5xl">🍽️</span>
          </div>
        )}
        <Badge 
          className="absolute top-2 right-2 uppercase text-xs font-medium"
          variant="outline"
        >
          {category.replace('_', ' ')}
        </Badge>
      </div>
      
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold mb-1">{name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
          {description}
        </p>
        
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {tags.map((tag) => (
              <Badge 
                key={tag} 
                variant="secondary" 
                className="text-xs font-normal bg-background/40 text-foreground/70"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
        
        <div className="text-lg font-bold text-gradient">
          {formatPrice(price)}
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <Button 
          className="w-full card-glow"
          size="sm"
          onClick={() => onAddToCart(item)}
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add to Order
        </Button>
      </CardFooter>
    </Card>
  );
}