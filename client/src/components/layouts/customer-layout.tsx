import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ChevronDown, LogOut, Menu, ShoppingCart, Table, History, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { User as UserType } from "@shared/schema";

interface CustomerLayoutProps {
  children: ReactNode;
  title: string;
  tableInfo?: string;
  cartItemCount?: number;
  onCartClick?: () => void;
  user?: Omit<UserType, "password"> | null;
}

export default function CustomerLayout({
  children,
  title,
  tableInfo,
  cartItemCount = 0,
  onCartClick,
  user
}: CustomerLayoutProps) {
  const [location] = useLocation();
  const { logoutMutation } = useAuth();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };
  
  return (
    <div className="min-h-screen flex flex-col stars-bg">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-md z-10 sticky top-0">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xl font-bold flex items-center text-gradient">
              <span className="text-2xl mr-1">🍽️</span>
              Gourmet Hub
            </Link>
            
            {tableInfo && (
              <div className="hidden sm:flex items-center ml-4 text-sm text-muted-foreground">
                <Table className="h-4 w-4 mr-1" />
                {tableInfo}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {onCartClick && (
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={onCartClick}
              >
                <ShoppingCart className="h-5 w-5" />
                {cartItemCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 rounded-full"
                  >
                    {cartItemCount}
                  </Badge>
                )}
              </Button>
            )}
            
            {/* User Avatar and Menu (Desktop) */}
            {user ? (
              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="gap-2 hover:bg-background/20"
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{user.name}</span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glossy border-border/40">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <Link href="/customer/menu">
                      <DropdownMenuItem className="cursor-pointer">
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Menu
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/customer/orders">
                      <DropdownMenuItem className="cursor-pointer">
                        <History className="h-4 w-4 mr-2" />
                        Order History
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Link href="/auth">
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-2 hidden md:flex"
                >
                  <User className="h-4 w-4" />
                  Login
                </Button>
              </Link>
            )}
            
            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="glossy border-l border-border/40">
                <div className="flex flex-col h-full">
                  <div className="flex-1 py-6">
                    {user ? (
                      <div className="flex items-center gap-3 mb-6">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src="" />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    ) : (
                      <Link href="/auth" className="block mb-6">
                        <Button className="w-full">
                          <User className="h-4 w-4 mr-2" />
                          Login
                        </Button>
                      </Link>
                    )}
                    
                    <div className="space-y-3">
                      <Link href="/customer/menu">
                        <Button
                          variant={location === "/customer/menu" ? "default" : "ghost"}
                          className="w-full justify-start"
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Menu
                        </Button>
                      </Link>
                      <Link href="/customer/orders">
                        <Button
                          variant={location === "/customer/orders" ? "default" : "ghost"}
                          className="w-full justify-start"
                        >
                          <History className="h-4 w-4 mr-2" />
                          Order History
                        </Button>
                      </Link>
                      
                      {tableInfo && (
                        <div className="flex items-center py-2 px-4 text-sm text-muted-foreground">
                          <Table className="h-4 w-4 mr-2" />
                          {tableInfo}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {user && (
                    <Button
                      variant="ghost"
                      className="justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 pb-16">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="py-6 border-t border-border/40 backdrop-blur-md">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Gourmet Hub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}