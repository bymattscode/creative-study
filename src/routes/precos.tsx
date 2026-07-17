import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

export const Route = createFileRoute("/precos")({
  head: () => ({
    meta: [
      { title: "Preços — Sinapse" },
      { name: "description", content: "Planos simples do Sinapse. Comece grátis e evolua para o Pro com IA, flashcards e simulados quando quiser." },
      { property: "og:title", content: "Preços — Sinapse" },
      { property: "og:description", content: "Grátis para começar. R$ 29/mês para o Pro. Sem pegadinhas." },
    ],
  }),
  component: PricingPage,
});

const plans = [
  { name: "Grátis", price: "R$ 0", desc: "Para experimentar", features: ["1 matéria", "Revisões SM-2", "Pomodoro integrado", "Métricas básicas"], cta: "Começar", highlight: false },
  { name: "Pro", price: "R$ 29", desc: "por mês", features: ["Matérias ilimitadas", "IA de sugestão", "Flashcards por IA", "Simulados", "Sync Google Calendar", "Suporte por email"], cta: "Assinar Pro", highlight: true },
  { name: "Anual", price: "R$ 19", desc: "por mês · cobrado anualmente", features: ["Tudo do Pro", "34% de desconto", "Suporte prioritário", "Acesso antecipado a novidades"], cta: "Escolher anual", highlight: false },
];

function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="mt-10 max-w-2xl">
          <p className="text-xs uppercase tracking-widest text-lime">Preços</p>
          <h1 className="mt-3 font-display text-5xl leading-[1.05] tracking-tight text-balance md:text-6xl">
            Um plano para cada <em className="italic">momento</em>.
          </h1>
          <p className="mt-5 text-muted-foreground">Sem cartão para começar. Cancele quando quiser.</p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {plans.map((p) => (
            <div key={p.name} className={`rounded-2xl p-7 ${p.highlight ? "border-2 border-lime bg-surface shadow-[var(--shadow-glow)]" : "glow-card"}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl">{p.name}</h3>
                {p.highlight && <span className="rounded-full bg-lime/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-lime">Popular</span>}
              </div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-4xl">{p.price}</span>
                <span className="text-sm text-muted-foreground">{p.desc}</span>
              </div>
              <ul className="mt-6 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-lime" /> {f}
                  </li>
                ))}
              </ul>
              <a href="#" className={`mt-7 inline-flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${p.highlight ? "bg-lime text-lime-foreground hover:opacity-90" : "border border-border bg-surface hover:bg-surface-elevated"}`}>
                {p.cta} <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}