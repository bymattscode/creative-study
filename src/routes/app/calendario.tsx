import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Goal, Subject } from "@/types/models";
import { CalendarDays, MapPin, Target, Clock, Calendar as CalendarIcon, CheckCircle2, Pencil } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { EditGoalDialog } from "@/components/features/EditGoalDialog";
import { EditExamDialog } from "@/components/features/EditExamDialog";
import { AddExamDialog } from "@/components/features/AddExamDialog";
import { MonthlyAgenda } from "@/components/features/MonthlyAgenda";

export const Route = createFileRoute("/app/calendario")({
  component: CalendarioRoute,
});

function CalendarioRoute() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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
      
      // Helper para parsear datas
      const parseSafeDate = (dStr: string) => {
        if (!dStr) return new Date(NaN);
        return new Date(dStr.includes("T") ? dStr : dStr + "T12:00:00Z");
      };

      // Filtrar apenas as que têm data válida
      return (data as any[])
        .filter(g => {
          if (!g.target_date) return false;
          const d = parseSafeDate(g.target_date);
          return !isNaN(d.getTime());
        })
        .map(g => ({
        id: g.id,
        title: g.title,
        targetDate: parseSafeDate(g.target_date),
        isActive: g.is_active,
        createdAt: new Date(g.created_at)
      })) as (Goal & { createdAt: Date })[];
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


  const { data: userProfile } = useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user?.id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user?.id,
  });

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

  const mainGoal = upcomingExams.filter(e => e.isActive).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  const specificExams = upcomingExams.filter(e => !e.isActive);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto pb-12">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground font-medium flex items-center gap-2 uppercase tracking-widest text-xs mb-1">
            <CalendarDays size={14} className="text-primary" /> Planejamento de Longo Prazo
          </p>
          <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground">
            Seu <span className="text-primary">Calendário</span>
          </h1>
        </div>
        <AddExamDialog trigger={
          <button className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
            <Target size={18} /> Adicionar Prova
          </button>
        }/>
      </div>

      {/* PRÓXIMAS PROVAS */}
      <div className="space-y-4">
        <h2 className="text-xl font-display font-bold flex items-center gap-2">
          <Target className="text-primary" size={20} /> 
          {userProfile?.student_type?.toLowerCase() === "universidade" ? "Final do Semestre & Próximas Provas" : "Próximas Provas & Eventos"}
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
                <Card className="bg-[#21193a] border-primary/50 shadow-sm overflow-hidden ring-1 ring-primary/50 group">
                  <div className="h-1 w-full bg-gradient-to-r from-primary to-purple-600" />
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className="text-xl font-bold truncate flex items-center justify-between" title={mainGoal.title}>
                      <span>{mainGoal.title} <span className="ml-2 text-xs font-normal text-muted-foreground uppercase tracking-widest px-2 py-1 bg-primary/10 rounded-full text-primary">
                        {userProfile?.student_type === "Universidade" ? "Final do Semestre" : "Meta Principal"}
                      </span></span>
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
                      <div className="bg-background rounded-lg py-2 px-3 text-center min-w-[80px] border border-border relative flex items-center justify-center">
                        <div className="flex flex-col items-center justify-center w-full">
                          <span className="font-bold text-lg leading-none text-primary">{getDaysRemaining(mainGoal.targetDate!)}</span>
                          <span className="text-[10px] uppercase text-primary mt-1 font-bold">Dias</span>
                        </div>
                        <EditGoalDialog 
                          goal={mainGoal}
                          triggerClassName="absolute right-1.5 text-muted-foreground hover:text-primary transition-opacity opacity-100 md:opacity-0 md:group-hover:opacity-100"
                          iconSize={12}
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
                    let parsed = { name: exam.title, subjectId: "none" };
                    try { parsed = JSON.parse(exam.title); } catch(e) {}
                    const subjectName = subjects.find(s => s.id === parsed.subjectId)?.name;

                    return (
                      <Card key={exam.id} className="bg-[#17122b] border-border shadow-sm overflow-hidden group">
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
                            <div className="bg-background rounded-lg py-2 px-3 text-center min-w-[65px] border border-border relative flex items-center justify-center">
                              <div className="flex flex-col items-center justify-center w-full">
                                <span className="font-bold text-lg leading-none text-primary">{getDaysRemaining(exam.targetDate!)}</span>
                                <span className="text-[10px] uppercase text-primary mt-1 font-bold">Dias</span>
                              </div>
                              <EditExamDialog 
                                exam={exam}
                                triggerClassName="absolute right-1 text-primary/70 hover:text-primary transition-opacity opacity-100 md:opacity-0 md:group-hover:opacity-100"
                                iconSize={10}
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


      {/* AGENDA DO MÊS */}
      <div className="space-y-4">
        <h2 className="text-xl font-display font-bold flex items-center gap-2">
          <CalendarIcon className="text-primary" size={20} /> Agenda do Mês
        </h2>
        
        <MonthlyAgenda exams={upcomingExams} subjects={subjects} />
      </div>
    </div>
  );
}
