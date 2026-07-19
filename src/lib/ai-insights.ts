import { StudySession, ReviewItem, Subject } from "@/types/models";

/**
 * Utilitário para ler metadados embutidos no campo notes
 */
const decodeNotes = (raw?: string | null) => {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

/**
 * Função heurística temporária que simula o comportamento de uma IA de Copiloto.
 * Analisa os dados de estudos locais e gera uma string em linguagem natural
 * contendo um insight diário altamente acionável.
 */
export function generateDailyInsight(
  history: StudySession[],
  reviews: ReviewItem[],
  subjects: Subject[],
): string {
  // Cenário 1: Usuário totalmente novo (Sem histórico de estudo)
  if (!history || history.length === 0) {
    return "Bem-vindo! O primeiro passo é o mais importante. Que tal iniciar sua primeira sessão de Foco agora mesmo?";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Análise de Revisões Atrasadas
  const lateReviews = reviews.filter((r) => {
    const d = new Date(r.nextReviewDate);
    d.setHours(0, 0, 0, 0);
    return d < today;
  });

  if (lateReviews.length > 5) {
    // Acha a matéria que tem mais atrasos
    const lateBySubject: Record<string, number> = {};
    lateReviews.forEach((r) => {
      lateBySubject[r.subjectId] = (lateBySubject[r.subjectId] || 0) + 1;
    });

    const worstSubjectId = Object.keys(lateBySubject).reduce((a, b) =>
      lateBySubject[a] > lateBySubject[b] ? a : b,
    );

    const subjectName =
      subjects.find((s) => s.id === worstSubjectId)?.name || "uma de suas matérias";
    return `Você acumulou ${lateReviews.length} revisões. Sugiro limpar os flashcards de ${subjectName} antes de aprender matéria nova hoje.`;
  }

  // Análise de Ritmo (Dias recentes)
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dayBeforeYesterday = new Date(today);
  dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);

  const studiedYesterday = history.some(
    (s) => new Date(s.createdAt).toDateString() === yesterday.toDateString(),
  );
  const studiedDayBefore = history.some(
    (s) => new Date(s.createdAt).toDateString() === dayBeforeYesterday.toDateString(),
  );
  const studiedToday = history.some(
    (s) => new Date(s.createdAt).toDateString() === today.toDateString(),
  );

  // Se não estudou ontem nem anteontem, mas também não estudou hoje, o ritmo caiu.
  // Se estudou hoje, perdoamos o "ritmo caiu" para não desmotivar logo que ele volta, a menos que queira ser estrito.
  // Vamos ser estritos apenas se não tiver estudado hoje.
  if (!studiedYesterday && !studiedDayBefore && !studiedToday) {
    return "Seu ritmo caiu nos últimos dias. Uma sessão leve de 30 minutos hoje já é suficiente para reativar sua constância!";
  }

  // Análise de Perfil de Estudo
  let totalTime = 0;
  const timeByType: Record<string, number> = {
    teoria: 0,
    questoes: 0,
    revisao: 0,
  };

  history.forEach((s) => {
    const meta = decodeNotes(s.notes);
    const sessionType = meta.type as string;
    
    totalTime += s.durationMinutes;
    if (sessionType && timeByType[sessionType as keyof typeof timeByType] !== undefined) {
      timeByType[sessionType as keyof typeof timeByType] += s.durationMinutes;
    }
  });

  const theoryPercent = totalTime > 0 ? (timeByType.teoria / totalTime) * 100 : 0;
  const questionsPercent = totalTime > 0 ? (timeByType.questoes / totalTime) * 100 : 0;

  if (theoryPercent > 70) {
    return "Notei que você tem consumido muita Teoria ultimamente. Hoje é um excelente dia para equilibrar focando em resolver Questões.";
  }

  if (questionsPercent > 70) {
    return "Você está com uma ótima carga prática em Questões! Tente usar os erros de hoje para alimentar suas Revisões de amanhã.";
  }

  // Cenário Genérico/Positivo
  return "Seus indicadores estão equilibrados. Mantenha o excelente trabalho e foco no seu plano semanal para hoje.";
}
