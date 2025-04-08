import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  TableProperties,
  BarChart4,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  HandPlatter
} from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen flex-col">
        <h1 className="text-2xl font-semibold mb-4">Access Denied</h1>
        <p className="mb-6">You don't have permission to access the admin area.</p>
        <Button asChild>
          <Link href="/">Return to Homepage</Link>
        </Button>
      </div>
    );
  }

  const navigationItems = [
    { 
      name: 'Dashboard', 
      href: '/admin', 
      icon: <LayoutDashboard className="h-5 w-5 mr-3" /> 
    },
    { 
      name: 'Orders', 
      href: '/admin/orders', 
      icon: <ClipboardList className="h-5 w-5 mr-3" /> 
    },
    { 
      name: 'Menu', 
      href: '/admin/menu', 
      icon: <UtensilsCrossed className="h-5 w-5 mr-3" /> 
    },
    { 
      name: 'Tables', 
      href: '/admin/tables', 
      icon: <TableProperties className="h-5 w-5 mr-3" /> 
    }
  ];

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        window.location.href = "/";
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-md z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <HandPlatter className="h-6 w-6 text-orange-600 mr-2" />
            <h1 className="text-xl font-poppins font-bold text-gray-900">The Gourmet Hub</h1>
            <span className="ml-2 bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">Admin</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Bell className="h-5 w-5 text-gray-600 cursor-pointer" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">3</span>
            </div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden mr-2">
                <img 
                  src={`https://ui-avatars.com/api/?name=${user.name}&background=random`} 
                  alt={user.name} 
                  className="w-full h-full object-cover" 
                />
              </div>
              <span className="hidden md:inline text-sm font-medium">{user.name}</span>
            </div>
            <button 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6 text-gray-600" />
              ) : (
                <Menu className="h-6 w-6 text-gray-600" />
              )}
            </button>
          </div>
        </div>
      </header>
      
      <div className="flex flex-col md:flex-row flex-1">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:block w-64 bg-white shadow-md border-r">
          <div className="sticky top-0 p-4">
            <nav className="flex flex-col space-y-1">
              {navigationItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <a 
                    className={`flex items-center p-3 rounded-lg font-medium ${
                      location === item.href 
                        ? 'bg-orange-100 text-orange-600' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {item.icon}
                    {item.name}
                  </a>
                </Link>
              ))}
              <div className="pt-4 mt-4 border-t border-gray-200">
                <button
                  onClick={() => setLogoutDialogOpen(true)}
                  className="flex items-center p-3 rounded-lg text-gray-600 hover:bg-gray-100 font-medium w-full text-left"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  Logout
                </button>
              </div>
            </nav>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-50">
            <div className="bg-white w-64 h-full overflow-auto">
              <div className="p-4">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center">
                    <HandPlatter className="h-6 w-6 text-orange-600 mr-2" />
                    <h1 className="text-xl font-bold">The Gourmet Hub</h1>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)}>
                    <X className="h-6 w-6 text-gray-600" />
                  </button>
                </div>
                <nav className="flex flex-col space-y-1">
                  {navigationItems.map((item) => (
                    <Link 
                      key={item.href} 
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <a 
                        className={`flex items-center p-3 rounded-lg font-medium ${
                          location === item.href 
                            ? 'bg-orange-100 text-orange-600' 
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {item.icon}
                        {item.name}
                      </a>
                    </Link>
                  ))}
                  <div className="pt-4 mt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setLogoutDialogOpen(true);
                      }}
                      className="flex items-center p-3 rounded-lg text-gray-600 hover:bg-gray-100 font-medium w-full text-left"
                    >
                      <LogOut className="h-5 w-5 mr-3" />
                      Logout
                    </button>
                  </div>
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-grow bg-gray-50 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll need to log back in to access the admin dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Logout</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
