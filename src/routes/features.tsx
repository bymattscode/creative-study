import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Brain, Sparkles, Layers, LineChart, Timer, CalendarDays, Target, Flame } from "lucide-react";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Recursos — Sinapse" },
      { name: "description", content: "Conheça os recursos do Sinapse: revisões espaçadas SM-2, IA que sugere o que estudar, flashcards automáticos, pomodoro e métricas em tempo real." },
      { property: "og:title", content: "Recursos — Sinapse" },
      { property: "og:description", content: "Tudo que o Sinapse faz para você estudar menos e lembrar mais." },
    ],
  }),
  component: FeaturesPage,
});

const features = [
  { icon: Brain, title: "Revisões espaçadas SM-2", desc: "Cada tópico tem sua própria curva de esquecimento. O algoritmo aprende com sua autoavaliação e ajusta o próximo intervalo automaticamente." },
  { icon: Sparkles, title: "IA de sugestão contextual", desc: "Baseado em seu desempenho, prazo da prova e peso do edital, a IA sugere o próximo tópico e explica o motivo em linguagem simples." },
  { icon: Layers, title: "Flashcards por IA", desc: "Cole um texto ou resumo — a IA gera dezenas de cards prontos para treino com SM-2. Edite, aprove ou descarte." },
  { icon: Target, title: "Planner por edital", desc: "Organize por matéria e tópico com peso do edital. Priorização automática do que rende mais nota." },
  { icon: LineChart, title: "Métricas semanais", desc: "Horas estudadas, questões respondidas, taxa de acerto. Gráficos claros que respondem: estou melhorando?" },
  { icon: Flame, title: "Constância visível", desc: "Heatmap estilo GitHub mostra seus dias de estudo. Streak, meta diária e visão anual num só lugar." },
  { icon: Timer, title: "Pomodoro que registra", desc: "Cada ciclo vira automaticamente tempo de estudo no tópico ativo. Fim das planilhas paralelas." },
  { icon: CalendarDays, title: "Calendário unificado", desc: "Revisões, provas, tarefas e prazos num só calendário. Sincronize com Google Calendar." },
];

function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="mt-10 max-w-2xl">
          <p className="text-xs uppercase tracking-widest text-lime">Recursos</p>
          <h1 className="mt-3 font-display text-5xl leading-[1.05] tracking-tight text-balance md:text-6xl">
            Cada detalhe pensado para <em className="italic">memória de longo prazo</em>.
          </h1>
        </div>
        <div className="mt-16 grid gap-4 md:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="glow-card rounded-2xl p-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-lime/10 text-lime">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-medium">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}