import { supabase } from "@/lib/supabase";

export interface GenerateFlashcardsParams {
  materiaNome: string;
  conteudo: string;
  quantidade: 3 | 5 | 10;
}

export interface ExplainFlashcardParams {
  materiaNome: string;
  frente: string;
  verso: string;
}

const CLIENT_TIMEOUT_MS = 28000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new Error(
          "A solicitação para a IA demorou mais do que o esperado. Verifique sua conexão e tente novamente.",
        ),
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function extractFunctionErrorMessage(error: unknown, fallback: string): Promise<string> {
  try {
    const errObj = error as { message?: string; context?: Response };
    if (errObj?.context && typeof errObj.context.json === "function") {
      const body = await errObj.context.json();
      if (body?.error) return String(body.error);
    }
    if (errObj?.message) return errObj.message;
  } catch {
    // ignore
  }
  return fallback;
}

/**
 * Valida e sanitiza a lista de cartas [{ frente, verso }] retornada pela Edge Function.
 */
export function normalizeGeneratedCardsList(
  rawCards: unknown,
): Array<{ frente: string; verso: string }> {
  if (!Array.isArray(rawCards)) return [];

  return rawCards
    .map((item: unknown) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const frente = typeof record.frente === "string" ? record.frente.trim() : "";
      const verso = typeof record.verso === "string" ? record.verso.trim() : "";
      if (!frente || !verso) return null;
      return { frente, verso };
    })
    .filter((c): c is { frente: string; verso: string } => c !== null);
}

/**
 * Solicita a geração de flashcards à Edge Function `flashcards-ai` (proxy Gemini API).
 * Nenhuma chave de API fica no front-end.
 */
export async function generateFlashcardsWithAI(
  params: GenerateFlashcardsParams,
): Promise<Array<{ frente: string; verso: string }>> {
  const { data, error } = await withTimeout(
    supabase.functions.invoke("flashcards-ai", {
      body: {
        action: "generate",
        materiaNome: params.materiaNome,
        conteudo: params.conteudo,
        quantidade: params.quantidade,
      },
    }),
    CLIENT_TIMEOUT_MS,
  );

  if (error) {
    const detailedMsg = await extractFunctionErrorMessage(
      error,
      "Não foi possível conectar à função de IA no Supabase.",
    );
    throw new Error(detailedMsg);
  }

  if (data?.error) {
    throw new Error(String(data.error));
  }

  return normalizeGeneratedCardsList(data?.cards);
}

/**
 * Solicita uma explicação didática curta (2–4 frases) à Edge Function `flashcards-ai` (proxy Gemini API).
 */
export async function explainFlashcardWithAI(params: ExplainFlashcardParams): Promise<string> {
  const { data, error } = await withTimeout(
    supabase.functions.invoke("flashcards-ai", {
      body: {
        action: "explain",
        materiaNome: params.materiaNome,
        frente: params.frente,
        verso: params.verso,
      },
    }),
    CLIENT_TIMEOUT_MS,
  );

  if (error) {
    const detailedMsg = await extractFunctionErrorMessage(
      error,
      "Não foi possível obter a explicação da IA. Tente novamente em instantes.",
    );
    throw new Error(detailedMsg);
  }

  if (data?.error) {
    throw new Error(String(data.error));
  }

  const explanation = typeof data?.explanation === "string" ? data.explanation.trim() : "";
  return explanation;
}
