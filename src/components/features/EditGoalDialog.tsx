import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface EditGoalDialogProps {
  goal: any;
  triggerClassName?: string;
  iconSize?: number;
}

export function EditGoalDialog({ goal, triggerClassName = "text-muted-foreground hover:text-primary", iconSize = 16 }: EditGoalDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState(goal.title || "");
  
  const rawDate = (goal as any).target_date || goal.targetDate;
  const initialDate = rawDate instanceof Date 
    ? rawDate.toISOString().split('T')[0] 
    : (rawDate ? new Date(rawDate + "T12:00:00Z").toISOString().split('T')[0] : '');

  const [targetDate, setTargetDate] = useState(initialDate);

  const updateGoalMutation = useMutation({
    mutationFn: async ({ id, title, targetDate }: { id: string; title: string; targetDate: string }) => {
      const { error } = await supabase.from("goals").update({ title, target_date: targetDate }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goal"] });
      queryClient.invalidateQueries({ queryKey: ["currentGoal"] });
      queryClient.invalidateQueries({ queryKey: ["upcomingExams"] });
      toast.success("Meta atualizada!");
      setOpen(false);
    }
  });

  const handleSave = () => {
    if (!title || !targetDate) {
      toast.error("Preencha todos os campos.");
      return;
    }
    updateGoalMutation.mutate({
      id: goal.id,
      title,
      targetDate
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className={triggerClassName}>
          <Pencil size={iconSize} />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Meta Principal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome da Meta (Semestre / Foco)</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: 4º Semestre, Passar em Medicina..." />
          </div>
          <div className="space-y-2">
            <Label>Data Final</Label>
            <Input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
          </div>
          <Button className="w-full text-zinc-900" onClick={handleSave} disabled={updateGoalMutation.isPending}>
            {updateGoalMutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
