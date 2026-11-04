import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Calendar,
  Clock,
  GraduationCap,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { GRADE_WEEKDAYS, GradeCourse, GradeCourseInput } from "./types";
import { useGradeHorarios } from "./useGradeHorarios";
import { WeeklyScheduleGrid } from "./WeeklyScheduleGrid";
import { CourseFormDialog } from "./CourseFormDialog";
import { DeleteCourseDialog } from "./DeleteCourseDialog";

export function GradeHorariosPage() {
  const {
    courses,
    blocks,
    isLoading,
    viewConfig,
    hasWeekendClasses,
    setShowWeekend,
    checkConflicts,
    createCourse,
    updateCourse,
    deleteCourse,
  } = useGradeHorarios();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<GradeCourse | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<GradeCourse | null>(null);

  const effectiveShowWeekend = viewConfig.showWeekend || hasWeekendClasses;

  const totalWeeklyHours = useMemo(() => {
    const totalMinutes = blocks.reduce((acc, b) => acc + b.durationMinutes, 0);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }, [blocks]);

  const handleOpenCreate = () => {
    setEditingCourse(null);
    setFormOpen(true);
  };

  const handleOpenEditById = (courseId: string) => {
    const target = courses.find((c) => c.id === courseId);
    if (!target) return;
    setEditingCourse(target);
    setFormOpen(true);
  };

  const handleSaveCourse = async (input: GradeCourseInput, editingId?: string) => {
    if (editingId) {
      await updateCourse(editingId, input);
      toast.success("Matéria atualizada na grade!");
    } else {
      await createCourse(input);
      toast.success("Matéria adicionada à grade de horários!");
    }
  };

  const handleConfirmDelete = async (course: GradeCourse) => {
    await deleteCourse(course.id);
    toast.info(`"${course.name}" foi removida da grade.`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto pb-24 lg:pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Grade de Horários</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Monte visualmente sua grade semanal de aulas, salas e professores. Clique em qualquer
            bloco para editar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowWeekend(!effectiveShowWeekend)}
            className="flex-1 md:flex-none border-border text-xs"
            title="Alternar exibição de Sábado e Domingo na grade"
          >
            <Calendar className="mr-2 h-4 w-4 text-primary" />
            {effectiveShowWeekend ? "Exibindo: Seg a Dom" : "Exibindo: Seg a Sex"}
          </Button>

          <Button
            type="button"
            onClick={handleOpenCreate}
            className="flex-1 md:flex-none shadow-glow font-bold"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Matéria
          </Button>
        </div>
      </div>

      {/* Cards de resumo rápido */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-surface-elevated border-border">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <BookOpen size={20} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Disciplinas na Grade</p>
              <p className="text-xl font-display font-bold text-foreground">{courses.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface-elevated border-border">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Aulas na Semana</p>
              <p className="text-xl font-display font-bold text-foreground">{blocks.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface-elevated border-border">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Carga Horária Semanal</p>
              <p className="text-xl font-display font-bold text-foreground">{totalWeeklyHours}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estado de carregamento ou vazio */}
      {isLoading ? (
        <div className="flex justify-center p-12 text-muted-foreground animate-pulse">
          Carregando grade de horários...
        </div>
      ) : courses.length === 0 ? (
        <Card className="bg-surface/30 border-dashed border-border/60 py-16 shadow-none">
          <CardContent className="flex flex-col items-center text-center space-y-4">
            <GraduationCap size={56} className="text-muted-foreground/30" />
            <div className="space-y-1">
              <p className="font-display font-bold text-xl text-foreground">
                Sua grade de horários ainda está vazia
              </p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Adicione suas matérias da faculdade ou curso com professor, sala e horários para
                visualizar sua semana completa e detectar conflitos automaticamente.
              </p>
            </div>
            <Button onClick={handleOpenCreate} className="shadow-glow font-bold">
              <Plus size={16} className="mr-2" />
              Adicionar Primeira Matéria
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Grade Semanal Visual (Desktop) / Lista Agrupada por Dia (Mobile) */}
          <WeeklyScheduleGrid
            courses={courses}
            blocks={blocks}
            showWeekend={effectiveShowWeekend}
            onEditCourse={handleOpenEditById}
            onDeleteCourse={(course) => setCourseToDelete(course)}
          />

          {/* Lista de disciplinas cadastradas */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-display font-bold text-foreground">
                Disciplinas Cadastradas ({courses.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => (
                <Card
                  key={course.id}
                  className="bg-surface-elevated border-border hover:border-primary/40 transition-colors overflow-hidden"
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="h-3.5 w-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: course.color }}
                        />
                        <h3 className="font-bold text-base text-foreground truncate">
                          {course.name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenEditById(course.id)}
                          title="Editar matéria"
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setCourseToDelete(course)}
                          title="Excluir matéria"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>

                    {(course.professor || course.room) && (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {course.professor && (
                          <p className="flex items-center gap-1.5 truncate">
                            <UserIcon size={12} className="text-primary shrink-0" />
                            <span className="truncate">{course.professor}</span>
                          </p>
                        )}
                        {course.room && (
                          <p className="flex items-center gap-1.5 truncate">
                            <MapPin size={12} className="text-primary shrink-0" />
                            <span className="truncate">{course.room}</span>
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {course.slots.map((slot) => {
                        const dayShort =
                          GRADE_WEEKDAYS.find((d) => d.id === slot.dayOfWeek)?.shortLabel || "Dia";
                        return (
                          <Badge
                            key={slot.id}
                            variant="outline"
                            className="text-[11px] bg-background/60 border-border text-foreground font-normal"
                          >
                            <span className="font-semibold mr-1" style={{ color: course.color }}>
                              {dayShort}
                            </span>
                            {slot.startTime}–{slot.endTime}
                          </Badge>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Modal de Criar / Editar Matéria */}
      <CourseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editingCourse={editingCourse}
        onCheckConflicts={checkConflicts}
        onSave={handleSaveCourse}
        onRequestDelete={(course) => setCourseToDelete(course)}
      />

      {/* Modal de Confirmação de Exclusão */}
      <DeleteCourseDialog
        course={courseToDelete}
        open={Boolean(courseToDelete)}
        onOpenChange={(open) => {
          if (!open) setCourseToDelete(null);
        }}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
}

