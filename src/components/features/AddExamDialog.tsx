import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Subject } from "@/types/models";
import { useAuth } from "@/contexts/auth";

interface AddExamDialogProps {
  initialDate?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddExamDialog({ initialDate = "", trigger, open: controlledOpen, onOpenChange }: AddExamDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const { user } = useAuth();
  
  const isOpen = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setIsOpen = onOpenChange !== undefined ? onOpenChange : setUncontrolledOpen;

  const queryClient = useQueryClient();
  
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("subjects").select("*").eq("user_id", user?.id);
      return data as Subject[];
    },
    enabled: !!user?.id,
  });

  const [name, setName] = useState("");
  const [subjectId, setSubjectId] = useState("none");
  const [targetDate, setTargetDate] = useState(initialDate);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setSubjectId("none");
      setTargetDate(initialDate);
    }
  }, [isOpen, initialDate]);

  const addExamMutation = useMutation({
    mutationFn: async ({ title, targetDate }: { title: string; targetDate: string }) => {
      const { error } = await supabase.from("goals").insert({ 
        user_id: user?.id,
        title, 
        target_date: targetDate,
        is_active: false // Provas são is_active = false
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      queryClient.invalidateQueries({ queryKey: ["upcomingExams"] });
      queryClient.invalidateQueries({ queryKey: ["nextExam"] });
      toast.success("Prova/Evento criado com sucesso!");
      setIsOpen(false);
    }
  });

  const handleSave = () => {
    if (!name.trim() || !targetDate) {
      toast.error("Preencha o nome e a data.");
      return;
    }
    addExamMutation.mutate({
      title: JSON.stringify({ name, subjectId }),
      targetDate
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Prova / Evento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome da Prova / Evento</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Prova de Matemática..." />
          </div>
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Matéria Relacionada (Opcional)</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
               <SelectTrigger><SelectValue placeholder="Selecione..."/></SelectTrigger>
               <SelectContent>
                 <SelectItem value="none">Geral / Não se aplica</SelectItem>
                 {subjects.map(s => (
                   <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                 ))}
               </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} className="w-full" disabled={addExamMutation.isPending}>
            {addExamMutation.isPending ? "Salvando..." : "Salvar Prova/Evento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
