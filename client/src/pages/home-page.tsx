import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QRScanner } from "@/components/qr-scanner";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Link } from "wouter";
import { HandPlatter, ChefHat, QrCode, LogIn, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { QRCodeSVG } from "qrcode.react";

const manualEntrySchema = z.object({
  restaurantId: z.string().min(1, "Restaurant ID is required"),
  tableNumber: z.string().min(1, "Table number is required"),
});

type ManualEntryFormValues = z.infer<typeof manualEntrySchema>;

export default function HomePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showScanner, setShowScanner] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const form = useForm<ManualEntryFormValues>({
    resolver: zodResolver(manualEntrySchema),
    defaultValues: {
      restaurantId: "",
      tableNumber: "",
    },
  });

  const handleScan = (data: string | null) => {
    if (data) {
      try {
        const url = new URL(data);
        const pathParts = url.pathname.split('/');
        const tableId = pathParts[2];
        const restaurantId = pathParts[3];

        if (tableId && restaurantId) {
          // Store table context in session storage
          sessionStorage.setItem('currentTableId', tableId);
          sessionStorage.setItem('currentRestaurantId', restaurantId);
          
          // Navigate to menu page
          navigate(`/menu/${restaurantId}`);
        }
      } catch (error) {
        toast({
          title: "Invalid QR Code",
          description: "This QR code is not valid for table access.",
          variant: "destructive",
        });
      }
    }
  };

  const handleManualEntry = (data: ManualEntryFormValues) => {
    // Store table context in session storage
    sessionStorage.setItem('currentTableId', data.tableNumber);
    sessionStorage.setItem('currentRestaurantId', data.restaurantId);
    
    // Navigate to menu page
    navigate(`/menu/${data.restaurantId}`);
  };

  return (
    <div className="min-h-screen">
      {/* Hero section */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="md:w-1/2">
              <div className="flex items-center mb-4">
                <HandPlatter className="h-10 w-10 mr-2" />
                <h1 className="text-3xl md:text-4xl font-bold font-poppins">
                  The Gourmet Hub
                </h1>
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold mb-4">
                Smart HandPlatter Ordering &<br />Management System
              </h2>
              <p className="text-lg mb-8 max-w-lg">
                Experience the modern way to dine. Order seamlessly, track your food, and pay with ease.
              </p>
              <div className="flex flex-wrap gap-4">
                {user ? (
                  <>
                    {user.role === "admin" ? (
                      <Button asChild size="lg" className="bg-white text-orange-600 hover:bg-gray-100">
                        <Link href="/admin">
                          <ChefHat className="mr-2 h-5 w-5" />
                          Go to Admin Dashboard
                        </Link>
                      </Button>
                    ) : (
                      <Button asChild size="lg" className="bg-white text-orange-600 hover:bg-gray-100">
                        <Link href="/table/1">
                          <QrCode className="mr-2 h-5 w-5" />
                          View Menu
                        </Link>
                      </Button>
                    )}
                  </>
                ) : (
                  <Button asChild size="lg" className="bg-white text-orange-600 hover:bg-gray-100">
                    <Link href="/auth">
                      <LogIn className="mr-2 h-5 w-5" />
                      Login / Register
                    </Link>
                  </Button>
                )}
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <img 
                src="https://images.unsplash.com/photo-1599458252573-56ae36120de1?auto=format&fit=crop&q=80&w=400" 
                alt="HandPlatter" 
                className="rounded-lg shadow-lg max-w-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Features section */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 font-poppins">
          How It Works
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="rounded-full bg-orange-100 p-3 w-12 h-12 flex items-center justify-center mb-4">
                <QrCode className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Scan & Order</h3>
              <p className="text-gray-600">
                Scan the QR code at your table to browse our menu and place orders directly from your phone.
              </p>
            </CardContent>
            <CardFooter>
              <QRCodeSVG
                value="/table/1"
                size={80}
                fgColor="#FF5722"
                className="mx-auto"
              />
            </CardFooter>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="rounded-full bg-green-100 p-3 w-12 h-12 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-green-600">
                  <path d="M5 7 12 3l7 4v10l-7 4-7-4V7z" />
                  <path d="m5 7 7 4" />
                  <path d="m12 11 7-4" />
                  <path d="M12 11v10" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Track Your Order</h3>
              <p className="text-gray-600">
                Follow your order's journey from kitchen to table with real-time status updates.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="rounded-full bg-blue-100 p-3 w-12 h-12 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-blue-600">
                  <path d="M16 2H8C5 2 3 4 3 7v10c0 3 2 5 5 5h8c3 0 5-2 5-5V7c0-3-2-5-5-5Z" />
                  <path d="M7 10h4" />
                  <path d="M9 16h6" />
                  <path d="M17 10h-2" />
                  <path d="M7 16h0" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Pay With Ease</h3>
              <p className="text-gray-600">
                When you're done, view your bill and pay securely through our integrated payment system.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Admin section */}
      {!user && (
        <div className="bg-gray-50 py-16">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="md:w-1/2">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 font-poppins">
                  For HandPlatter Owners
                </h2>
                <p className="text-lg mb-6 text-gray-600">
                  Our admin dashboard provides powerful tools to manage your restaurant operations efficiently.
                </p>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Intuitive table management with visual floor plans</span>
                  </li>
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Real-time order tracking and management</span>
                  </li>
                  <li className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Menu customization and inventory control</span>
                  </li>
                </ul>
                <Button 
                  asChild 
                  size="lg"
                  onClick={() => {
                    // Will navigate to /auth but we want to pass state
                    // indicating that the user wants to register as admin
                    localStorage.setItem('registerAsAdmin', 'true');
                  }}
                >
                  <Link href="/auth">
                    <User className="mr-2 h-5 w-5" />
                    Register as Admin
                  </Link>
                </Button>
              </div>
              <div className="md:w-1/2">
                <img 
                  src="https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&q=80&w=500" 
                  alt="Admin Dashboard" 
                  className="rounded-lg shadow-lg"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <HandPlatter className="h-6 w-6 mr-2" />
              <span className="text-xl font-semibold">The Gourmet Hub</span>
            </div>
            <div className="text-sm text-gray-400">
              © {new Date().getFullYear()} The Gourmet Hub. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8">Welcome to The Gourmet Hub</h1>
          
          <Tabs defaultValue={isMobile ? "qr" : "manual"} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              {isMobile && (
                <TabsTrigger value="qr">Scan QR Code</TabsTrigger>
              )}
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            </TabsList>

            {isMobile && (
              <TabsContent value="qr">
                <Card className="p-6">
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-semibold mb-2">Scan Table QR Code</h2>
                    <p className="text-gray-600">
                      Use your device's camera to scan the QR code on your table
                    </p>
                  </div>

                  {!showScanner ? (
                    <Button 
                      className="w-full mb-4"
                      onClick={() => setShowScanner(true)}
                    >
                      Open Camera
                    </Button>
                  ) : (
                    <div className="relative aspect-square w-full max-w-md mx-auto mb-4">
                      <QRScanner
                        onScan={handleScan}
                        onError={(error) => {
                          console.error(error);
                          toast({
                            title: "Scanner Error",
                            description: "There was an error with the QR scanner. Please try again or use manual entry.",
                            variant: "destructive",
                          });
                        }}
                      />
                      <Button 
                        className="mt-4 w-full"
                        variant="secondary"
                        onClick={() => setShowScanner(false)}
                      >
                        Close Camera
                      </Button>
                    </div>
                  )}
                </Card>
              </TabsContent>
            )}

            <TabsContent value="manual">
              <Card className="p-6">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold mb-2">Manual Table Entry</h2>
                  <p className="text-gray-600">
                    Enter your restaurant and table details manually
                  </p>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleManualEntry)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="restaurantId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Restaurant ID</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter restaurant ID" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tableNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Table Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter table number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full">
                      Continue to Login
                    </Button>
                  </form>
                </Form>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Restaurant owners? <Button variant="link" onClick={() => {
                localStorage.setItem('registerAsAdmin', 'true');
                navigate('/auth');
              }}>Register here</Button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
