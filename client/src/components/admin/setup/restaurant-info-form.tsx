import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { insertRestaurantSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Restaurant } from "@shared/schema";

type RestaurantInfoFormProps = {
  onComplete: (data: z.infer<typeof formSchema>) => void;
  initialData?: Restaurant | null;
};

// Extended schema for form validation
const formSchema = insertRestaurantSchema
  .extend({
    name: z.string().min(1, "Name is required"),
    address: z.string().min(1, "Address is required"),
    phone: z.string().min(1, "Phone is required"),
    description: z.string().optional(),
    email: z.string().email("Invalid email").optional().nullable(),
    website: z.string().url("Invalid URL").optional().nullable(),
    logo: z.string().optional().nullable(),
    currency: z.string().default("USD"),
  })
  .omit({ isConfigured: true });

const RestaurantInfoForm = ({ onComplete, initialData }: RestaurantInfoFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default values from initialData or provide empty defaults
  const defaultValues = initialData
    ? {
        name: initialData.name,
        description: initialData.description ?? "",
        address: initialData.address,
        phone: initialData.phone,
        email: initialData.email ?? "",
        website: initialData.website ?? "",
        logo: initialData.logo ?? "",
        currency: initialData.currency || "USD",
      }
    : {
        name: "",
        description: "",
        address: "",
        phone: "",
        email: "",
        website: "",
        logo: "",
        currency: "USD",
      };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // Form submission handler
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      await onComplete(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Restaurant Name*</FormLabel>
                <FormControl>
                  <Input placeholder="Gourmet Fusion" {...field} />
                </FormControl>
                <FormDescription>
                  Enter the name of your restaurant
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number*</FormLabel>
                <FormControl>
                  <Input placeholder="+1 (555) 123-4567" {...field} />
                </FormControl>
                <FormDescription>
                  Enter your restaurant's contact number
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address*</FormLabel>
              <FormControl>
                <Input placeholder="123 Culinary Street, Flavorville" {...field} />
              </FormControl>
              <FormDescription>
                Enter the physical address of your restaurant
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="A fine dining experience with a fusion of international cuisines"
                  {...field}
                  value={field.value || ""}
                  rows={3}
                />
              </FormControl>
              <FormDescription>
                Provide a brief description of your restaurant
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input placeholder="contact@restaurant.com" {...field} value={field.value || ""} />
                </FormControl>
                <FormDescription>
                  Enter your restaurant's email address
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input placeholder="https://restaurant.com" {...field} value={field.value || ""} />
                </FormControl>
                <FormDescription>
                  Enter your restaurant's website URL
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="logo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Logo URL</FormLabel>
                <FormControl>
                  <Input placeholder="/logo.png" {...field} value={field.value || ""} />
                </FormControl>
                <FormDescription>
                  Enter a URL for your restaurant's logo
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <FormControl>
                  <Input placeholder="USD" {...field} />
                </FormControl>
                <FormDescription>
                  Enter the currency code (e.g., USD, EUR)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save and Continue"}
        </Button>
      </form>
    </Form>
  );
};

export default RestaurantInfoForm;