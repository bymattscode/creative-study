import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, CheckCircle2, RefreshCw, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { generateFlashcardsWithAI } from "./ai-client";
import {
  FlashcardInput,
  FlashcardSubjectOption,
  FlashcardTopicOption,
  GeneratedFlashcardDraft,
} from "./types";

interface GenerateFlashcardsAIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjects: FlashcardSubjectOption[];
  topics: FlashcardTopicOption[];
  onSaveGeneratedCards: (inputs: FlashcardInput[]) => Promise<void>;
}

const MANUAL_CONTENT_VALUE = "__manual__";

function makeTempId(idx: number): string {
  return `ai_draft_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 7)}`;
}

export function GenerateFlashcardsAIDialog({
  open,
  onOpenChange,
  subjects,
  topics,
  onSaveGeneratedCards,
}: GenerateFlashcardsAIDialogProps) {
  const [materiaId, setMateriaId] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState<string>(MANUAL_CONTENT_VALUE);
  const [manualContent, setManualContent] = useState("");
  const [contentValidationError, setContentValidationError] = useState(false);
  const [quantidade, setQuantidade] = useState<3 | 5 | 10>(5);

  const [aiState, setAiState] = useState<"idle" | "loading" | "preview" | "empty" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [draftCards, setDraftCards] = useState<GeneratedFlashcardDraft[]>([]);
  const [pendingDiscardIds, setPendingDiscardIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const discardTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const clearAllDiscardTimers = () => {
    Object.values(discardTimersRef.current).forEach((timerId) => clearTimeout(timerId));
    discardTimersRef.current = {};
  };

  useEffect(() => {
    return () => {
      clearAllDiscardTimers();
    };
  }, []);

  const availableTopics = useMemo(
    () => topics.filter((t) => t.subject_id === materiaId),
    [topics, materiaId],
  );

  // Inicializa o formulário ao abrir o modal
  useEffect(() => {
    if (!open) {
      clearAllDiscardTimers();
      return;
    }
    const defaultSubId = subjects[0]?.id || "";
    setMateriaId(defaultSubId);
    const subTopics = topics.filter((t) => t.subject_id === defaultSubId);
    if (subTopics.length > 0) {
      setSelectedTopicId(subTopics[0].id);
    } else {
      setSelectedTopicId(MANUAL_CONTENT_VALUE);
    }
    setManualContent("");
    setContentValidationError(false);
    setQuantidade(5);
    setAiState("idle");
    setErrorMessage("");
    setDraftCards([]);
    setPendingDiscardIds([]);
    clearAllDiscardTimers();
  }, [open]);

  // Caso as matérias/tópicos terminem de carregar com o modal aberto, sincroniza a seleção inicial sem apagar o texto digitado
  useEffect(() => {
    if (!open) return;
    if (!materiaId && subjects.length > 0) {
      const firstSubId = subjects[0].id;
      setMateriaId(firstSubId);
      const subTopics = topics.filter((t) => t.subject_id === firstSubId);
      if (subTopics.length > 0) {
        setSelectedTopicId(subTopics[0].id);
      }
      return;
    }
    if (
      materiaId &&
      selectedTopicId === MANUAL_CONTENT_VALUE &&
      availableTopics.length > 0
    ) {
      setSelectedTopicId(availableTopics[0].id);
    }
  }, [open, subjects, topics, materiaId, availableTopics]);

  const handleSubjectChange = (newSubId: string) => {
    setMateriaId(newSubId);
    const subTopics = topics.filter((t) => t.subject_id === newSubId);
    if (subTopics.length > 0) {
      setSelectedTopicId(subTopics[0].id);
    } else {
      setSelectedTopicId(MANUAL_CONTENT_VALUE);
    }
  };

  const isContentEmpty = !manualContent.trim();

  const handleGenerate = async () => {
    if (!materiaId) {
      toast.error("Selecione uma matéria primeiro.");
      return;
    }

    if (!manualContent.trim()) {
      setContentValidationError(true);
      return;
    }

    setContentValidationError(false);
    const selectedSubject = subjects.find((s) => s.id === materiaId);
    const selectedTopic = availableTopics.find((t) => t.id === selectedTopicId);

    const combinedContent = [
      selectedTopic ? `Tópico do edital/ementa: ${selectedTopic.name}` : "",
      `Conteúdo/Resumo complementar:\n${manualContent.trim()}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    setAiState("loading");
    setErrorMessage("");
    clearAllDiscardTimers();
    setPendingDiscardIds([]);

    try {
      const generated = await generateFlashcardsWithAI({
        materiaNome: selectedSubject?.name || "Matéria Universitária",
        conteudo: combinedContent,
        quantidade,
      });

      if (!generated || generated.length === 0) {
        setDraftCards([]);
        setAiState("empty");
        return;
      }

      setDraftCards(
        generated.map((c, idx) => ({
          tempId: makeTempId(idx),
          frente: c.frente,
          verso: c.verso,
        })),
      );
      setAiState("preview");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Ocorreu um erro ao consultar a Gemini API. Tente novamente.";
      setErrorMessage(msg);
      setAiState("error");
    }
  };

  const handleDraftChange = (tempId: string, field: "frente" | "verso", value: string) => {
    setDraftCards((prev) =>
      prev.map((card) => (card.tempId === tempId ? { ...card, [field]: value } : card)),
    );
  };

  const handleDiscardDraft = (tempId: string) => {
    if (discardTimersRef.current[tempId]) {
      clearTimeout(discardTimersRef.current[tempId]);
    }
    setPendingDiscardIds((prev) => (prev.includes(tempId) ? prev : [...prev, tempId]));

    discardTimersRef.current[tempId] = setTimeout(() => {
      delete discardTimersRef.current[tempId];
      setPendingDiscardIds((prev) => prev.filter((id) => id !== tempId));
      setDraftCards((prev) => {
        const next = prev.filter((c) => c.tempId !== tempId);
        if (next.length === 0) {
          setAiState("empty");
        }
        return next;
      });
    }, 5000);
  };

  const handleUndoDiscardDraft = (tempId: string) => {
    if (discardTimersRef.current[tempId]) {
      clearTimeout(discardTimersRef.current[tempId]);
      delete discardTimersRef.current[tempId];
    }
    setPendingDiscardIds((prev) => prev.filter((id) => id !== tempId));
  };

  const activeDraftCards = useMemo(
    () => draftCards.filter((c) => !pendingDiscardIds.includes(c.tempId)),
    [draftCards, pendingDiscardIds],
  );

  const handleSaveApprovedCards = async () => {
    const validDrafts = activeDraftCards.filter((d) => d.frente.trim() && d.verso.trim());
    if (validDrafts.length === 0) {
      toast.error("Nenhum flashcard válido para salvar.");
      return;
    }

    const selectedSubject = subjects.find((s) => s.id === materiaId);
    const selectedTopic = availableTopics.find((t) => t.id === selectedTopicId);

    const inputs: FlashcardInput[] = validDrafts.map((d) => ({
      materia_id: materiaId,
      materia_nome: selectedSubject?.name || "Matéria",
      materia_cor: selectedSubject?.color || "#a8ff00",
      conteudo_id: selectedTopic ? selectedTopic.id : null,
      conteudo_nome: selectedTopic
        ? selectedTopic.name
        : manualContent.trim().slice(0, 48) || "Gerado com IA",
      frente: d.frente.trim(),
      verso: d.verso.trim(),
    }));

    try {
      setIsSaving(true);
      await onSaveGeneratedCards(inputs);
      toast.success(`${inputs.length} flashcard(s) salvos com sucesso!`);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-elevated border-border sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerar Flashcards com IA
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Escolha a matéria, selecione um tópico ou cole seu resumo e revise os flashcards antes
            de salvar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Configuração da geração */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ai-fc-subject">Matéria *</Label>
              <Select
                value={materiaId}
                onValueChange={handleSubjectChange}
                disabled={aiState === "loading"}
              >
                <SelectTrigger id="ai-fc-subject" className="bg-background border-border">
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
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantidade de Flashcards</Label>
              <div className="grid grid-cols-3 gap-2">
                {([3, 5, 10] as const).map((qty) => (
                  <button
                    key={qty}
                    type="button"
                    disabled={aiState === "loading"}
                    onClick={() => setQuantidade(qty)}
                    className={`h-9 rounded-md border text-xs font-bold transition-colors cursor-pointer ${
                      quantidade === qty
                        ? "bg-primary text-primary-foreground border-primary shadow-glow"
                        : "bg-background border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {qty} flashcards
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tópico existente da Central de Matérias (seleção opcional, sempre visível acima da textarea) */}
          <div className="space-y-2">
            <Label htmlFor="ai-fc-topic">Conteúdo / Tópico da Matéria (opcional)</Label>
            <Select
              value={selectedTopicId || MANUAL_CONTENT_VALUE}
              onValueChange={setSelectedTopicId}
              disabled={aiState === "loading"}
            >
              <SelectTrigger id="ai-fc-topic" className="bg-background border-border">
                <SelectValue placeholder="Selecione um tópico da matéria (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {availableTopics.map((topic) => (
                  <SelectItem key={topic.id} value={topic.id}>
                    {topic.name}
                  </SelectItem>
                ))}
                <SelectItem value={MANUAL_CONTENT_VALUE}>
                  {availableTopics.length > 0
                    ? "Sem tópico vinculado (apenas texto colado abaixo)"
                    : "Nenhum tópico cadastrado nesta matéria (usar texto colado abaixo)"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Texto/ementa/resumo manual com validação inline */}
          <div className="space-y-1.5">
            <Label htmlFor="ai-fc-manual">
              Conteúdo, ementa ou resumo para gerar os flashcards *
            </Label>
            <textarea
              id="ai-fc-manual"
              rows={3}
              disabled={aiState === "loading"}
              placeholder="Cole aqui trechos da aula, resumo, conceitos-chave ou tópicos da prova..."
              value={manualContent}
              onChange={(e) => {
                setManualContent(e.target.value);
                if (e.target.value.trim()) {
                  setContentValidationError(false);
                }
              }}
              aria-invalid={contentValidationError}
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 resize-y transition-colors ${
                contentValidationError
                  ? "border-red-500/60 focus:border-red-500/80 focus:ring-red-500/30"
                  : "border-border focus:ring-primary"
              }`}
            />
            {contentValidationError && (
              <p className="text-xs text-red-400 font-medium flex items-center gap-1.5 pt-0.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Cole um conteúdo ou resumo para a IA gerar os flashcards
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={aiState === "loading" || subjects.length === 0}
              aria-disabled={isContentEmpty || aiState === "loading" || subjects.length === 0}
              className={`font-bold transition-all ${
                isContentEmpty
                  ? "opacity-50 cursor-not-allowed shadow-none hover:bg-primary"
                  : "shadow-glow cursor-pointer"
              }`}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {aiState === "preview"
                ? "Regerar com IA"
                : `Gerar ${quantidade} Flashcards com IA`}
            </Button>
          </div>

          {/* ESTADO 1: CARREGANDO (Skeleton / Spinner) */}
          {aiState === "loading" && (
            <div className="rounded-xl border border-primary/30 bg-[#16132b] p-5 space-y-4">
              <div className="flex items-center gap-2.5 text-sm font-bold text-primary">
                <Sparkles className="h-4 w-4 animate-spin" />
                <span>Gerando flashcards...</span>
              </div>
              <div className="space-y-3 animate-pulse">
                {Array.from({ length: Math.min(quantidade, 3) }).map((_, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-border bg-background/60 p-4 space-y-2"
                  >
                    <div className="h-3.5 w-2/3 rounded bg-surface-elevated" />
                    <div className="h-3 w-full rounded bg-surface-elevated" />
                    <div className="h-3 w-4/5 rounded bg-surface-elevated" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ESTADO 2: ERRO (Mensagem amigável + botão Tentar novamente) */}
          {aiState === "error" && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-red-300">
                    Não foi possível gerar os flashcards
                  </p>
                  <p className="text-xs text-red-200/90">{errorMessage}</p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerate}
                  className="border-red-400/40 text-red-300 hover:bg-red-500/20"
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Tentar novamente
                </Button>
              </div>
            </div>
          )}

          {/* ESTADO 3: VAZIO */}
          {aiState === "empty" && (
            <div className="rounded-xl border border-border bg-background/60 p-6 text-center space-y-3">
              <p className="text-sm font-semibold text-foreground">
                Nenhum flashcard gerado. Ajuste o conteúdo e tente de novo.
              </p>
              <Button type="button" variant="outline" size="sm" onClick={handleGenerate}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Tentar novamente
              </Button>
            </div>
          )}

          {/* PRÉ-VISUALIZAÇÃO EDITÁVEL ANTES DE SALVAR */}
          {aiState === "preview" && draftCards.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  Pré-visualização Editável ({activeDraftCards.length}{" "}
                  {activeDraftCards.length === 1 ? "flashcard" : "flashcards"})
                </span>
                <span className="text-xs text-muted-foreground">
                  Edite ou descarte qualquer flashcard antes de salvar
                </span>
              </div>

              <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                {draftCards.map((draft, index) => {
                  const isPendingDiscard = pendingDiscardIds.includes(draft.tempId);
                  return (
                    <div
                      key={draft.tempId}
                      className={`rounded-xl border p-3.5 space-y-2.5 transition-all duration-200 ${
                        isPendingDiscard
                          ? "border-dashed border-border/60 bg-background/30"
                          : "border-border bg-background/70"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold ${
                            isPendingDiscard
                              ? "text-muted-foreground/40 line-through"
                              : "text-muted-foreground"
                          }`}
                        >
                          Flashcard #{index + 1}
                        </span>
                        {isPendingDiscard ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleUndoDiscardDraft(draft.tempId)}
                            className="h-7 px-2.5 text-xs font-semibold text-primary border-primary/40 hover:bg-primary/15"
                          >
                            <RotateCcw size={12} className="mr-1" />
                            Desfazer
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDiscardDraft(draft.tempId)}
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 size={13} className="mr-1" />
                            Descartar
                          </Button>
                        )}
                      </div>

                      <div
                        className={`space-y-2.5 transition-opacity duration-200 ${
                          isPendingDiscard ? "opacity-35 pointer-events-none select-none" : ""
                        }`}
                      >
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">
                            Frente (Pergunta)
                          </Label>
                          <textarea
                            rows={2}
                            disabled={isPendingDiscard}
                            value={draft.frente}
                            onChange={(e) =>
                              handleDraftChange(draft.tempId, "frente", e.target.value)
                            }
                            className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">
                            Verso (Resposta)
                          </Label>
                          <textarea
                            rows={2}
                            disabled={isPendingDiscard}
                            value={draft.verso}
                            onChange={(e) =>
                              handleDraftChange(draft.tempId, "verso", e.target.value)
                            }
                            className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          {aiState === "preview" && draftCards.length > 0 && (
            <Button
              type="button"
              onClick={handleSaveApprovedCards}
              disabled={isSaving || activeDraftCards.length === 0}
              className="shadow-glow font-bold"
            >
              Salvar {activeDraftCards.length}{" "}
              {activeDraftCards.length === 1 ? "Flashcard" : "Flashcards"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

