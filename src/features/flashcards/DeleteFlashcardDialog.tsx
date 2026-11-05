import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Flashcard } from "./types";

interface DeleteFlashcardDialogProps {
  card: Flashcard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDelete: (card: Flashcard) => Promise<void>;
}

export function DeleteFlashcardDialog({
  card,
  open,
  onOpenChange,
  onConfirmDelete,
}: DeleteFlashcardDialogProps) {
  if (!card) return null;

  const handleConfirm = async () => {
    await onConfirmDelete(card);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-elevated border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground font-display">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Excluir flashcard?
          </DialogTitle>
          <DialogDescription className="text-muted-foreground pt-1">
            Tem certeza que deseja excluir este flashcard de{" "}
            <strong className="text-foreground">{card.materia_nome}</strong>? Essa ação não pode
            ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <div
          className="rounded-lg border border-border bg-background/60 p-3 space-y-1.5 text-xs"
          style={{ borderLeftWidth: "4px", borderLeftColor: card.materia_cor }}
        >
          <p className="font-semibold text-foreground line-clamp-2">{card.frente}</p>
          <p className="text-muted-foreground line-clamp-2">{card.verso}</p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir Flashcard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

