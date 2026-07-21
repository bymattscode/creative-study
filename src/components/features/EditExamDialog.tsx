import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2 } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Subject } from "@/types/models";

interface EditExamDialogProps {
  exam: any;
  triggerClassName?: string;
  iconSize?: number;
}

export function EditExamDialog({ exam, triggerClassName = "text-muted-foreground hover:text-primary", iconSize = 16 }: EditExamDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data } = await supabase.from("subjects").select("*");
      return data as Subject[];
    }
  });

  let parsed = { name: exam.title, subjectId: "none" };
  try { parsed = JSON.parse(exam.title); } catch(e) {}
  
  const [name, setName] = useState(parsed.name);
  const [subjectId, setSubjectId] = useState(parsed.subjectId);
  
  // Some places pass targetDate as string (configuracoes), others as Date (calendario)
  const rawDate = (exam as any).target_date || exam.targetDate;
  const initialDate = rawDate instanceof Date 
    ? rawDate.toISOString().split('T')[0] 
    : (rawDate ? new Date(rawDate + "T12:00:00Z").toISOString().split('T')[0] : '');

  const [targetDate, setTargetDate] = useState(initialDate);

  useEffect(() => {
    let parsed = { name: exam.title, subjectId: "none" };
    try { parsed = JSON.parse(exam.title); } catch(e) {}
    setName(parsed.name);
    setSubjectId(parsed.subjectId);
    setTargetDate(initialDate);
  }, [exam.title, initialDate]);

  const updateExamMutation = useMutation({
    mutationFn: async ({ id, title, targetDate }: { id: string; title: string; targetDate: string }) => {
      const { error } = await supabase.from("goals").update({ title, target_date: targetDate }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      queryClient.invalidateQueries({ queryKey: ["upcomingExams"] });
      queryClient.invalidateQueries({ queryKey: ["nextExam"] });
      toast.success("Prova atualizada!");
      setOpen(false);
    }
  });

  const deleteExamMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      queryClient.invalidateQueries({ queryKey: ["upcomingExams"] });
      queryClient.invalidateQueries({ queryKey: ["nextExam"] });
      toast.success("Prova excluída com sucesso!");
      setOpen(false);
    }
  });

  const handleSave = () => {
    updateExamMutation.mutate({
      id: exam.id,
      title: JSON.stringify({ name, subjectId }),
      targetDate
    });
  };

  const handleDelete = () => {
    if (window.confirm("Tem certeza que deseja excluir esta prova? Esta ação não pode ser desfeita.")) {
      deleteExamMutation.mutate(exam.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className={triggerClassName} onClick={(e) => e.stopPropagation()}>
          <Pencil size={iconSize} />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Prova</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome da Prova / Concurso</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: ENEM, Concurso BB..." />
          </div>
          <div className="space-y-2">
            <Label>Data da Prova</Label>
            <Input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Matéria Relacionada</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
               <SelectTrigger><SelectValue placeholder="Selecione..."/></SelectTrigger>
               <SelectContent>
                 <SelectItem value="none">Geral / Não se aplica</SelectItem>
                 {subjects.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
               </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button 
              variant="destructive" 
              className="px-3" 
              onClick={handleDelete} 
              disabled={deleteExamMutation.isPending || updateExamMutation.isPending}
              title="Excluir Prova"
            >
              {deleteExamMutation.isPending ? "..." : <Trash2 size={18} />}
            </Button>
            <Button 
              className="flex-1 text-zinc-900" 
              onClick={handleSave} 
              disabled={updateExamMutation.isPending || deleteExamMutation.isPending}
            >
              {updateExamMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
