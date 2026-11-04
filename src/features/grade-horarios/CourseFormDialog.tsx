import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Clock,
  MapPin,
  Plus,
  Trash2,
  User as UserIcon,
  Check,
  CalendarPlus,
} from "lucide-react";
import {
  GRADE_COLOR_PALETTE,
  GRADE_WEEKDAYS,
  GradeConflict,
  GradeCourse,
  GradeCourseInput,
  WeekdayId,
} from "./types";
import { isValidTimeRange } from "./conflict-utils";
import { toast } from "sonner";

interface SlotDraft {
  tempId: string;
  id?: string;
  dayOfWeek: WeekdayId;
  startTime: string;
  endTime: string;
}

interface CourseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCourse: GradeCourse | null;
  onCheckConflicts: (candidate: GradeCourseInput, ignoreCourseId?: string) => GradeConflict[];
  onSave: (input: GradeCourseInput, editingId?: string) => Promise<void>;
  onRequestDelete?: (course: GradeCourse) => void;
}

function makeTempId(): string {
  return `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function CourseFormDialog({
  open,
  onOpenChange,
  editingCourse,
  onCheckConflicts,
  onSave,
  onRequestDelete,
}: CourseFormDialogProps) {
  const [name, setName] = useState("");
  const [professor, setProfessor] = useState("");
  const [room, setRoom] = useState("");
  const [color, setColor] = useState(GRADE_COLOR_PALETTE[0].value);
  const [slots, setSlots] = useState<SlotDraft[]>([]);

  // Adição rápida em múltiplos dias (ex: Seg e Qua das 14:00 às 16:00)
  const [quickDays, setQuickDays] = useState<WeekdayId[]>([]);
  const [quickStart, setQuickStart] = useState("14:00");
  const [quickEnd, setQuickEnd] = useState("16:00");

  // Estado de conflitos detectados antes de salvar
  const [detectedConflicts, setDetectedConflicts] = useState<GradeConflict[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDetectedConflicts([]);

    if (editingCourse) {
      setName(editingCourse.name);
      setProfessor(editingCourse.professor);
      setRoom(editingCourse.room);
      setColor(editingCourse.color || GRADE_COLOR_PALETTE[0].value);
      setSlots(
        editingCourse.slots.map((s) => ({
          tempId: makeTempId(),
          id: s.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      );
      setQuickDays([]);
    } else {
      setName("");
      setProfessor("");
      setRoom("");
      setColor(GRADE_COLOR_PALETTE[0].value);
      setSlots([
        {
          tempId: makeTempId(),
          dayOfWeek: 0,
          startTime: "08:00",
          endTime: "10:00",
        },
      ]);
      setQuickDays([]);
      setQuickStart("14:00");
      setQuickEnd("16:00");
    }
  }, [open, editingCourse]);

  const handleSlotChange = (
    tempId: string,
    field: "dayOfWeek" | "startTime" | "endTime",
    value: WeekdayId | string,
  ) => {
    setDetectedConflicts([]);
    setSlots((prev) =>
      prev.map((slot) => (slot.tempId === tempId ? { ...slot, [field]: value } : slot)),
    );
  };

  const handleAddSingleSlot = () => {
    setDetectedConflicts([]);
    const lastSlot = slots[slots.length - 1];
    const nextDay = lastSlot ? (((lastSlot.dayOfWeek + 1) % 5) as WeekdayId) : 0;
    setSlots((prev) => [
      ...prev,
      {
        tempId: makeTempId(),
        dayOfWeek: nextDay,
        startTime: lastSlot?.startTime || "08:00",
        endTime: lastSlot?.endTime || "10:00",
      },
    ]);
  };

  const handleRemoveSlot = (tempId: string) => {
    if (slots.length <= 1) {
      toast.error("A matéria precisa ter pelo menos um horário na semana.");
      return;
    }
    setDetectedConflicts([]);
    setSlots((prev) => prev.filter((s) => s.tempId !== tempId));
  };

  const toggleQuickDay = (dayId: WeekdayId) => {
    setQuickDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId].sort(),
    );
  };

  const handleApplyQuickDays = () => {
    if (quickDays.length === 0) {
      toast.info("Selecione um ou mais dias acima para aplicar o horário rápido.");
      return;
    }
    if (!isValidTimeRange(quickStart, quickEnd)) {
      toast.error("O horário de término deve ser maior que o horário de início.");
      return;
    }

    setDetectedConflicts([]);
    const newDrafts: SlotDraft[] = quickDays.map((dayId) => ({
      tempId: makeTempId(),
      dayOfWeek: dayId,
      startTime: quickStart,
      endTime: quickEnd,
    }));

    setSlots((prev) => [...prev, ...newDrafts]);
    setQuickDays([]);
    toast.success(`${newDrafts.length} horário(s) adicionado(s) à lista da matéria!`);
  };

  const buildCandidateInput = (): GradeCourseInput | null => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Informe o nome da disciplina.");
      return null;
    }

    if (slots.length === 0) {
      toast.error("Adicione pelo menos um horário para a matéria.");
      return null;
    }

    for (const slot of slots) {
      if (!isValidTimeRange(slot.startTime, slot.endTime)) {
        const dayName =
          GRADE_WEEKDAYS.find((d) => d.id === slot.dayOfWeek)?.fullLabel || "Dia selecionado";
        toast.error(
          `Horário inválido em ${dayName}: o término (${slot.endTime}) deve ser após o início (${slot.startTime}).`,
        );
        return null;
      }
    }

    return {
      name: trimmedName,
      professor: professor.trim(),
      room: room.trim(),
      color,
      slots: slots.map((s) => ({
        id: s.id,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    };
  };

  const handleSaveAttempt = async (forceSaveWithConflicts = false) => {
    const candidate = buildCandidateInput();
    if (!candidate) return;

    if (!forceSaveWithConflicts) {
      const conflicts = onCheckConflicts(candidate, editingCourse?.id);
      if (conflicts.length > 0) {
        setDetectedConflicts(conflicts);
        return;
      }
    }

    try {
      setIsSaving(true);
      await onSave(candidate, editingCourse?.id);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-elevated border-border sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display font-bold text-foreground">
            {editingCourse ? "Editar Matéria da Grade" : "Nova Matéria na Grade"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Preencha os dados da disciplina, escolha uma cor e defina os dias e horários de aula.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Dados básicos da disciplina */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="grade-course-name">Nome da Disciplina *</Label>
              <Input
                id="grade-course-name"
                placeholder="Ex: Cálculo Diferencial e Integral I"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-background border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade-course-professor" className="flex items-center gap-1.5">
                <UserIcon size={13} className="text-muted-foreground" />
                Professor(a)
              </Label>
              <Input
                id="grade-course-professor"
                placeholder="Ex: Prof. Ricardo Almeida"
                value={professor}
                onChange={(e) => setProfessor(e.target.value)}
                className="bg-background border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade-course-room" className="flex items-center gap-1.5">
                <MapPin size={13} className="text-muted-foreground" />
                Sala / Local
              </Label>
              <Input
                id="grade-course-room"
                placeholder="Ex: Bloco B • Sala 302"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="bg-background border-border"
              />
            </div>
          </div>

          {/* Paleta de cores */}
          <div className="space-y-2">
            <Label>Cor na Grade</Label>
            <div className="flex flex-wrap gap-2.5 pt-1">
              {GRADE_COLOR_PALETTE.map((option) => {
                const isSelected = color.toLowerCase() === option.value.toLowerCase();
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setColor(option.value)}
                    title={option.label}
                    aria-label={`Selecionar cor ${option.label}`}
                    className={`h-8 w-8 rounded-full flex items-center justify-center transition-transform cursor-pointer border-2 ${
                      isSelected
                        ? "scale-110 border-foreground shadow-md"
                        : "border-transparent opacity-80 hover:opacity-100 hover:scale-105"
                    }`}
                    style={{ backgroundColor: option.value }}
                  >
                    {isSelected && <Check size={15} className="text-[#0f0b1f] stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Atalho para adicionar múltiplos dias com o mesmo horário (ex: Seg e Qua 14:00-16:00) */}
          <div className="rounded-xl border border-border bg-background/40 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CalendarPlus size={14} className="text-primary" />
                Adicionar horário em múltiplos dias (ex: Seg e Qua)
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {GRADE_WEEKDAYS.map((day) => {
                const active = quickDays.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => toggleQuickDay(day.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer border ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-surface border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {day.shortLabel}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="quick-start-time" className="text-xs text-muted-foreground">
                  Início
                </Label>
                <Input
                  id="quick-start-time"
                  type="time"
                  value={quickStart}
                  onChange={(e) => setQuickStart(e.target.value)}
                  className="h-8 w-28 bg-background border-border text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="quick-end-time" className="text-xs text-muted-foreground">
                  Fim
                </Label>
                <Input
                  id="quick-end-time"
                  type="time"
                  value={quickEnd}
                  onChange={(e) => setQuickEnd(e.target.value)}
                  className="h-8 w-28 bg-background border-border text-xs"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleApplyQuickDays}
                className="h-8 text-xs border-primary/40 text-primary hover:bg-primary/10"
              >
                <Plus size={14} className="mr-1" />
                Inserir nos dias marcados
              </Button>
            </div>
          </div>

          {/* Lista de horários configurados para a matéria */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <Clock size={14} className="text-primary" />
                Horários da Disciplina ({slots.length})
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddSingleSlot}
                className="h-7 text-xs text-primary hover:bg-primary/10"
              >
                <Plus size={14} className="mr-1" /> Adicionar Horário
              </Button>
            </div>

            <div className="space-y-2">
              {slots.map((slot, index) => (
                <div
                  key={slot.tempId}
                  className="flex flex-col sm:flex-row sm:items-center gap-2.5 p-3 rounded-lg border border-border bg-background/60"
                >
                  <div className="flex-1 min-w-[140px]">
                    <Label htmlFor={`slot-day-${index}`} className="sr-only">
                      Dia da Semana
                    </Label>
                    <select
                      id={`slot-day-${index}`}
                      value={slot.dayOfWeek}
                      onChange={(e) =>
                        handleSlotChange(
                          slot.tempId,
                          "dayOfWeek",
                          Number(e.target.value) as WeekdayId,
                        )
                      }
                      className="w-full h-9 rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {GRADE_WEEKDAYS.map((day) => (
                        <option
                          key={day.id}
                          value={day.id}
                          className="bg-surface-elevated text-foreground"
                        >
                          {day.fullLabel}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <Label
                        htmlFor={`slot-start-${index}`}
                        className="text-xs text-muted-foreground"
                      >
                        Das
                      </Label>
                      <Input
                        id={`slot-start-${index}`}
                        type="time"
                        value={slot.startTime}
                        onChange={(e) =>
                          handleSlotChange(slot.tempId, "startTime", e.target.value)
                        }
                        className="h-9 w-28 bg-surface border-border text-sm"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Label
                        htmlFor={`slot-end-${index}`}
                        className="text-xs text-muted-foreground"
                      >
                        às
                      </Label>
                      <Input
                        id={`slot-end-${index}`}
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => handleSlotChange(slot.tempId, "endTime", e.target.value)}
                        className="h-9 w-28 bg-surface border-border text-sm"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSlot(slot.tempId)}
                      disabled={slots.length <= 1}
                      title="Remover este horário"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alerta de conflito de horários */}
          {detectedConflicts.length > 0 && (
            <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-amber-300">
                    Conflito de horário detectado ({detectedConflicts.length})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Encontramos sobreposição no mesmo dia com horários já cadastrados. Você pode
                    ajustar os horários acima ou salvar mesmo assim.
                  </p>
                </div>
              </div>

              <ul className="space-y-1.5 text-xs">
                {detectedConflicts.map((conflict, idx) => (
                  <li
                    key={idx}
                    className="flex flex-wrap items-center gap-1.5 rounded-md bg-background/70 px-3 py-2 border border-amber-500/30 text-foreground"
                  >
                    <Badge
                      variant="outline"
                      className="border-amber-400/50 text-amber-300 text-[10px]"
                    >
                      {conflict.dayLabel}
                    </Badge>
                    <span>
                      Sobreposição das{" "}
                      <strong>
                        {conflict.overlapStart} às {conflict.overlapEnd}
                      </strong>{" "}
                      com <strong>{conflict.conflictingCourseName}</strong>
                      {conflict.conflictingRoom ? ` (${conflict.conflictingRoom})` : ""}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDetectedConflicts([])}
                  className="border-border"
                >
                  Ajustar Horários
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleSaveAttempt(true)}
                  disabled={isSaving}
                  className="bg-amber-400 text-[#0f0b1f] hover:bg-amber-300 font-bold"
                >
                  Salvar Mesmo Assim
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-2">
          <div>
            {editingCourse && onRequestDelete && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  onOpenChange(false);
                  onRequestDelete(editingCourse);
                }}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full sm:w-auto"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir Matéria
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => handleSaveAttempt(false)}
              disabled={isSaving}
              className="shadow-glow font-bold"
            >
              {editingCourse ? "Salvar Alterações" : "Adicionar à Grade"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

