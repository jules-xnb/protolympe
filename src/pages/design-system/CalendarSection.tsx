import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";

export default function CalendarSection() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <section className="space-y-6">
      <h2 className="text-[20px] font-semibold text-foreground border-b border-border pb-3">
        Calendar
      </h2>

      <div className="flex items-start gap-8 flex-wrap">
        <div className="space-y-2">
          <h3 className="text-[14px] font-semibold text-foreground">Sélection simple</h3>
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-md border"
          />
        </div>
      </div>
    </section>
  );
}
