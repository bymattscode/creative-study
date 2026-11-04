// Supabase Edge Function: flashcards-ai
// Proxy seguro para a Google Gemini API externa.
// A chave GEMINI_API_KEY é lida exclusivamente dos Secrets do Supabase (Deno.env).

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];
const REQUEST_TIMEOUT_MS = 25000;

interface GenerateRequestPayload {
  action: "generate";
  materiaNome: string;
  conteudo: string;
  quantidade: 3 | 5 | 10;
}

interface ExplainRequestPayload {
  action: "explain";
  materiaNome: string;
  frente: string;
  verso: string;
}

type FlashcardsAIRequest = GenerateRequestPayload | ExplainRequestPayload;

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

/**
 * Extrai e valida o array JSON [{ frente, verso }] da resposta textual do Gemini.
 */
function parseAndValidateFlashcardsJson(
  rawText: string,
): Array<{ frente: string; verso: string }> {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // Tenta localizar o array JSON mesmo se houver texto ao redor
  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");
  const jsonCandidate =
    firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket
      ? cleaned.slice(firstBracket, lastBracket + 1)
      : cleaned;

  const parsed = JSON.parse(jsonCandidate);
  if (!Array.isArray(parsed)) {
    throw new Error("A resposta da IA não retornou uma lista JSON válida.");
  }

  const validCards = parsed
    .map((item: unknown) => {
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;
      const frente = typeof obj.frente === "string" ? obj.frente.trim() : "";
      const verso = typeof obj.verso === "string" ? obj.verso.trim() : "";
      if (!frente || !verso) return null;
      return { frente, verso };
    })
    .filter((item): item is { frente: string; verso: string } => item !== null);

  return validCards;
}

async function callGeminiAPI(
  apiKey: string,
  systemInstruction: string,
  userPrompt: string,
  expectJson: boolean,
): Promise<string> {
  let lastError: Error | null = null;

  for (const model of GEMINI_MODELS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
        apiKey,
      )}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            ...(expectJson ? { responseMimeType: "application/json" } : {}),
          },
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        lastError = new Error(`Gemini HTTP ${response.status} (${model}): ${errText}`);
        continue;
      }

      const data = await response.json();
      const text =
        data?.candidates?.[0]?.content?.parts
          ?.map((p: { text?: string }) => p.text || "")
          .join("")
          .trim() || "";

      if (!text) {
        lastError = new Error("A IA retornou uma resposta em branco.");
        continue;
      }

      return text;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("Tempo limite excedido ao consultar a Gemini API. Tente novamente.");
      }
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error("Não foi possível obter resposta da Gemini API.");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido. Use POST." }, 405);
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return jsonResponse(
      {
        error:
          "O secret GEMINI_API_KEY ainda não foi configurado no Supabase (Edge Functions → Secrets).",
        code: "MISSING_API_KEY",
      },
      500,
    );
  }

  let body: FlashcardsAIRequest;
  try {
    body = (await req.json()) as FlashcardsAIRequest;
  } catch {
    return jsonResponse({ error: "Corpo da requisição JSON inválido." }, 400);
  }

  try {
    if (body.action === "generate") {
      const quantidade = [3, 5, 10].includes(Number(body.quantidade))
        ? Number(body.quantidade)
        : 5;
      const materiaNome = (body.materiaNome || "Matéria Universitária").trim();
      const conteudo = (body.conteudo || "").trim();

      if (!conteudo) {
        return jsonResponse(
          { error: "Informe o conteúdo, tópico ou resumo para gerar as cartas." },
          400,
        );
      }

      const systemPrompt = `Você é um assistente de estudos para universitários. Gere ${quantidade} flashcards em português, nível universitário, sobre o conteúdo fornecido, no formato JSON: [{frente: pergunta clara e objetiva, verso: resposta concisa e completa}]. Varie entre perguntas conceituais e de aplicação. Retorne SOMENTE o JSON.`;

      const userPrompt = `Matéria: ${materiaNome}\nConteúdo/Tópico:\n${conteudo}\n\nGere exatamente ${quantidade} flashcards no formato JSON solicitado: [{"frente": "...", "verso": "..."}].`;

      const rawText = await callGeminiAPI(apiKey, systemPrompt, userPrompt, true);

      let cards: Array<{ frente: string; verso: string }> = [];
      try {
        cards = parseAndValidateFlashcardsJson(rawText);
      } catch {
        return jsonResponse(
          {
            error:
              "A IA retornou um formato inesperado. Tente ajustar o conteúdo e gerar novamente.",
            code: "INVALID_AI_JSON",
          },
          502,
        );
      }

      return jsonResponse({ cards });
    }

    if (body.action === "explain") {
      const materiaNome = (body.materiaNome || "Matéria Universitária").trim();
      const frente = (body.frente || "").trim();
      const verso = (body.verso || "").trim();

      if (!frente || !verso) {
        return jsonResponse(
          { error: "Frente e verso da carta são obrigatórios para gerar a explicação." },
          400,
        );
      }

      const systemPrompt =
        "Você é um professor universitário didático. Explique o conceito da carta de estudo em português de forma clara e curta (entre 2 e 4 frases), incluindo um exemplo prático rápido quando fizer sentido. Retorne apenas o texto da explicação, sem títulos ou markdown desnecessário.";

      const userPrompt = `Matéria: ${materiaNome}\nPergunta (Frente): ${frente}\nResposta (Verso): ${verso}\n\nExplique melhor de forma didática (2 a 4 frases):`;

      const explanation = await callGeminiAPI(apiKey, systemPrompt, userPrompt, false);
      return jsonResponse({ explanation });
    }

    return jsonResponse({ error: "Ação inválida. Use 'generate' ou 'explain'." }, 400);
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Erro inesperado ao processar solicitação na Gemini API.";
    return jsonResponse({ error: message }, 500);
  }
});

