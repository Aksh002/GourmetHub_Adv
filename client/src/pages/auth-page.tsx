import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Mail, Lock, User, UserPlus, LogIn } from "lucide-react";
import { FaGoogle, FaFacebook } from "react-icons/fa";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { User as UserType } from "@shared/schema";

// Login form schema
const loginFormSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Registration form schema
const registerFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginFormSchema>;
type RegisterFormValues = z.infer<typeof registerFormSchema>;

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  
  const { user, loginMutation, registerMutation } = useAuth();
  const [, navigate] = useLocation();

  // Redirect if user is already logged in
  if (user) {
    navigate(user.role === "admin" ? "/admin" : "/");
    return null;
  }

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

  // Get toast functionality
  const { toast } = useToast();
  
  // Form submission handlers
  const onLoginSubmit = (data: LoginFormValues) => {
    console.log("Login form submitted:", data);
    
    loginMutation.mutate(data, {
      onSuccess: (user: UserType) => {
        console.log("Login successful:", user);
        
        // Navigate to appropriate route based on user role
        if (user.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/customer/menu");
        }
      },
      onError: (error: Error) => {
        console.error("Login error:", error);
        
        // Show specific error message when user doesn't exist
        toast({
          title: "Login failed",
          description: error.message || "Invalid username or password",
          variant: "destructive",
        });
      }
    });
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    console.log("Registration form submitted:", data);
    
    registerMutation.mutate({
      ...data,
      role: "customer", // Default role for new users
    }, {
      onSuccess: (user: UserType) => {
        console.log("Registration successful:", user);
        toast({
          title: "Registration successful",
          description: `Welcome, ${user.name}!`,
        });
        
        // Navigate to appropriate route
        navigate("/customer/menu");
      },
      onError: (error: Error) => {
        console.error("Registration error:", error);
        toast({
          title: "Registration failed",
          description: error.message || "Could not create account",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center stars-bg">
      <div className="absolute top-6 left-6">
        <Link href="/">
          <Button variant="ghost" className="gap-2 text-white/80 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
            Back to home
          </Button>
        </Link>
      </div>
      
      <div className="container max-w-md px-4">
        <div className="glossy gradient-border rounded-3xl p-8 backdrop-blur-md">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold font-space text-gradient mb-2">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h1>
            <p className="text-muted-foreground">
              {isLogin 
                ? 'Sign in to continue to the Gourmet Hub' 
                : 'Join us for a premium dining experience'}
            </p>
          </div>
          
          {/* Social login buttons */}
          <div className="flex gap-3 mb-4">
            <Button 
              variant="outline" 
              className="flex-1 flex items-center justify-center gap-2 bg-background/50 hover:bg-background/80 card-glow"
            >
              <FaGoogle className="h-4 w-4 text-accent" />
              Google
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 flex items-center justify-center gap-2 bg-background/50 hover:bg-background/80 card-glow"
            >
              <FaFacebook className="h-4 w-4 text-accent" />
              Facebook
            </Button>
          </div>
          
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-2 bg-card text-muted-foreground">Or</span>
            </div>
          </div>
          
          {isLogin ? (
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                          <Input 
                            {...field} 
                            type="text"
                            placeholder="Username" 
                            className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary"
                            autoComplete="username"
                          />
                        </div>
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
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                          <Input 
                            {...field} 
                            type={showPassword ? "text" : "password"} 
                            placeholder="Password" 
                            className="pl-10 pr-10 h-12 bg-background/50 border-border/50 focus:border-primary"
                            autoComplete="current-password"
                          />
                          <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-muted-foreground"
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </FormControl>
                      <div className="flex justify-end">
                        <Button type="button" variant="link" className="p-0 h-auto text-xs text-primary">
                          Forgot Password?
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full h-12 mt-6 text-base btn-glow font-medium card-glow"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <LogIn className="h-5 w-5" />
                      Sign In
                    </span>
                  )}
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...registerForm}>
              <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                <FormField
                  control={registerForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                          <Input 
                            {...field} 
                            type="email"
                            placeholder="Email" 
                            className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary"
                            autoComplete="email"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={registerForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                          <Input 
                            {...field} 
                            type="text"
                            placeholder="Full Name" 
                            className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary"
                            autoComplete="name"
                          />
                        </div>
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
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                          <Input 
                            {...field} 
                            type="text"
                            placeholder="Username" 
                            className="pl-10 h-12 bg-background/50 border-border/50 focus:border-primary"
                            autoComplete="username"
                          />
                        </div>
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
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                          <Input 
                            {...field} 
                            type={showPassword ? "text" : "password"} 
                            placeholder="Password" 
                            className="pl-10 pr-10 h-12 bg-background/50 border-border/50 focus:border-primary"
                            autoComplete="new-password"
                          />
                          <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-muted-foreground"
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
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
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                          <Input 
                            {...field} 
                            type={showPassword ? "text" : "password"} 
                            placeholder="Confirm Password" 
                            className="pl-10 pr-10 h-12 bg-background/50 border-border/50 focus:border-primary"
                            autoComplete="new-password"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full h-12 mt-6 text-base btn-glow font-medium card-glow"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating account...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5" />
                      Create account
                    </span>
                  )}
                </Button>
              </form>
            </Form>
          )}
          
          <div className="mt-6 text-center text-sm">
            <p className="text-muted-foreground">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              {" "}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:underline font-medium"
              >
                {isLogin ? "Create account" : "Log in"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}