import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, subMonths, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isBefore, startOfToday } from "date-fns";

interface CalendarProps {
  selectedTrainerId: string;
  selectedDate: string;
  selectedTime: string;
  onDateSelect: (date: string) => void;
  onTimeSelect: (time: string) => void;
}

export default function Calendar({ selectedTrainerId, selectedDate, selectedTime, onDateSelect, onTimeSelect }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const { data: availability } = useQuery({
    queryKey: ["/api/trainers", selectedTrainerId, "availability", selectedDate],
    enabled: !!selectedTrainerId && !!selectedDate,
    queryFn: async () => {
      const response = await fetch(`/api/trainers/${selectedTrainerId}/availability?date=${selectedDate}`);
      if (!response.ok) {
        throw new Error('Failed to fetch availability');
      }
      return response.json();
    }
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const today = startOfToday();

  const handleDateClick = (day: Date) => {
    if (isBefore(day, today)) return;
    const dateString = format(day, 'yyyy-MM-dd');
    onDateSelect(dateString);
  };

  const handleTimeClick = (time: string) => {
    onTimeSelect(time);
  };

  return (
    <div className="bg-muted p-4 rounded-lg space-y-4" data-testid="booking-calendar">
      {/* Calendar Header */}
      <div className="flex justify-between items-center">
          <Button
          variant="ghost" 
          size="sm" 
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="min-h-11 min-w-11"
          data-testid="calendar-prev-month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="font-semibold" data-testid="calendar-month-year">
          {format(currentMonth, 'MMMM yyyy')}
        </div>
          <Button
          variant="ghost" 
          size="sm" 
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="min-h-11 min-w-11"
          data-testid="calendar-next-month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div>
        {/* Day headers */}
        <div className="mb-2 grid grid-cols-7 gap-1 sm:gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-1 text-center text-xs text-muted-foreground sm:p-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {days.map(day => {
            const dateString = format(day, 'yyyy-MM-dd');
            const isPast = isBefore(day, today);
            const isSelected = selectedDate === dateString;
            const isCurrentDay = isToday(day);

            return (
              <button
                key={day.toString()}
                onClick={() => handleDateClick(day)}
                disabled={isPast}
                className={`
                   flex aspect-square min-h-11 items-center justify-center rounded-lg border text-sm transition-all
                  ${isPast 
                    ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                    : 'hover:bg-accent cursor-pointer'
                  }
                  ${isSelected 
                    ? 'bg-primary text-primary-foreground' 
                    : 'border-border'
                  }
                  ${isCurrentDay && !isSelected
                    ? 'border-primary' 
                    : ''
                  }
                `}
                data-testid={`calendar-day-${format(day, 'dd')}`}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </div>

      {/* Available Times */}
      {selectedDate && (
        <div>
          <div className="text-sm font-medium mb-3">Available Times for {selectedDate}</div>
          {!selectedTrainerId ? (
            <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg" data-testid="loading-times">
              Loading available times...
            </div>
          ) : availability?.availableTimes?.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2" data-testid="available-times">
              {availability.availableTimes.map((time: string) => {
                const hour = parseInt(time.split(':')[0]);
                const displayTime = hour >= 12 
                  ? `${hour === 12 ? 12 : hour - 12}:00 PM` 
                  : `${hour}:00 AM`;
                return (
                  <Button
                    key={time}
                    variant={selectedTime === time ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTimeClick(time)}
                    className="min-h-11 transition-all"
                    data-testid={`time-slot-${time}`}
                  >
                    {displayTime}
                  </Button>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground" data-testid="no-times-available">
              No available times for this date
            </div>
          )}
        </div>
      )}
    </div>
  );
}
