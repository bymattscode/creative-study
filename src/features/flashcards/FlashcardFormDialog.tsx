import { useEffect, useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Flashcard,
  FlashcardInput,
  FlashcardSubjectOption,
  FlashcardTopicOption,
} from "./types";

interface FlashcardFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCard: Flashcard | null;
  subjects: FlashcardSubjectOption[];
  topics: FlashcardTopicOption[];
  onSave: (input: FlashcardInput, editingId?: string) => Promise<void>;
}

const CUSTOM_TOPIC_VALUE = "__custom__";

export function FlashcardFormDialog({
  open,
  onOpenChange,
  editingCard,
  subjects,
  topics,
  onSave,
}: FlashcardFormDialogProps) {
  const [materiaId, setMateriaId] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [customTopicName, setCustomTopicName] = useState("");
  const [frente, setFrente] = useState("");
  const [verso, setVerso] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const availableTopics = useMemo(
    () => topics.filter((t) => t.subject_id === materiaId),
    [topics, materiaId],
  );

  useEffect(() => {
    if (!open) return;

    if (editingCard) {
      setMateriaId(editingCard.materia_id);
      if (editingCard.conteudo_id) {
        setSelectedTopicId(editingCard.conteudo_id);
        setCustomTopicName(editingCard.conteudo_nome || "");
      } else if (editingCard.conteudo_nome) {
        setSelectedTopicId(CUSTOM_TOPIC_VALUE);
        setCustomTopicName(editingCard.conteudo_nome);
      } else {
        setSelectedTopicId("");
        setCustomTopicName("");
      }
      setFrente(editingCard.frente);
      setVerso(editingCard.verso);
    } else {
      const defaultSubId = subjects[0]?.id || "";
      setMateriaId(defaultSubId);
      const subTopics = topics.filter((t) => t.subject_id === defaultSubId);
      if (subTopics.length > 0) {
        setSelectedTopicId(subTopics[0].id);
        setCustomTopicName("");
      } else {
        setSelectedTopicId(CUSTOM_TOPIC_VALUE);
        setCustomTopicName("");
      }
      setFrente("");
      setVerso("");
    }
  }, [open, editingCard, subjects, topics]);

  const handleSubjectChange = (newSubId: string) => {
    setMateriaId(newSubId);
    const subTopics = topics.filter((t) => t.subject_id === newSubId);
    if (subTopics.length > 0) {
      setSelectedTopicId(subTopics[0].id);
      setCustomTopicName("");
    } else {
      setSelectedTopicId(CUSTOM_TOPIC_VALUE);
      setCustomTopicName("");
    }
  };

  const handleSubmit = async () => {
    if (!materiaId) {
      toast.error("Selecione uma matéria (cadastre em Matérias se ainda não houver).");
      return;
    }
    if (!frente.trim()) {
      toast.error("Preencha a frente (pergunta) do flashcard.");
      return;
    }
    if (!verso.trim()) {
      toast.error("Preencha o verso (resposta) do flashcard.");
      return;
    }

    const selectedSubject = subjects.find((s) => s.id === materiaId);
    const matchedTopic = availableTopics.find((t) => t.id === selectedTopicId);

    const conteudoId =
      selectedTopicId && selectedTopicId !== CUSTOM_TOPIC_VALUE ? selectedTopicId : null;
    const conteudoNome = matchedTopic ? matchedTopic.name : customTopicName.trim();

    try {
      setIsSaving(true);
      await onSave(
        {
          materia_id: materiaId,
          materia_nome: selectedSubject?.name || "Matéria",
          materia_cor: selectedSubject?.color || "#a8ff00",
          conteudo_id: conteudoId,
          conteudo_nome: conteudoNome,
          frente: frente.trim(),
          verso: verso.trim(),
        },
        editingCard?.id,
      );
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const activeSubject = subjects.find((s) => s.id === materiaId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-elevated border-border sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-bold text-foreground">
            {editingCard ? "Editar Flashcard" : "Novo Flashcard"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Vincule o flashcard a uma matéria e tópico para revisar com repetição espaçada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Seleção de Matéria */}
          <div className="space-y-2">
            <Label htmlFor="fc-subject">Matéria *</Label>
            <Select value={materiaId} onValueChange={handleSubjectChange}>
              <SelectTrigger id="fc-subject" className="bg-background border-border">
                <SelectValue placeholder="Selecione a matéria" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((sub) => (
                  <SelectItem key={sub.id} value={sub.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full inline-block"
                        style={{ backgroundColor: sub.color }}
                      />
                      {sub.name}
                    </span>
                  </SelectItem>
                ))}
                {subjects.length === 0 && (
                  <SelectItem value="none" disabled>
                    Cadastre matérias na Central de Matérias primeiro
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {activeSubject && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: activeSubject.color }}
                />
                <span>Cor herdada automaticamente de {activeSubject.name}</span>
              </div>
            )}
          </div>

          {/* Seleção de Conteúdo / Tópico */}
          <div className="space-y-2">
            <Label htmlFor="fc-topic">Conteúdo / Tópico</Label>
            {availableTopics.length > 0 ? (
              <Select value={selectedTopicId} onValueChange={setSelectedTopicId}>
                <SelectTrigger id="fc-topic" className="bg-background border-border">
                  <SelectValue placeholder="Selecione um tópico da matéria" />
                </SelectTrigger>
                <SelectContent>
                  {availableTopics.map((topic) => (
                    <SelectItem key={topic.id} value={topic.id}>
                      {topic.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_TOPIC_VALUE}>Outro tópico personalizado...</SelectItem>
                </SelectContent>
              </Select>
            ) : null}

            {(availableTopics.length === 0 || selectedTopicId === CUSTOM_TOPIC_VALUE) && (
              <Input
                placeholder="Ex: Limites e Continuidade, Derivadas Parciais..."
                value={customTopicName}
                onChange={(e) => setCustomTopicName(e.target.value)}
                className="bg-background border-border"
              />
            )}
          </div>

          {/* Frente (Pergunta) */}
          <div className="space-y-2">
            <Label htmlFor="fc-frente">Frente (Pergunta) *</Label>
            <textarea
              id="fc-frente"
              rows={3}
              placeholder="Digite a pergunta objetiva ou conceito que deseja testar..."
              value={frente}
              onChange={(e) => setFrente(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
            />
          </div>

          {/* Verso (Resposta) */}
          <div className="space-y-2">
            <Label htmlFor="fc-verso">Verso (Resposta) *</Label>
            <textarea
              id="fc-verso"
              rows={4}
              placeholder="Digite a resposta concisa e completa..."
              value={verso}
              onChange={(e) => setVerso(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving || subjects.length === 0}
            className="shadow-glow font-bold"
          >
            {editingCard ? "Salvar Alterações" : "Criar Flashcard"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

