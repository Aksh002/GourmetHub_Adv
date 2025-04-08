import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { QRCode } from "@/components/ui/qr-code";
import { HandPlatter, ChefHat, QrCode, LogIn, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function HomePage() {
  // Fall back to null for user if auth context isn't available
  let user = null;
  try {
    const auth = useAuth();
    user = auth.user;
  } catch (error) {
    console.error("Auth context error:", error);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero section */}
      <div className="bg-gradient-to-r from-primary/90 to-secondary text-white stars-bg">
        <div className="container mx-auto px-4 py-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="md:w-1/2">
              <div className="flex items-center mb-4">
                <HandPlatter className="h-10 w-10 mr-2 text-accent" />
                <h1 className="text-3xl md:text-4xl font-bold font-space text-gradient">
                  The Gourmet Hub
                </h1>
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold mb-4 high-contrast-text">
                Smart Restaurant Ordering &<br />Management System
              </h2>
              <p className="text-lg mb-8 max-w-lg text-white/90">
                Experience the modern way to dine. Order seamlessly, track your food, and pay with ease.
              </p>
              <div className="flex flex-wrap gap-4">
                {user ? (
                  <>
                    {user.role === "admin" ? (
                      <Button asChild size="lg" className="btn-glow card-glow bg-background/80 text-primary hover:bg-background border-primary/20">
                        <Link href="/admin">
                          <ChefHat className="mr-2 h-5 w-5" />
                          Go to Admin Dashboard
                        </Link>
                      </Button>
                    ) : (
                      <Button asChild size="lg" className="btn-glow card-glow bg-background/80 text-primary hover:bg-background border-primary/20">
                        <Link href="/table/1">
                          <QrCode className="mr-2 h-5 w-5" />
                          View Menu
                        </Link>
                      </Button>
                    )}
                  </>
                ) : (
                  <Button asChild size="lg" className="btn-glow card-glow bg-background/80 text-primary hover:bg-background border-primary/20">
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
                alt="Restaurant" 
                className="rounded-lg shadow-2xl glossy max-w-sm card-glow"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Features section */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 font-space text-gradient">
          How It Works
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="glossy card-glow border-none">
            <CardContent className="pt-6">
              <div className="rounded-full bg-primary/10 p-3 w-12 h-12 flex items-center justify-center mb-4">
                <QrCode className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">Scan & Order</h3>
              <p className="text-muted-foreground">
                Scan the QR code at your table to browse our menu and place orders directly from your phone.
              </p>
            </CardContent>
            <CardFooter>
              <QRCode
                value="/table/1"
                size={80}
                fgColor="#4169E1" /* Royal blue */
                bgColor="transparent"
                className="mx-auto"
              />
            </CardFooter>
          </Card>

          <Card className="glossy card-glow border-none">
            <CardContent className="pt-6">
              <div className="rounded-full bg-accent/10 p-3 w-12 h-12 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-accent">
                  <path d="M5 7 12 3l7 4v10l-7 4-7-4V7z" />
                  <path d="m5 7 7 4" />
                  <path d="m12 11 7-4" />
                  <path d="M12 11v10" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">Track Your Order</h3>
              <p className="text-muted-foreground">
                Follow your order's journey from kitchen to table with real-time status updates.
              </p>
            </CardContent>
          </Card>

          <Card className="glossy card-glow border-none">
            <CardContent className="pt-6">
              <div className="rounded-full bg-primary/10 p-3 w-12 h-12 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary">
                  <path d="M16 2H8C5 2 3 4 3 7v10c0 3 2 5 5 5h8c3 0 5-2 5-5V7c0-3-2-5-5-5Z" />
                  <path d="M7 10h4" />
                  <path d="M9 16h6" />
                  <path d="M17 10h-2" />
                  <path d="M7 16h0" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">Pay With Ease</h3>
              <p className="text-muted-foreground">
                When you're done, view your bill and pay securely through our integrated payment system.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Admin section */}
      {!user && (
        <div className="bg-gradient-to-b from-secondary/20 to-background py-16 stars-bg">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="md:w-1/2">
                <h2 className="text-2xl md:text-3xl font-bold mb-4 font-space text-gradient">
                  For Restaurant Owners
                </h2>
                <p className="text-lg mb-6 text-muted-foreground high-contrast-text">
                  Our admin dashboard provides powerful tools to manage your restaurant operations efficiently.
                </p>
                <ul className="space-y-4 mb-6">
                  <li className="flex items-start">
                    <div className="rounded-full bg-primary/10 p-1 w-8 h-8 flex items-center justify-center mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-foreground">Intuitive table management with visual floor plans</span>
                  </li>
                  <li className="flex items-start">
                    <div className="rounded-full bg-primary/10 p-1 w-8 h-8 flex items-center justify-center mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-foreground">Real-time order tracking and management</span>
                  </li>
                  <li className="flex items-start">
                    <div className="rounded-full bg-primary/10 p-1 w-8 h-8 flex items-center justify-center mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-foreground">Menu customization and inventory control</span>
                  </li>
                </ul>
                <Button asChild size="lg" className="btn-glow card-glow">
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
                  className="rounded-lg shadow-2xl glossy card-glow"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gradient-to-t from-background to-secondary/30 text-white py-8 border-t border-primary/10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <HandPlatter className="h-6 w-6 mr-2 text-primary" />
              <span className="text-xl font-space font-semibold text-gradient">The Gourmet Hub</span>
            </div>
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} The Gourmet Hub. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
