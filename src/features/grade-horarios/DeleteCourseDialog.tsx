import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2 } from "lucide-react";
import { GRADE_WEEKDAYS, GradeCourse } from "./types";

interface DeleteCourseDialogProps {
  course: GradeCourse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDelete: (course: GradeCourse) => Promise<void>;
}

export function DeleteCourseDialog({
  course,
  open,
  onOpenChange,
  onConfirmDelete,
}: DeleteCourseDialogProps) {
  if (!course) return null;

  const handleConfirm = async () => {
    await onConfirmDelete(course);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-elevated border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground font-display">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Excluir matéria da grade?
          </DialogTitle>
          <DialogDescription className="text-muted-foreground pt-1">
            Tem certeza que deseja remover{" "}
            <strong className="text-foreground">{course.name}</strong> da sua grade de horários?
            Todos os horários vinculados a esta disciplina serão removidos.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-background/60 p-3 space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: course.color }}
            />
            <span className="font-semibold text-foreground text-sm">{course.name}</span>
          </div>
          {(course.professor || course.room) && (
            <p className="text-muted-foreground">
              {[course.professor, course.room].filter(Boolean).join(" • ")}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {course.slots.map((slot) => {
              const dayName =
                GRADE_WEEKDAYS.find((d) => d.id === slot.dayOfWeek)?.shortLabel || "Dia";
              return (
                <span
                  key={slot.id}
                  className="px-2 py-0.5 rounded bg-surface border border-border text-muted-foreground"
                >
                  {dayName} {slot.startTime}–{slot.endTime}
                </span>
              );
            })}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir Matéria
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

