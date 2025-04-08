import { MenuItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle } from "lucide-react";

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
  // Function to get placeholder image based on category
  const getPlaceholderImage = (category: string) => {
    switch (category) {
      case 'starters':
        return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80";
      case 'main_course':
        return "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80";
      case 'desserts':
        return "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=800&q=80";
      case 'beverages':
        return "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80";
      case 'specials':
        return "https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?auto=format&fit=crop&w=800&q=80";
      default:
        return "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80";
    }
  };

  // Get badge text and style for item tags
  const getBadgeForTag = (tag: string) => {
    switch (tag) {
      case 'vegetarian':
        return {
          text: 'Vegetarian',
          className: 'bg-green-100 text-green-800'
        };
      case 'vegan':
        return {
          text: 'Vegan',
          className: 'bg-green-100 text-green-800'
        };
      case 'gluten-free':
        return {
          text: 'Gluten Free',
          className: 'bg-blue-100 text-blue-800'
        };
      case 'spicy':
        return {
          text: 'Spicy',
          className: 'bg-red-100 text-red-800'
        };
      case 'popular':
        return {
          text: 'Popular',
          className: 'bg-amber-100 text-amber-800'
        };
      case "chef's special":
        return {
          text: 'Chef\'s Special',
          className: 'bg-amber-100 text-amber-800'
        };
      case 'healthy':
        return {
          text: 'Healthy',
          className: 'bg-teal-100 text-teal-800'
        };
      case 'refreshing':
        return {
          text: 'Refreshing',
          className: 'bg-cyan-100 text-cyan-800'
        };
      default:
        return {
          text: tag,
          className: 'bg-gray-100 text-gray-800'
        };
    }
  };

  return (
    <Card className="overflow-hidden h-full flex flex-col">
      <div className="h-48 overflow-hidden">
        <img
          src={item.imageUrl || getPlaceholderImage(item.category)}
          className="w-full h-full object-cover transition-transform hover:scale-105"
          alt={item.name}
        />
      </div>
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-poppins font-semibold text-gray-900">{item.name}</h3>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
          </div>
          <span className="font-montserrat font-semibold text-orange-600">
            {formatPrice(item.price)}
          </span>
        </div>
        
        <div className="mt-auto pt-4 flex justify-between items-center">
          <div className="flex flex-wrap gap-1">
            {item.tags && item.tags.length > 0 && item.tags.slice(0, 1).map((tag, index) => {
              const badge = getBadgeForTag(tag);
              return (
                <Badge key={index} variant="outline" className={badge.className}>
                  {badge.text}
                </Badge>
              );
            })}
            {!item.available && (
              <Badge variant="outline" className="bg-gray-100 text-gray-800">
                Unavailable
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            className="text-sm rounded-full"
            disabled={disabled || !item.available}
            onClick={() => onAddToCart(item)}
          >
            <PlusCircle className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
