import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { OperatingHours } from "@shared/schema";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

type OperatingHoursFormProps = {
  onComplete: (data: any) => void;
  restaurantId: number;
  initialData?: OperatingHours[];
};

interface DayHours extends Omit<OperatingHours, 'id'> {
  dayName: string;
  id?: number;
}

interface SpecialHours {
  date: Date;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
  lastSeatingTime: string;
  description: string;
  id?: number;
}

const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const defaultHours: DayHours[] = days.map((day, index) => ({
  dayOfWeek: index,
  dayName: day,
  openTime: "09:00",
  closeTime: "22:00",
  lastSeatingTime: "21:00",
  isClosed: index === 0, // Default Sunday as closed
  restaurantId: 0,
}));

const formSchema = z.object({
  hours: z.array(z.object({
    dayOfWeek: z.number(),
    dayName: z.string(),
    openTime: z.string(),
    closeTime: z.string(),
    lastSeatingTime: z.string(),
    isClosed: z.boolean(),
    restaurantId: z.number(),
    id: z.number().optional(),
  })),
  specialHours: z.array(z.object({
    date: z.date(),
    openTime: z.string(),
    closeTime: z.string(),
    lastSeatingTime: z.string(),
    isClosed: z.boolean(),
    description: z.string(),
    id: z.number().optional(),
  })),
});

const OperatingHoursForm = ({
  onComplete,
  restaurantId,
  initialData,
}: OperatingHoursFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!initialData);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hours: defaultHours,
      specialHours: [],
    },
  });

  useEffect(() => {
    if (initialData && initialData.length > 0) {
      // Transform initialData to include day names
      const mappedHours: DayHours[] = initialData
        .map((hour: OperatingHours) => ({
          ...hour,
          dayName: days[hour.dayOfWeek],
        }))
        .sort((a: DayHours, b: DayHours) => a.dayOfWeek - b.dayOfWeek);
      
      form.setValue("hours", mappedHours);
      setIsLoading(false);
    } else if (restaurantId) {
      // Fetch hours if not provided
      const fetchHours = async () => {
        try {
          const res = await apiRequest(
            "GET",
            `/api/operating-hours/restaurant/${restaurantId}`
          );
          const data = await res.json();
          
          if (data && data.length > 0) {
            const mappedHours: DayHours[] = data
              .map((hour: OperatingHours) => ({
                ...hour,
                dayName: days[hour.dayOfWeek],
              }))
              .sort((a: DayHours, b: DayHours) => a.dayOfWeek - b.dayOfWeek);
            
            form.setValue("hours", mappedHours);
          }
        } catch (error) {
          console.error("Failed to fetch operating hours:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchHours();
    } else {
      setIsLoading(false);
    }
  }, [initialData, restaurantId, form]);

  const handleHoursChange = (
    dayOfWeek: number,
    field: "openTime" | "closeTime" | "isClosed" | "lastSeatingTime",
    value: string | boolean
  ) => {
    const currentHours = form.getValues("hours");
    const updatedHours = currentHours.map((day) =>
      day.dayOfWeek === dayOfWeek ? { ...day, [field]: value } : day
    );
    form.setValue("hours", updatedHours);
  };

  const handleSpecialHoursAdd = () => {
    const currentSpecialHours = form.getValues("specialHours");
    form.setValue("specialHours", [
      ...currentSpecialHours,
      {
        date: new Date(),
        openTime: "09:00",
        closeTime: "22:00",
        lastSeatingTime: "21:00",
        isClosed: false,
        description: "",
      },
    ]);
  };

  const handleSpecialHoursRemove = (index: number) => {
    const currentSpecialHours = form.getValues("specialHours");
    form.setValue(
      "specialHours",
      currentSpecialHours.filter((_, i) => i !== index)
    );
  };

  const handleSpecialHoursChange = (
    index: number,
    field: keyof SpecialHours,
    value: any
  ) => {
    const currentSpecialHours = form.getValues("specialHours");
    form.setValue(
      "specialHours",
      currentSpecialHours.map((hours, i) =>
        i === index ? { ...hours, [field]: value } : hours
      )
    );
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // Save regular hours
      for (const day of data.hours) {
        const payload = {
          restaurantId,
          dayOfWeek: day.dayOfWeek,
          openTime: day.openTime,
          closeTime: day.closeTime,
          lastSeatingTime: day.lastSeatingTime,
          isClosed: day.isClosed,
        };

        if (day.id) {
          await apiRequest("PUT", `/api/operating-hours/${day.id}`, payload);
        } else {
          await apiRequest("POST", "/api/operating-hours", payload);
        }
      }

      // Save special hours
      for (const special of data.specialHours) {
        const payload = {
          restaurantId,
          date: special.date.toISOString().split('T')[0],
          openTime: special.openTime,
          closeTime: special.closeTime,
          lastSeatingTime: special.lastSeatingTime,
          isClosed: special.isClosed,
          description: special.description,
        };

        if (special.id) {
          await apiRequest("PUT", `/api/special-hours/${special.id}`, payload);
        } else {
          await apiRequest("POST", "/api/special-hours", payload);
        }
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: [`/api/operating-hours/restaurant/${restaurantId}`],
      });

      // Complete the step
      onComplete(data);
    } catch (error) {
      console.error("Failed to save operating hours:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading operating hours...</span>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="prose max-w-none">
          <h3>Set Your Restaurant's Operating Hours</h3>
          <p>
            Specify when your restaurant opens and closes each day of the week.
            Toggle the "Closed" checkbox if your restaurant is closed on a
            particular day.
          </p>
        </div>

        <div className="space-y-4">
          {form.watch("hours").map((day) => (
            <Card key={day.dayOfWeek}>
              <CardHeader className="py-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{day.dayName}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <FormField
                      control={form.control}
                      name={`hours.${day.dayOfWeek}.isClosed`}
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-medium">
                            Closed
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name={`hours.${day.dayOfWeek}.openTime`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opening Time</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                            disabled={day.isClosed}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`hours.${day.dayOfWeek}.closeTime`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Closing Time</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                            disabled={day.isClosed}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`hours.${day.dayOfWeek}.lastSeatingTime`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Seating Time</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                            disabled={day.isClosed}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Special Hours</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSpecialHoursAdd}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Special Hours
            </Button>
          </div>

          {form.watch("specialHours").map((special, index) => (
            <Card key={index}>
              <CardHeader className="py-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Special Hours</CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSpecialHoursRemove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`specialHours.${index}.date`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <DatePicker
                            date={field.value}
                            onSelect={(date: Date | undefined) =>
                              field.onChange(date || new Date())
                            }
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`specialHours.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Christmas Eve"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`specialHours.${index}.openTime`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opening Time</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                            disabled={special.isClosed}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`specialHours.${index}.closeTime`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Closing Time</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                            disabled={special.isClosed}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`specialHours.${index}.lastSeatingTime`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Seating Time</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                            disabled={special.isClosed}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`specialHours.${index}.isClosed`}
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-medium">
                          Closed
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Hours"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default OperatingHoursForm;