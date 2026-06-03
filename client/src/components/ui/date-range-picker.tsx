import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerWithRangeProps {
  className?: string;
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
  disabledBefore?: Date;
  disabledAfter?: Date;
  theme?: "blue" | "amber";
}

export function DatePickerWithRange({
  className,
  date,
  onDateChange,
  disabledBefore,
  disabledAfter,
  theme = "blue",
}: DatePickerWithRangeProps) {
  const themeStyles = {
    blue: {
      trigger: "bg-blue-50 border-blue-200 text-blue-700",
      icon: "text-blue-700",
      badge: "text-blue-600",
    },
    amber: {
      trigger: "bg-amber-50 border-amber-200 text-amber-700",
      icon: "text-amber-700",
      badge: "text-amber-600",
    },
  };

  const styles = themeStyles[theme];

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <div className={`bg-input rounded-xl border border-border p-3 flex items-center justify-between shadow-sm cursor-pointer active:scale-[0.98] transition-transform`}>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarIcon size={16} />
              <span className="text-sm font-semibold">
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd")} - {format(date.to, "LLL dd")}
                    </>
                  ) : (
                    format(date.from, "LLL dd")
                  )
                ) : (
                  "Select Date Range"
                )}
              </span>
            </div>
            <span className="text-xs font-bold text-primary">
              {!date?.from && !date?.to ? "This Month" : ""}
            </span>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onDateChange}
            numberOfMonths={1}
            disabled={(date) => {
              if (disabledBefore && date < disabledBefore) return true;
              if (disabledAfter && date > disabledAfter) return true;
              return false;
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
