import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { HandPlatter, LogIn, Mail, Lock, User, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

// Login form schema
const loginFormSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Registration form schema
const registerFormSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginFormSchema>;
type RegisterFormValues = z.infer<typeof registerFormSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const { user, loginMutation, registerMutation } = useAuth();
  const [, navigate] = useLocation();

  // Get table context from session storage
  const tableId = sessionStorage.getItem('currentTableId');
  const restaurantId = sessionStorage.getItem('currentRestaurantId');

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      if (tableId && restaurantId) {
        // If coming from QR code scan, redirect to menu
        navigate(`/menu/${restaurantId}`);
      } else {
        // Normal login flow
        navigate(user.role === "admin" ? "/admin" : "/");
      }
    }
  }, [user, tableId, restaurantId]);

  // Check if user clicked "Register as Admin" on the home page
  const [registerAsAdmin, setRegisterAsAdmin] = useState(() => {
    // Check localStorage for the flag
    const registerAsAdminFlag = localStorage.getItem('registerAsAdmin');
    if (registerAsAdminFlag === 'true') {
      // Remove the flag from localStorage so it doesn't persist
      localStorage.removeItem('registerAsAdmin');
      // Set the active tab to register
      setTimeout(() => setActiveTab("register"), 0);
      return true;
    }
    return false;
  });

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      name: "",
      email: "",
    },
  });

  // Form submission handlers
  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data, {
      onSuccess: (user) => {
        if (tableId && restaurantId) {
          // If coming from QR code scan, redirect to menu
          navigate(`/menu/${restaurantId}`);
        } else {
          // Normal login flow
          navigate(user.role === "admin" ? "/admin" : "/");
        }
      },
    });
  };
  
  const onRegisterSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate({
      ...data,
      role: tableId ? "customer" : (registerAsAdmin ? "admin" : "customer"), // Handle both QR and admin flows
      restaurantId: restaurantId ? parseInt(restaurantId) : undefined
    }, {
      onSuccess: (user) => {
        if (tableId && restaurantId) {
          // If coming from QR code scan, redirect to menu
          navigate(`/menu/${restaurantId}`);
        } else {
          // Normal registration flow
          if (user.role === "admin") {
            navigate("/admin/setup");
          } else {
            navigate("/");
          }
        }
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left column - Authentication forms */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <div className="flex items-center mb-8">
            <HandPlatter className="h-8 w-8 text-orange-600 mr-2" />
            <h1 className="text-2xl font-bold font-poppins">
              {tableId && restaurantId ? "Table Login" : "The Gourmet Hub"}
            </h1>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">
                {tableId ? "Customer Login" : "Restaurant Login"}
              </TabsTrigger>
              <TabsTrigger value="register">
                {tableId ? "New Customer" : (registerAsAdmin ? "Restaurant Register" : "Customer Register")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter your password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                    {loginMutation.isPending ? "Logging in..." : (tableId ? "Login to Continue" : "Login to Restaurant Dashboard")}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{tableId ? "Your Name" : (registerAsAdmin ? "Restaurant Name" : "Your Name")}</FormLabel>
                        <FormControl>
                          <Input placeholder={tableId ? "Enter your name" : (registerAsAdmin ? "Enter your restaurant name" : "Enter your name")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Choose a username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter your email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Create a password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Confirm your password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                    {registerMutation.isPending ? "Registering..." : (tableId ? "Register to Continue" : (registerAsAdmin ? "Register Restaurant" : "Register Account"))}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right column - Image and text */}
      <div className="hidden md:flex md:w-1/2 bg-orange-100 items-center justify-center p-10">
        <div className="max-w-md text-center">
          <h2 className="text-3xl font-bold text-orange-800 mb-4">Welcome to The Gourmet Hub</h2>
          <p className="text-orange-700 mb-6">
            {tableId 
              ? "Order your favorite dishes directly from your table. Quick, easy, and convenient."
              : (registerAsAdmin 
                ? "Manage your restaurant efficiently with our comprehensive dashboard. Set up tables, manage orders, and streamline your operations."
                : "Discover a new way to dine. Browse menus, place orders, and enjoy a seamless dining experience.")}
          </p>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <p className="text-gray-700 italic">
              {tableId
                ? "Join our platform to enhance your dining experience."
                : (registerAsAdmin 
                  ? "Join our platform to transform your restaurant management experience."
                  : "Join our platform to transform your dining experience.")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Import icons for the auth page
function QrCode(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="5" height="5" x="3" y="3" rx="1" />
      <rect width="5" height="5" x="16" y="3" rx="1" />
      <rect width="5" height="5" x="3" y="16" rx="1" />
      <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
      <path d="M21 21v.01" />
      <path d="M12 7v3a2 2 0 0 1-2 2H7" />
      <path d="M3 12h.01" />
      <path d="M12 3h.01" />
      <path d="M12 16v.01" />
      <path d="M16 12h1" />
      <path d="M21 12v.01" />
    </svg>
  );
}
