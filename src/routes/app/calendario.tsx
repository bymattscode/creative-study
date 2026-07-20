import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Goal, Subject } from "@/types/models";
import { CalendarDays, MapPin, Target, Clock, Calendar as CalendarIcon, CheckCircle2 } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/app/calendario")({
  component: CalendarioRoute,
});

function CalendarioRoute() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Buscar todas as provas/metas futuras
  const { data: upcomingExams = [] } = useQuery({
    queryKey: ["upcomingExams", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user?.id)
        .order("target_date", { ascending: true });
      if (error) throw error;
      
      // Filtrar apenas as que têm data e estão no futuro (ou não muito no passado)
      return (data as any[]).filter(g => g.target_date).map(g => ({
        id: g.id,
        title: g.title,
        targetDate: new Date(g.target_date),
        isActive: g.is_active
      })) as Goal[];
    },
    enabled: !!user?.id,
  });

  // Buscar matérias para cruzar nomes
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("user_id", user?.id);
      if (error) throw error;
      return data as Subject[];
    },
    enabled: !!user?.id,
  });

  // Buscar o plano semanal atual
  const { data: weeklyPlan } = useQuery({
    queryKey: ["weeklyPlan", user?.id],
    queryFn: async () => {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      const { data, error } = await supabase
        .from("weekly_plans")
        .select("*")
        .eq("user_id", user?.id)
        .lte("start_date", today)
        .gte("end_date", today)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    },
    enabled: !!user?.id,
  });

  // Buscar items do plano da semana
  const { data: planItems = [] } = useQuery({
    queryKey: ["weekPlanItems", weeklyPlan?.id],
    queryFn: async () => {
      if (!weeklyPlan) return [];
      const { data, error } = await supabase
        .from("plan_items")
        .select("*")
        .eq("weekly_plan_id", weeklyPlan.id)
        .order("scheduled_for", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!weeklyPlan,
  });

  // Gerar dias da semana atual
  const today = new Date();
  const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 }); // Começa na segunda-feira
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfCurrentWeek, i));

  const updateExamDateMutation = useMutation({
    mutationFn: async ({ id, newDate }: { id: string; newDate: string }) => {
      const { error } = await supabase.from("goals").update({ target_date: newDate }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upcomingExams"] });
      queryClient.invalidateQueries({ queryKey: ["nextExam"] });
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      toast.success("Data da prova atualizada no calendário!");
    }
  });

  const updateGoalDateMutation = useMutation({
    mutationFn: async ({ id, newDate }: { id: string; newDate: string }) => {
      const { error } = await supabase.from("goals").update({ target_date: newDate }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upcomingExams"] });
      queryClient.invalidateQueries({ queryKey: ["goal"] });
      toast.success("Final do semestre atualizado no calendário!");
    }
  });

  const getDaysRemaining = (targetDate: Date | string) => {
    const date = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
    const diff = date.getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
  };

  const mainGoal = upcomingExams.find(e => e.isActive);
  const specificExams = upcomingExams.filter(e => !e.isActive);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto pb-12">
      {/* HEADER */}
      <div>
        <p className="text-muted-foreground font-medium flex items-center gap-2 uppercase tracking-widest text-xs mb-1">
          <CalendarDays size={14} className="text-primary" /> Planejamento de Longo Prazo
        </p>
        <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground">
          Seu <span className="text-primary">Calendário</span>
        </h1>
      </div>

      {/* PRÓXIMAS PROVAS */}
      <div className="space-y-4">
        <h2 className="text-xl font-display font-bold flex items-center gap-2">
          <Target className="text-primary" size={20} /> Próximas Provas & Eventos
        </h2>
        
        {upcomingExams.length === 0 ? (
          <Card className="bg-surface-elevated/50 border-dashed border-border">
            <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <MapPin size={40} className="mb-2 opacity-50" />
              <p className="font-bold text-foreground">Nenhuma prova agendada.</p>
              <p className="text-sm mb-4">Cadastre suas próximas provas nas configurações para vê-las aqui.</p>
              <Link to="/app/configuracoes" className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-bold text-sm">
                Cadastrar Prova
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Main Goal (Semestre/Concurso Foco) */}
            {mainGoal && (
              <div className="grid grid-cols-1">
                <Card className="bg-[#21193a] border-primary/50 shadow-sm overflow-hidden ring-1 ring-primary/50">
                  <div className="h-1 w-full bg-gradient-to-r from-primary to-purple-600" />
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className="text-xl font-bold truncate flex items-center justify-between" title={mainGoal.title}>
                      <span>{mainGoal.title} <span className="ml-2 text-xs font-normal text-muted-foreground uppercase tracking-widest px-2 py-1 bg-primary/10 rounded-full text-primary">Meta Principal</span></span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <CalendarIcon size={14} className="mr-1" />
                          {format(mainGoal.targetDate!, "d 'de' MMMM, yyyy", { locale: ptBR })}
                        </div>
                      </div>
                      <div className="bg-background rounded-lg p-2 text-center min-w-[80px] border border-border relative group overflow-hidden">
                        <span className="block text-2xl font-bold font-display leading-none group-hover:hidden">{getDaysRemaining(mainGoal.targetDate!)}</span>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground group-hover:hidden">Dias</span>
                        <div className="hidden group-hover:flex flex-col items-center justify-center h-full text-xs text-primary font-bold uppercase">
                          Editar
                        </div>
                        <input 
                          type="date" 
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          onClick={(e) => { try { e.currentTarget.showPicker() } catch(err) {} }}
                          onChange={(e) => {
                            if(e.target.value) {
                               updateGoalDateMutation.mutate({ id: mainGoal.id, newDate: e.target.value });
                            }
                          }} 
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Specific Exams */}
            {specificExams.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3">Provas Cadastradas</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {specificExams.map((exam) => {
                    const daysLeft = getDaysRemaining(exam.targetDate!);
                    let parsed = { name: exam.title, subjectId: "none" };
                    try { parsed = JSON.parse(exam.title); } catch(e) {}
                    const subjectName = subjects.find(s => s.id === parsed.subjectId)?.name;

                    return (
                      <Card key={exam.id} className="bg-[#17122b] border-border shadow-sm overflow-hidden">
                        <CardHeader className="pb-2 pt-4">
                          <CardTitle className="text-lg font-bold truncate" title={parsed.name}>
                            {parsed.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex justify-between items-end">
                            <div className="space-y-1">
                              <div className="flex items-center text-sm text-muted-foreground">
                                <CalendarIcon size={14} className="mr-1" />
                                {format(exam.targetDate!, "d 'de' MMM, yyyy", { locale: ptBR })}
                              </div>
                              {subjectName && (
                                <div className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full inline-block mt-1">
                                  {subjectName}
                                </div>
                              )}
                            </div>
                            <div className="bg-background rounded-lg p-2 text-center min-w-[60px] border border-border relative group overflow-hidden">
                              <span className="block text-xl font-bold font-display leading-none text-primary group-hover:hidden">{daysLeft}</span>
                              <span className="text-[10px] uppercase font-bold text-muted-foreground group-hover:hidden">Dias</span>
                              <div className="hidden group-hover:flex flex-col items-center justify-center h-full text-[10px] text-primary font-bold uppercase">
                                Editar
                              </div>
                              <input 
                                type="date" 
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                onClick={(e) => { try { e.currentTarget.showPicker() } catch(err) {} }}
                                onChange={(e) => {
                                  if(e.target.value) {
                                     updateExamDateMutation.mutate({ id: exam.id, newDate: e.target.value });
                                  }
                                }} 
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>


      {/* AGENDA DA SEMANA */}
      <div className="space-y-4">
        <h2 className="text-xl font-display font-bold flex items-center gap-2">
          <Clock className="text-primary" size={20} /> Agenda da Semana
        </h2>

        {!weeklyPlan ? (
          <Card className="bg-surface-elevated border-border">
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CalendarDays size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-bold text-foreground">Sem plano ativo para esta semana.</p>
              <p className="text-sm">Gere um plano semanal para ver sua agenda aqui.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            {weekDays.map((day) => {
              const isToday = isSameDay(day, today);
              const dayItems = planItems.filter((item) => isSameDay(new Date(item.scheduled_for), day));
              
              const totalMinutes = dayItems.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
              const hours = Math.floor(totalMinutes / 60);
              const mins = totalMinutes % 60;

              return (
                <div 
                  key={day.toISOString()} 
                  className={`flex flex-col rounded-xl border overflow-hidden ${
                    isToday ? "border-primary/50 ring-1 ring-primary/20 bg-surface-elevated" : "border-border bg-surface/50"
                  }`}
                >
                  {/* Day Header */}
                  <div className={`p-3 text-center border-b ${isToday ? "bg-primary/10 border-primary/20 text-primary" : "bg-background/50 border-border text-muted-foreground"}`}>
                    <div className="text-xs uppercase font-bold tracking-wider">
                      {format(day, "EEEE", { locale: ptBR })}
                    </div>
                    <div className={`text-2xl font-display font-bold ${isToday ? "text-primary" : "text-foreground"}`}>
                      {format(day, "dd")}
                    </div>
                    <div className="text-[10px] mt-1 opacity-80">
                      {hours > 0 ? `${hours}h ` : ""}{mins > 0 ? `${mins}m` : (hours === 0 ? "Livre" : "")}
                    </div>
                  </div>

                  {/* Day Content */}
                  <div className="p-2 flex-1 flex flex-col gap-2 min-h-[150px]">
                    {dayItems.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground opacity-50">
                        Descanso
                      </div>
                    ) : (
                      dayItems.map((item) => {
                        let decodedTitle = { type: "teoria", topicName: item.title };
                        try { decodedTitle = JSON.parse(item.title); } catch(e) {}
                        const subject = subjects.find(s => s.id === item.subject_id);

                        return (
                          <div 
                            key={item.id} 
                            className={`p-2 rounded border text-xs flex flex-col gap-1 transition-colors ${
                              item.completed 
                                ? "bg-background/30 border-transparent opacity-60" 
                                : "bg-background border-border hover:border-primary/30"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <span className={`font-bold ${item.completed ? "line-through" : ""}`}>
                                {subject?.name || "Estudo"}
                              </span>
                              {item.completed && <CheckCircle2 size={12} className="text-primary flex-shrink-0" />}
                            </div>
                            <span className="text-muted-foreground line-clamp-2 leading-tight">
                              {decodedTitle.topicName}
                            </span>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[9px] font-bold uppercase text-primary">
                                {decodedTitle.type}
                              </span>
                              <span className="text-[9px] font-bold text-muted-foreground bg-surface px-1.5 py-0.5 rounded">
                                {item.duration_minutes}m
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
