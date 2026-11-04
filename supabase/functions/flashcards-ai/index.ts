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

const PREFERRED_GEMINI_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-flash-latest",
];
const MODEL_TIMEOUT_MS = 18000;

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function parseAndValidateFlashcardsJson(
  rawText: string,
): Array<{ frente: string; verso: string }> {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

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

  return parsed
    .map((item: unknown) => {
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;
      const frente = typeof obj.frente === "string" ? obj.frente.trim() : "";
      const verso = typeof obj.verso === "string" ? obj.verso.trim() : "";
      if (!frente || !verso) return null;
      return { frente, verso };
    })
    .filter((item): item is { frente: string; verso: string } => item !== null);
}

async function discoverAvailableGeminiModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    const models = Array.isArray(data?.models) ? data.models : [];
    return models
      .filter(
        (m: { name?: string; supportedGenerationMethods?: string[] }) =>
          typeof m?.name === "string" &&
          m.name.includes("gemini") &&
          Array.isArray(m?.supportedGenerationMethods) &&
          m.supportedGenerationMethods.includes("generateContent"),
      )
      .map((m: { name: string }) => m.name.replace(/^models\//, ""))
      .sort((a: string, b: string) => {
        const aFlash = a.includes("flash") ? 0 : 1;
        const bFlash = b.includes("flash") ? 0 : 1;
        return aFlash - bFlash;
      });
  } catch {
    return [];
  }
}

async function callGeminiAPI(
  apiKey: string,
  systemInstruction: string,
  userPrompt: string,
  expectJson: boolean,
): Promise<string> {
  let lastError: Error | null = null;
  const candidateModels = [...PREFERRED_GEMINI_MODELS];

  const tryModel = async (model: string): Promise<string | null> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
        apiKey,
      )}`;

      const is25Model = model.includes("2.5");
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.4,
            ...(expectJson ? { responseMimeType: "application/json" } : {}),
            ...(is25Model ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
          },
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        lastError = new Error(`HTTP ${response.status} (${model}): ${errText}`);
        return null;
      }

      const data = await response.json();
      const text =
        data?.candidates?.[0]?.content?.parts
          ?.map((p: { text?: string }) => p.text || "")
          .join("")
          .trim() || "";

      if (!text) {
        lastError = new Error("A IA retornou uma resposta em branco.");
        return null;
      }

      return text;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === "AbortError") {
        lastError = new Error("Tempo limite excedido. Tente novamente.");
        return null;
      }
      lastError = err instanceof Error ? err : new Error(String(err));
      return null;
    }
  };

  for (const model of candidateModels) {
    const result = await tryModel(model);
    if (result) return result;
  }

  const discovered = await discoverAvailableGeminiModels(apiKey);
  for (const model of discovered) {
    if (candidateModels.includes(model)) continue;
    const result = await tryModel(model);
    if (result) return result;
  }

  throw lastError || new Error("Não foi possível obter resposta da IA.");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido. Use POST." }, 200);
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return jsonResponse(
      {
        error: "O secret GEMINI_API_KEY não foi encontrado no Supabase.",
        code: "MISSING_API_KEY",
      },
      200,
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "Corpo da requisição JSON inválido." }, 200);
  }

  try {
    if (body.action === "generate") {
      const quantidade = [3, 5, 10].includes(Number(body.quantidade))
        ? Number(body.quantidade)
        : 5;
      const materiaNome = String(body.materiaNome || "Matéria Universitária").trim();
      const conteudo = String(body.conteudo || "").trim();

      if (!conteudo) {
        return jsonResponse(
          { error: "Informe o conteúdo, tópico ou resumo para gerar as cartas." },
          200,
        );
      }

      const systemPrompt = `Você é um assistente de estudos para universitários. Gere ${quantidade} flashcards em português, nível universitário, sobre o conteúdo fornecido, no formato JSON: [{frente: pergunta clara e objetiva, verso: resposta concisa e completa}]. Varie entre perguntas conceituais e de aplicação. Retorne SOMENTE o JSON.`;
      const userPrompt = `Matéria: ${materiaNome}\nConteúdo/Tópico:\n${conteudo}\n\nGere exatamente ${quantidade} flashcards no formato JSON solicitado: [{"frente": "...", "verso": "..."}].`;

      const rawText = await callGeminiAPI(apiKey, systemPrompt, userPrompt, true);

      try {
        const cards = parseAndValidateFlashcardsJson(rawText);
        return jsonResponse({ cards }, 200);
      } catch {
        return jsonResponse(
          {
            error: "A IA retornou um formato inesperado. Tente ajustar o conteúdo e gerar novamente.",
            code: "INVALID_AI_JSON",
          },
          200,
        );
      }
    }

    if (body.action === "explain") {
      const materiaNome = String(body.materiaNome || "Matéria Universitária").trim();
      const frente = String(body.frente || "").trim();
      const verso = String(body.verso || "").trim();

      if (!frente || !verso) {
        return jsonResponse({ error: "Frente e verso da carta são obrigatórios." }, 200);
      }

      const systemPrompt =
        "Você é um professor universitário didático. Explique o conceito da carta de estudo em português de forma clara e curta (entre 2 e 4 frases), incluindo um exemplo prático rápido quando fizer sentido. Retorne apenas o texto da explicação, sem títulos ou markdown desnecessário.";
      const userPrompt = `Matéria: ${materiaNome}\nPergunta (Frente): ${frente}\nResposta (Verso): ${verso}\n\nExplique melhor de forma didática (2 a 4 frases):`;

      const explanation = await callGeminiAPI(apiKey, systemPrompt, userPrompt, false);
      return jsonResponse({ explanation }, 200);
    }

    return jsonResponse({ error: "Ação inválida. Use 'generate' ou 'explain'." }, 200);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Erro inesperado ao processar solicitação.";
    return jsonResponse({ error: message }, 200);
  }
});
