import { useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Goal, Subject } from "@/types/models";
import { AddExamDialog } from "./AddExamDialog";
import { EditExamDialog } from "./EditExamDialog";

interface MonthlyAgendaProps {
  exams: (Goal & { createdAt: Date })[];
  subjects: Subject[];
}

export function MonthlyAgenda({ exams, subjects }: MonthlyAgendaProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Domingo
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const dateFormat = "d";
  const rows = [];
  
  let days = [];
  let day = startDate;
  let formattedDate = "";

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      formattedDate = format(day, dateFormat);
      const cloneDay = day;
      const isCurrentMonth = isSameMonth(day, monthStart);
      const isToday = isSameDay(day, new Date());
      
      const dayExams = exams.filter(e => e.targetDate && isSameDay(new Date(e.targetDate), cloneDay));

      days.push(
        <div
          key={day.toString()}
          className={`min-h-[100px] border-r border-b p-2 transition-colors relative cursor-pointer ${
            !isCurrentMonth ? "bg-muted/10 text-muted-foreground/50" : "bg-card hover:bg-muted/20"
          } ${isToday ? "bg-primary/5" : ""}`}
          onClick={() => {
            const dateStr = format(cloneDay, "yyyy-MM-dd");
            setSelectedDate(dateStr);
            setIsAddOpen(true);
          }}
        >
          <div className="flex justify-between items-start">
            <span className={`text-sm font-medium ${isToday ? "bg-primary text-primary-foreground h-6 w-6 flex items-center justify-center rounded-full" : ""}`}>
              {formattedDate}
            </span>
          </div>
          
          <div className="mt-2 space-y-1">
            {dayExams.map((exam) => {
              let parsed = { name: exam.title, subjectId: "none" };
              try { parsed = JSON.parse(exam.title); } catch (e) {}
              
              const subject = subjects.find(s => s.id === parsed.subjectId);
              const color = subject ? subject.color : "#a8ff00";

              return (
                <div 
                  key={exam.id} 
                  className="text-xs px-1.5 py-1 rounded truncate border flex justify-between items-center group"
                  style={{ backgroundColor: `${color}10`, borderColor: `${color}40`, color: color }}
                  onClick={(e) => {
                    // Prevent opening AddExamDialog when clicking on an exam (edit should be handled differently or we just let edit happen inside)
                    // Currently we can put EditExamDialog here, but it triggers click event. We need to stopPropagation.
                    e.stopPropagation();
                  }}
                >
                  <span className="truncate flex-1">{parsed.name}</span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <EditExamDialog exam={exam} triggerClassName="text-current hover:opacity-70" iconSize={12} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div className="grid grid-cols-7" key={day.toString()}>
        {days}
      </div>
    );
    days = [];
  }

  const weekDaysShort = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex items-center justify-between bg-card p-4 rounded-xl border">
        <h2 className="text-xl font-display font-bold capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </h2>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2 rounded-md hover:bg-muted transition-colors">
            <ChevronLeft size={20} />
          </button>
          <button onClick={nextMonth} className="p-2 rounded-md hover:bg-muted transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-card rounded-xl border overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b bg-muted/20">
          {weekDaysShort.map(d => (
            <div key={d} className="text-center py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-r last:border-r-0">
              {d}
            </div>
          ))}
        </div>
        
        {/* Days Grid */}
        <div className="flex flex-col border-l-0">
          {rows}
        </div>
      </div>

      <AddExamDialog 
        initialDate={selectedDate} 
        open={isAddOpen} 
        onOpenChange={setIsAddOpen} 
      />
    </div>
  );
}
