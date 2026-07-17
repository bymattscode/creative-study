import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import {
  Brain,
  CalendarDays,
  Sparkles,
  Timer,
  Layers,
  LineChart,
  Target,
  ArrowRight,
  Check,
  Flame,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <Hero />
        <LogoStrip />
        <FeatureGrid />
        <MethodSection />
        <DifferentialSection />
        <PricingTeaser />
        <FinalCTA />
      </main>
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <LogoMark />
          <span className="font-display text-xl font-semibold tracking-tight">Sinapse</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <Link to="/features" className="hover:text-foreground transition-colors">Recursos</Link>
          <Link to="/precos" className="hover:text-foreground transition-colors">Preços</Link>
          <Link to="/sobre" className="hover:text-foreground transition-colors">Sobre</Link>
        </nav>
        <div className="flex items-center gap-3">
          <a href="#" className="hidden text-sm text-muted-foreground hover:text-foreground sm:block">Entrar</a>
          <a
            href="#cta"
            className="inline-flex items-center gap-1.5 rounded-full bg-lime px-4 py-2 text-sm font-medium text-lime-foreground shadow-[var(--shadow-glow)] transition-transform hover:scale-[1.02]"
          >
            Começar grátis <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </header>
  );
}

function LogoMark() {
  return (
    <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-lime text-lime-foreground shadow-[var(--shadow-glow)]">
      <Brain className="h-4.5 w-4.5" strokeWidth={2.5} />
    </div>
  );
}

function Hero() {
  return (
    <section className="hero-glow relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-20 md:pt-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-lime" />
            Nova geração de estudo com IA · SM-2
          </div>
          <h1 className="font-display text-5xl font-medium leading-[1.05] tracking-tight text-balance md:text-7xl">
            Estude <em className="italic text-lime">menos</em>.
            <br />
            Lembre <span className="italic">muito</span> mais.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground text-balance">
            Sinapse organiza seu edital, monta revisões espaçadas personalizadas com IA e mostra
            sua evolução em tempo real. Sem planilhas, sem se perder no que estudar.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#cta"
              className="inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-semibold text-lime-foreground shadow-[var(--shadow-glow)] transition-transform hover:scale-[1.02]"
            >
              Começar grátis <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              to="/features"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated"
            >
              Ver como funciona
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            14 dias grátis · Sem cartão · Cancele quando quiser
          </p>
        </div>

        <HeroMockup />
      </div>
    </section>
  );
}

function HeroMockup() {
  return (
    <div className="relative mx-auto mt-20 max-w-5xl">
      <div className="glow-card rounded-3xl p-2">
        <div className="rounded-[1.25rem] bg-surface p-6 md:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Hoje, terça</p>
              <h3 className="mt-1 font-display text-2xl">Bom te ver de volta, Vitor</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full bg-amber-glow/10 px-3 py-1 text-xs text-amber-glow">
                <Flame className="h-3.5 w-3.5" /> 12 dias
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <MockRevisions />
            <MockChart />
            <MockStreak />
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 -bottom-10 -z-10 h-40 bg-lime/20 blur-3xl" />
    </div>
  );
}

function MockRevisions() {
  const items = [
    { title: "Direito Constitucional", tag: "Cap. 4 · Art. 5º", urgency: "urgent" },
    { title: "Redação — coesão", tag: "Repertório", urgency: "soon" },
    { title: "Matemática Financeira", tag: "Juros compostos", urgency: "ok" },
  ];
  const color = {
    urgent: "text-amber-glow bg-amber-glow/10",
    soon: "text-cyan-data bg-cyan-data/10",
    ok: "text-lime bg-lime/10",
  } as const;
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium">Revisões do dia</p>
        <span className="text-xs text-muted-foreground">3</span>
      </div>
      <ul className="space-y-3">
        {items.map((it) => (
          <li key={it.title} className="rounded-xl border border-border/60 bg-surface p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{it.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{it.tag}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${color[it.urgency as keyof typeof color]}`}>
                {it.urgency === "urgent" ? "Hoje" : it.urgency === "soon" ? "48h" : "OK"}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MockChart() {
  const bars = [40, 65, 55, 80, 45, 90, 70];
  const days = ["S", "T", "Q", "Q", "S", "S", "D"];
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium">Sua semana</p>
        <span className="text-xs text-cyan-data">+18% ↑</span>
      </div>
      <div className="flex h-32 items-end gap-2">
        {bars.map((h, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-lime/70 to-lime"
              style={{ height: `${h}%` }}
            />
            <span className="text-[10px] text-muted-foreground">{days[i]}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="font-display text-2xl">14h 22m</span>
        <span className="text-xs text-muted-foreground">esta semana</span>
      </div>
    </div>
  );
}

function MockStreak() {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium">Constância</p>
        <span className="text-xs text-muted-foreground">Abril</span>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 28 }).map((_, i) => {
          const level = (i * 37) % 5;
          const bg = ["bg-muted", "bg-lime/20", "bg-lime/40", "bg-lime/70", "bg-lime"][level];
          return <div key={i} className={`aspect-square rounded ${bg}`} />;
        })}
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="font-display text-2xl">1.680</span>
        <span className="text-xs text-muted-foreground">questões · mês</span>
      </div>
    </div>
  );
}

function LogoStrip() {
  const items = ["ENEM", "OAB", "CESPE", "FGV", "USP", "Residência"];
  return (
    <section className="border-y border-border/60 bg-surface/40 py-10">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">
          Usado por aprovados em
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
          {items.map((n) => (
            <span key={n} className="font-display text-2xl font-medium text-muted-foreground/70">
              {n}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureGrid() {
  const features = [
    {
      icon: Sparkles,
      title: "IA que sugere o que estudar",
      desc: "Analisa seu desempenho, prazo e edital para sugerir o próximo tópico — e explica por quê.",
      accent: "lime",
    },
    {
      icon: Brain,
      title: "Revisões espaçadas SM-2",
      desc: "Algoritmo que aprende como você esquece. Nada de intervalos fixos genéricos.",
      accent: "cyan",
    },
    {
      icon: Layers,
      title: "Flashcards gerados por IA",
      desc: "Cole o conteúdo, receba dezenas de cards. Treine com repetição espaçada de verdade.",
      accent: "amber",
    },
    {
      icon: LineChart,
      title: "Métricas que motivam",
      desc: "Horas, questões e desempenho semana a semana. Gráficos claros, não painel de piloto.",
      accent: "cyan",
    },
    {
      icon: Timer,
      title: "Pomodoro integrado",
      desc: "Cada sessão vira automaticamente tempo de estudo registrado. Sem apps paralelos.",
      accent: "amber",
    },
    {
      icon: CalendarDays,
      title: "Calendário unificado",
      desc: "Revisões, provas e prazos num só lugar. Sincroniza com Google Calendar.",
      accent: "lime",
    },
  ];
  const accents = {
    lime: "text-lime bg-lime/10",
    cyan: "text-cyan-data bg-cyan-data/10",
    amber: "text-amber-glow bg-amber-glow/10",
  } as const;
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24 md:py-32">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs uppercase tracking-widest text-lime">Recursos</p>
        <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight text-balance md:text-5xl">
          Tudo que você precisa. <em className="italic text-muted-foreground">Nada que você não precisa.</em>
        </h2>
      </div>
      <div className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="glow-card group rounded-2xl p-6 transition-colors hover:bg-surface">
            <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${accents[f.accent as keyof typeof accents]}`}>
              <f.icon className="h-5 w-5" strokeWidth={2} />
            </div>
            <h3 className="mt-5 text-lg font-medium">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function MethodSection() {
  const steps = [
    { n: "01", title: "Importe seu edital", desc: "Cole ou selecione. A IA organiza matérias e tópicos com peso." },
    { n: "02", title: "Estude com intenção", desc: "Sessões guiadas, pomodoro integrado, sem decidir o que fazer." },
    { n: "03", title: "Revise no momento certo", desc: "SM-2 calcula quando você está prestes a esquecer — e te chama." },
    { n: "04", title: "Veja evolução real", desc: "Métricas semanais mostram o que funciona e o que ajustar." },
  ];
  return (
    <section className="border-y border-border/60 bg-surface/40 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-16 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="text-xs uppercase tracking-widest text-lime">Método</p>
            <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight md:text-5xl">
              A ciência por trás de <em className="italic">lembrar</em>.
            </h2>
            <p className="mt-6 text-muted-foreground">
              Ebbinghaus mostrou que esquecemos 70% do que aprendemos em 24h. O Sinapse usa o
              algoritmo SM-2 — o mesmo dos maiores apps de flashcards do mundo — para colocar
              cada revisão no dia certo. Nem cedo, nem tarde demais.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {steps.map((s) => (
              <div key={s.n} className="glow-card rounded-2xl p-6">
                <span className="font-mono text-xs text-lime">{s.n}</span>
                <h3 className="mt-3 font-display text-xl">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DifferentialSection() {
  const rows = [
    ["Algoritmo de revisão", "SM-2 adaptativo por tópico", "Intervalos fixos"],
    ["Pomodoro", "Integrado ao registro de estudo", "App separado"],
    ["Constância", "Heatmap estilo GitHub", "Calendário mensal"],
    ["Sugestão de IA", "Explica por que sugeriu", "Só lista tópicos"],
    ["Identidade visual", "Editorial e sóbria", "Dashboard genérico"],
  ];
  return (
    <section className="mx-auto max-w-6xl px-6 py-24 md:py-32">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs uppercase tracking-widest text-lime">Diferenciais</p>
        <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight text-balance md:text-5xl">
          O que muda quando o app <em className="italic">respeita</em> seu cérebro.
        </h2>
      </div>
      <div className="glow-card mt-12 overflow-hidden rounded-2xl">
        <div className="grid grid-cols-[1.2fr_1.4fr_1fr] border-b border-border bg-surface px-6 py-4 text-xs uppercase tracking-widest text-muted-foreground">
          <span>Categoria</span>
          <span className="text-lime">Sinapse</span>
          <span>Outros</span>
        </div>
        {rows.map((r, i) => (
          <div
            key={r[0]}
            className={`grid grid-cols-[1.2fr_1.4fr_1fr] px-6 py-5 text-sm ${i < rows.length - 1 ? "border-b border-border/60" : ""}`}
          >
            <span className="text-muted-foreground">{r[0]}</span>
            <span className="flex items-center gap-2 font-medium">
              <Check className="h-4 w-4 text-lime" /> {r[1]}
            </span>
            <span className="text-muted-foreground">{r[2]}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function PricingTeaser() {
  const plans = [
    {
      name: "Grátis",
      price: "R$ 0",
      desc: "Para começar",
      features: ["1 matéria", "Revisões SM-2", "Pomodoro"],
      cta: "Começar",
      highlight: false,
    },
    {
      name: "Pro",
      price: "R$ 29",
      desc: "por mês",
      features: ["Matérias ilimitadas", "IA de sugestão", "Flashcards gerados", "Simulados"],
      cta: "Assinar Pro",
      highlight: true,
    },
    {
      name: "Anual",
      price: "R$ 19",
      desc: "por mês, cobrado anualmente",
      features: ["Tudo do Pro", "34% de desconto", "Suporte prioritário"],
      cta: "Escolher anual",
      highlight: false,
    },
  ];
  return (
    <section id="pricing" className="border-y border-border/60 bg-surface/40 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs uppercase tracking-widest text-lime">Preços</p>
          <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight text-balance md:text-5xl">
            Simples como <em className="italic">deveria ser</em>.
          </h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl p-7 ${p.highlight ? "border-2 border-lime bg-surface shadow-[var(--shadow-glow)]" : "glow-card"}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl">{p.name}</h3>
                {p.highlight && (
                  <span className="rounded-full bg-lime/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-lime">
                    Popular
                  </span>
                )}
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
              <a
                href="#cta"
                className={`mt-7 inline-flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
                  p.highlight
                    ? "bg-lime text-lime-foreground hover:opacity-90"
                    : "border border-border bg-surface hover:bg-surface-elevated"
                }`}
              >
                {p.cta} <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section id="cta" className="mx-auto max-w-6xl px-6 py-24 md:py-32">
      <div className="glow-card hero-glow relative overflow-hidden rounded-3xl px-8 py-16 text-center md:px-16 md:py-24">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs text-muted-foreground">
          <Zap className="h-3.5 w-3.5 text-lime" /> Começa em 60 segundos
        </div>
        <h2 className="mx-auto mt-6 max-w-2xl font-display text-4xl leading-tight tracking-tight text-balance md:text-6xl">
          Sua próxima aprovação começa <em className="italic text-lime">hoje</em>.
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-muted-foreground">
          Junte-se aos estudantes que trocaram a planilha caótica por um método que funciona.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="#"
            className="inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-semibold text-lime-foreground shadow-[var(--shadow-glow)] transition-transform hover:scale-[1.02]"
          >
            Criar conta grátis <ArrowRight className="h-4 w-4" />
          </a>
          <Link
            to="/precos"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-6 py-3 text-sm font-medium hover:bg-surface-elevated"
          >
            Ver planos
          </Link>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border/60 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
        <div className="flex items-center gap-2">
          <LogoMark />
          <span className="font-display text-lg">Sinapse</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          <Link to="/features" className="hover:text-foreground">Recursos</Link>
          <Link to="/precos" className="hover:text-foreground">Preços</Link>
          <Link to="/sobre" className="hover:text-foreground">Sobre</Link>
          <a href="#" className="hover:text-foreground">Privacidade</a>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Sinapse</p>
      </div>
    </footer>
  );
}
