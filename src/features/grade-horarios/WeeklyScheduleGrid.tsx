import { useMemo } from "react";
import {
  GRADE_WEEKDAYS,
  GradeClassBlock,
  GradeCourse,
  WeekdayId,
  WeekdayMeta,
} from "./types";
import { doIntervalsOverlap } from "./conflict-utils";
import { AlertTriangle, Clock, MapPin, Pencil, Trash2, User as UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface WeeklyScheduleGridProps {
  courses: GradeCourse[];
  blocks: GradeClassBlock[];
  showWeekend: boolean;
  onEditCourse: (courseId: string) => void;
  onDeleteCourse: (course: GradeCourse) => void;
}

interface PositionedBlock extends GradeClassBlock {
  laneIndex: number;
  totalLanes: number;
  hasConflict: boolean;
}

const HOUR_ROW_HEIGHT = 64; // px por hora na grade desktop

/**
 * Organiza os blocos de um mesmo dia em colunas ("lanes") quando há sobreposição,
 * para que dois blocos conflitantes fiquem lado a lado sem ficarem ocultos.
 */
function layoutDayBlocks(dayBlocks: GradeClassBlock[]): PositionedBlock[] {
  const sorted = [...dayBlocks].sort((a, b) => a.startMinutes - b.startMinutes);

  return sorted.map((block) => {
    const overlapping = sorted.filter(
      (other) =>
        other.blockId !== block.blockId &&
        doIntervalsOverlap(block.startTime, block.endTime, other.startTime, other.endTime),
    );

    if (overlapping.length === 0) {
      return {
        ...block,
        laneIndex: 0,
        totalLanes: 1,
        hasConflict: false,
      };
    }

    const cluster = [block, ...overlapping].sort((a, b) => {
      if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
      return a.blockId.localeCompare(b.blockId);
    });

    const laneIndex = cluster.findIndex((item) => item.blockId === block.blockId);
    return {
      ...block,
      laneIndex: Math.max(0, laneIndex),
      totalLanes: cluster.length,
      hasConflict: true,
    };
  });
}

export function WeeklyScheduleGrid({
  courses,
  blocks,
  showWeekend,
  onEditCourse,
  onDeleteCourse,
}: WeeklyScheduleGridProps) {
  const visibleDays: WeekdayMeta[] = useMemo(
    () => (showWeekend ? GRADE_WEEKDAYS : GRADE_WEEKDAYS.filter((d) => !d.isWeekend)),
    [showWeekend],
  );

  // Calcula faixa de horas visível na grade (padrão 07:00 às 22:00, expandindo conforme aulas)
  const { startHour, endHour, hoursList } = useMemo(() => {
    let minH = 7;
    let maxH = 22;

    for (const block of blocks) {
      const bStartH = Math.floor(block.startMinutes / 60);
      const bEndH = Math.ceil(block.endMinutes / 60);
      if (bStartH < minH) minH = Math.max(0, bStartH);
      if (bEndH > maxH) maxH = Math.min(24, bEndH);
    }

    const hours: number[] = [];
    for (let h = minH; h <= maxH; h++) {
      hours.push(h);
    }

    return { startHour: minH, endHour: maxH, hoursList: hours };
  }, [blocks]);

  const blocksByDay = useMemo(() => {
    const map: Record<WeekdayId, PositionedBlock[]> = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
    };

    for (const day of GRADE_WEEKDAYS) {
      const dayItems = blocks.filter((b) => b.dayOfWeek === day.id);
      map[day.id] = layoutDayBlocks(dayItems);
    }

    return map;
  }, [blocks]);

  const totalGridHeight = Math.max(1, endHour - startHour) * HOUR_ROW_HEIGHT;

  // Identifica o dia da semana atual (0 = Seg ... 6 = Dom)
  const todayWeekdayId: WeekdayId = useMemo(() => {
    const jsDay = new Date().getDay();
    return (jsDay === 0 ? 6 : jsDay - 1) as WeekdayId;
  }, []);

  return (
    <div className="space-y-4">
      {/* =========================================================
          VISUALIZAÇÃO DESKTOP: GRADE SEMANAL DE HORÁRIOS
      ========================================================= */}
      <div className="hidden md:block rounded-xl border border-border bg-surface-elevated overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            {/* Cabeçalho dos dias da semana */}
            <div
              className="grid border-b border-border bg-surface/90 sticky top-0 z-10"
              style={{
                gridTemplateColumns: `72px repeat(${visibleDays.length}, minmax(130px, 1fr))`,
              }}
            >
              <div className="p-3 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-r border-border flex items-center justify-center">
                Horário
              </div>
              {visibleDays.map((day) => {
                const isToday = day.id === todayWeekdayId;
                const dayCount = blocksByDay[day.id]?.length || 0;
                return (
                  <div
                    key={day.id}
                    className={`p-3 border-r last:border-r-0 border-border flex flex-col items-center justify-center gap-0.5 ${
                      isToday ? "bg-primary/10" : ""
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-display font-bold text-sm ${
                          isToday ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {day.fullLabel.split("-")[0]}
                      </span>
                      {isToday && (
                        <Badge className="bg-primary/20 text-primary border-none text-[9px] px-1.5 py-0 h-4 uppercase">
                          Hoje
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {dayCount === 0
                        ? "Livre"
                        : `${dayCount} ${dayCount === 1 ? "aula" : "aulas"}`}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Corpo da grade com linhas de hora e blocos posicionados */}
            <div
              className="relative grid"
              style={{
                gridTemplateColumns: `72px repeat(${visibleDays.length}, minmax(130px, 1fr))`,
                height: `${totalGridHeight}px`,
              }}
            >
              {/* Coluna de horários à esquerda */}
              <div className="relative border-r border-border bg-surface/50 select-none">
                {hoursList.slice(0, -1).map((hour, idx) => (
                  <div
                    key={hour}
                    className="border-b border-border/40 pr-2 pt-1 text-right text-[11px] font-medium text-muted-foreground"
                    style={{ height: `${HOUR_ROW_HEIGHT}px` }}
                  >
                    {`${String(hour).padStart(2, "0")}:00`}
                    {idx === hoursList.length - 2 && (
                      <span className="absolute bottom-1 right-2 text-[10px] text-muted-foreground/70">
                        {`${String(endHour).padStart(2, "0")}:00`}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Colunas de cada dia da semana */}
              {visibleDays.map((day) => {
                const dayBlocks = blocksByDay[day.id] || [];
                const isToday = day.id === todayWeekdayId;

                return (
                  <div
                    key={day.id}
                    className={`relative border-r last:border-r-0 border-border ${
                      isToday ? "bg-primary/[0.02]" : ""
                    }`}
                  >
                    {/* Linhas horizontais de fundo */}
                    {hoursList.slice(0, -1).map((hour) => (
                      <div
                        key={hour}
                        className="border-b border-border/30"
                        style={{ height: `${HOUR_ROW_HEIGHT}px` }}
                      />
                    ))}

                    {/* Blocos de aula posicionados pelo horário */}
                    {dayBlocks.map((block) => {
                      const offsetMinutes = block.startMinutes - startHour * 60;
                      const topPx = (offsetMinutes / 60) * HOUR_ROW_HEIGHT;
                      const heightPx = Math.max(
                        44,
                        (block.durationMinutes / 60) * HOUR_ROW_HEIGHT - 2,
                      );

                      const widthPercent = 100 / block.totalLanes;
                      const leftPercent = block.laneIndex * widthPercent;

                      return (
                        <button
                          key={block.blockId}
                          type="button"
                          onClick={() => onEditCourse(block.courseId)}
                          title={`${block.name} (${block.startTime}–${block.endTime})${
                            block.room ? ` • ${block.room}` : ""
                          }${block.professor ? ` • ${block.professor}` : ""} — Clique para editar`}
                          className="absolute z-[5] rounded-lg p-2 text-left transition-all hover:z-20 hover:scale-[1.01] hover:shadow-lg cursor-pointer overflow-hidden flex flex-col justify-between border"
                          style={{
                            top: `${topPx + 1}px`,
                            height: `${heightPx}px`,
                            left: `calc(${leftPercent}% + 3px)`,
                            width: `calc(${widthPercent}% - 6px)`,
                            backgroundColor: `${block.color}1C`,
                            borderColor: block.hasConflict ? "#ffcc33" : `${block.color}66`,
                            borderLeftWidth: "4px",
                            borderLeftColor: block.color,
                          }}
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-start justify-between gap-1">
                              <p className="font-bold text-xs text-foreground leading-tight line-clamp-2">
                                {block.name}
                              </p>
                              {block.hasConflict && (
                                <span
                                  title="Conflito de horário neste intervalo"
                                  className="shrink-0 mt-0.5"
                                >
                                  <AlertTriangle size={12} className="text-amber-400" />
                                </span>
                              )}
                            </div>

                            {block.room && (
                              <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                                <MapPin size={10} className="shrink-0" style={{ color: block.color }} />
                                <span className="truncate">{block.room}</span>
                              </p>
                            )}

                            {block.professor && heightPx >= 76 && (
                              <p className="text-[10px] text-muted-foreground/90 truncate flex items-center gap-1">
                                <UserIcon size={10} className="shrink-0" />
                                <span className="truncate">{block.professor}</span>
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-[10px] font-semibold text-foreground/90 pt-0.5">
                            <Clock size={10} style={{ color: block.color }} className="shrink-0" />
                            <span className="truncate">
                              {block.startTime} – {block.endTime}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          VISUALIZAÇÃO MOBILE: LISTA AGRUPADA POR DIA DA SEMANA
      ========================================================= */}
      <div className="md:hidden space-y-4">
        {visibleDays.map((day) => {
          const dayBlocks = blocksByDay[day.id] || [];
          const isToday = day.id === todayWeekdayId;

          return (
            <div
              key={day.id}
              className={`rounded-xl border bg-surface-elevated p-4 space-y-3 ${
                isToday ? "border-primary/50" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-base text-foreground">
                    {day.fullLabel}
                  </h3>
                  {isToday && (
                    <Badge className="bg-primary/20 text-primary border-none text-[10px] uppercase">
                      Hoje
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {dayBlocks.length === 0
                    ? "Sem aulas"
                    : `${dayBlocks.length} ${dayBlocks.length === 1 ? "aula" : "aulas"}`}
                </span>
              </div>

              {dayBlocks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Nenhum horário cadastrado para este dia.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {dayBlocks.map((block) => {
                    const parentCourse = courses.find((c) => c.id === block.courseId);
                    return (
                      <div
                        key={block.blockId}
                        onClick={() => onEditCourse(block.courseId)}
                        className="rounded-lg border border-border bg-background/70 p-3 flex items-start justify-between gap-3 cursor-pointer hover:border-primary/50 transition-colors"
                        style={{
                          borderLeftWidth: "4px",
                          borderLeftColor: block.color,
                        }}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-foreground">{block.name}</span>
                            {block.hasConflict && (
                              <Badge
                                variant="outline"
                                className="border-amber-400/50 text-amber-300 text-[10px] h-5"
                              >
                                <AlertTriangle size={10} className="mr-1" />
                                Conflito
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1 font-medium text-foreground/90">
                              <Clock size={12} style={{ color: block.color }} />
                              {block.startTime} – {block.endTime}
                            </span>
                            {block.room && (
                              <span className="flex items-center gap-1">
                                <MapPin size={12} />
                                {block.room}
                              </span>
                            )}
                            {block.professor && (
                              <span className="flex items-center gap-1">
                                <UserIcon size={12} />
                                {block.professor}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditCourse(block.courseId);
                            }}
                            title="Editar matéria"
                          >
                            <Pencil size={14} />
                          </Button>
                          {parentCourse && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteCourse(parentCourse);
                              }}
                              title="Excluir matéria"
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

