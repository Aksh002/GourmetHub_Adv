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
import { Loader2 } from "lucide-react";

type OperatingHoursFormProps = {
  onComplete: (data: any) => void;
  restaurantId: number;
  initialData?: OperatingHours[];
};

interface DayHours {
  dayOfWeek: number;
  dayName: string;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
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
  isClosed: index === 0, // Default Sunday as closed
}));

const OperatingHoursForm = ({
  onComplete,
  restaurantId,
  initialData,
}: OperatingHoursFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hours, setHours] = useState<DayHours[]>(defaultHours);
  const [isLoading, setIsLoading] = useState(!initialData);

  useEffect(() => {
    if (initialData && initialData.length > 0) {
      // Transform initialData to include day names
      const mappedHours = initialData
        .map((hour) => ({
          ...hour,
          dayName: days[hour.dayOfWeek],
        }))
        .sort((a: any, b: any) => a.dayOfWeek - b.dayOfWeek);
      
      setHours(mappedHours);
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
            const mappedHours = data
              .map((hour: OperatingHours) => ({
                ...hour,
                dayName: days[hour.dayOfWeek],
              }))
              .sort((a: any, b: any) => a.dayOfWeek - b.dayOfWeek);
            
            setHours(mappedHours);
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
  }, [initialData, restaurantId]);

  const handleHoursChange = (
    dayOfWeek: number,
    field: "openTime" | "closeTime" | "isClosed",
    value: string | boolean
  ) => {
    setHours((prevHours) =>
      prevHours.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, [field]: value } : day
      )
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Create or update operating hours for each day
      for (const day of hours) {
        const payload = {
          restaurantId,
          dayOfWeek: day.dayOfWeek,
          openTime: day.openTime,
          closeTime: day.closeTime,
          isClosed: day.isClosed,
        };

        if (day.id) {
          // Update existing hours
          await apiRequest("PUT", `/api/operating-hours/${day.id}`, payload);
        } else {
          // Create new hours
          await apiRequest("POST", "/api/operating-hours", payload);
        }
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: [`/api/operating-hours/restaurant/${restaurantId}`],
      });

      // Complete the step
      onComplete(hours);
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
    <div className="space-y-6">
      <div className="prose max-w-none">
        <h3>Set Your Restaurant's Operating Hours</h3>
        <p>
          Specify when your restaurant opens and closes each day of the week.
          Toggle the "Closed" checkbox if your restaurant is closed on a
          particular day.
        </p>
      </div>

      <div className="space-y-4">
        {hours.map((day) => (
          <Card key={day.dayOfWeek}>
            <CardHeader className="py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{day.dayName}</CardTitle>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`closed-${day.dayOfWeek}`}
                    checked={day.isClosed}
                    onCheckedChange={(checked) =>
                      handleHoursChange(
                        day.dayOfWeek,
                        "isClosed",
                        checked === true
                      )
                    }
                  />
                  <label
                    htmlFor={`closed-${day.dayOfWeek}`}
                    className="text-sm font-medium"
                  >
                    Closed
                  </label>
                </div>
              </div>
              <CardDescription>
                Set operating hours for {day.dayName}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FormLabel htmlFor={`open-${day.dayOfWeek}`}>
                    Opening Time
                  </FormLabel>
                  <Input
                    id={`open-${day.dayOfWeek}`}
                    type="time"
                    value={day.openTime}
                    onChange={(e) =>
                      handleHoursChange(day.dayOfWeek, "openTime", e.target.value)
                    }
                    disabled={day.isClosed}
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel htmlFor={`close-${day.dayOfWeek}`}>
                    Closing Time
                  </FormLabel>
                  <Input
                    id={`close-${day.dayOfWeek}`}
                    type="time"
                    value={day.closeTime}
                    onChange={(e) =>
                      handleHoursChange(
                        day.dayOfWeek,
                        "closeTime",
                        e.target.value
                      )
                    }
                    disabled={day.isClosed}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        onClick={handleSubmit}
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save and Continue"
        )}
      </Button>
    </div>
  );
};

export default OperatingHoursForm;