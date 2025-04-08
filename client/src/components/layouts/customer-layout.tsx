import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { User } from "@shared/schema";
import { HandPlatter, ShoppingCart, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";

interface CustomerLayoutProps {
  children: ReactNode;
  title: string;
  tableInfo?: string;
  cartItemCount?: number;
  onCartClick?: () => void;
  onLoginClick?: () => void;
  user?: Omit<User, "password"> | null;
}

export default function CustomerLayout({
  children,
  title,
  tableInfo,
  cartItemCount = 0,
  onCartClick,
  onLoginClick,
  user,
}: CustomerLayoutProps) {
  const [location] = useLocation();
  const { logoutMutation } = useAuth();
  const [activeCategoryTab, setActiveCategoryTab] = useState("all");

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/">
            <a className="flex items-center">
              <HandPlatter className="h-6 w-6 text-orange-600 mr-2" />
              <h1 className="text-xl font-poppins font-bold text-gray-900">{title}</h1>
            </a>
          </Link>
          <div className="flex items-center space-x-4">
            {tableInfo && (
              <div className="hidden md:flex items-center text-sm text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{tableInfo}</span>
              </div>
            )}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-orange-600 hover:text-orange-700 p-1">
                    <span className="hidden md:inline mr-1">{user.name}</span>
                    <UserIcon className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {user.role === "admin" && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin">
                        <a className="cursor-pointer">Admin Dashboard</a>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="ghost"
                className="text-orange-600 hover:text-orange-700"
                onClick={onLoginClick}
              >
                <UserIcon className="h-5 w-5 mr-1" />
                Login
              </Button>
            )}
            {onCartClick && (
              <button 
                className="relative"
                onClick={onCartClick}
                aria-label="Shopping cart"
              >
                <ShoppingCart className="h-5 w-5 text-orange-600" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-4">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">
          <p>© {new Date().getFullYear()} The Gourmet Hub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
