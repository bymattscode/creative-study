import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import dashboardMockup from "@/assets/dashboard-mockup.png.asset.json";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BrainCircuit,
  Target,
  BarChart3,
  Clock,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30 selection:text-primary">
      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-[#3a2a67]/50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit className="text-primary" size={24} />
            <span className="font-display font-bold text-xl tracking-tight text-white">
              Sinapse
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm font-medium text-muted-foreground hover:text-white transition-colors hidden sm:block"
            >
              Entrar
            </Link>
            <Link to="/cadastro">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-lg shadow-primary/20">
                Criar Conta
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="pt-24 pb-20">
        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-4 pt-12 md:pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Sparkles size={16} /> O futuro da sua aprovação
          </div>

          <h1 className="text-5xl md:text-7xl font-display font-bold text-white mb-6 leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 max-w-4xl mx-auto">
            Seu{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-green-500">
              sistema operacional
            </span>{" "}
            de estudos com IA.
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto font-light leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
            Organização adaptativa, revisões inteligentes e métricas reais de progresso. Pare de
            montar cronogramas e comece a executar.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <Link to="/cadastro">
              <Button
                size="lg"
                className="h-14 px-8 text-lg bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-[0_0_30px_rgba(168,255,0,0.3)] hover:shadow-[0_0_40px_rgba(168,255,0,0.5)] transition-all hover:scale-105"
              >
                Começar Gratuitamente <ArrowRight className="ml-2" size={20} />
              </Button>
            </Link>
          </div>

          <div className="mt-20 relative mx-auto max-w-5xl animate-in fade-in zoom-in-95 duration-1000 delay-500">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 bottom-0 h-40"></div>
            <div className="absolute inset-0 bg-primary/5 blur-[100px] -z-10 rounded-full"></div>
            <img
              src={dashboardMockup.url}
              alt="Dashboard Sinapse"
              className="rounded-2xl border border-[#3a2a67] shadow-2xl relative z-0 w-full object-cover"
            />
          </div>
        </section>

        {/* Features / Value Proposition */}
        <section className="py-24 bg-surface/50 border-y border-border">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
                Tudo o que você precisa, <span className="text-primary">nada de poluição</span>
              </h2>
              <p className="text-muted-foreground text-lg">
                Substitua planilhas, apps de timer e cadernos de erro por um único ecossistema
                desenhado para a hiperfoco.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: <Target className="text-primary" size={32} />,
                  title: "Plano Adaptativo",
                  desc: "A IA reorganiza seus blocos atrasados automaticamente. Sem culpa, apenas progresso.",
                },
                {
                  icon: <BrainCircuit className="text-purple-400" size={32} />,
                  title: "Revisão Inteligente",
                  desc: "Algoritmo de repetição espaçada que prioriza o que você tem mais dificuldade.",
                },
                {
                  icon: <Clock className="text-blue-400" size={32} />,
                  title: "Sessões de Foco",
                  desc: "Timer Pomodoro nativo que registra suas horas líquidas direto no histórico.",
                },
                {
                  icon: <BarChart3 className="text-orange-400" size={32} />,
                  title: "Analytics Reais",
                  desc: "Métricas acionáveis para saber exatamente qual matéria precisa de atenção hoje.",
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="bg-surface-elevated border border-border p-6 rounded-2xl hover:border-primary/50 transition-colors group"
                >
                  <div className="w-12 h-12 rounded-xl bg-background flex items-center justify-center border border-border mb-6 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="py-24 max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
              Como a mágica acontece
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              {[
                {
                  num: "01",
                  title: "Defina sua meta",
                  desc: "Diga ao Sinapse qual o seu concurso ou vestibular e sua disponibilidade semanal.",
                },
                {
                  num: "02",
                  title: "O algoritmo planeja",
                  desc: "Nossa IA distribui a carga horária otimizada entre teoria, questões e revisões.",
                },
                {
                  num: "03",
                  title: "Você executa",
                  desc: "Entre no Estúdio de Foco. Estude sem distrações e registre seu progresso real.",
                },
                {
                  num: "04",
                  title: "A IA calibra",
                  desc: "Baseado no seu desempenho, o plano é ajustado para a próxima semana. Melhoria contínua.",
                },
              ].map((step, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-900/30 border border-purple-500/30 flex items-center justify-center text-purple-300 font-display font-bold text-lg">
                    {step.num}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-1">{step.title}</h4>
                    <p className="text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-primary/10 blur-[80px] rounded-full"></div>
              <div className="bg-surface border border-border rounded-2xl p-8 relative shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <Zap className="text-primary" />
                  <span className="font-bold text-lg text-white">Insight Diário</span>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-background border border-border rounded-xl">
                    <p className="text-sm text-foreground">
                      "Você acumulou 3 revisões de Direito Administrativo. Recomendo focar 45
                      minutos nisso antes de avançar na teoria de Constitucional."
                    </p>
                  </div>
                  <div className="p-4 bg-background border border-border rounded-xl opacity-70">
                    <p className="text-sm text-foreground">
                      "Sua constância caiu na última quarta-feira. Que tal reduzir a meta de sexta
                      para recuperar o ritmo sem estresse?"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-24 bg-surface/50 border-y border-border" id="planos">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
                Escolha seu nível de intensidade
              </h2>
              <p className="text-muted-foreground text-lg">
                Planos transparentes para todas as fases da sua preparação.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Free */}
              <div className="bg-background border border-border rounded-3xl p-8 flex flex-col">
                <h3 className="text-2xl font-bold text-white mb-2">Básico</h3>
                <p className="text-muted-foreground mb-6">
                  Para quem está começando a se organizar.
                </p>
                <div className="text-5xl font-display font-bold text-white mb-8">Grátis</div>

                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <CheckCircle2 size={20} className="text-muted-foreground/50" /> 1 Objetivo Ativo
                  </li>
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <CheckCircle2 size={20} className="text-muted-foreground/50" /> Cronômetro
                    Pomodoro
                  </li>
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <CheckCircle2 size={20} className="text-muted-foreground/50" /> Dashboard
                    Simples
                  </li>
                </ul>

                <Link to="/cadastro" className="w-full">
                  <Button variant="outline" className="w-full h-12 text-lg">
                    Criar Conta Grátis
                  </Button>
                </Link>
              </div>

              {/* Pro */}
              <div className="bg-surface-elevated border-2 border-primary rounded-3xl p-8 flex flex-col relative shadow-[0_0_50px_rgba(168,255,0,0.1)] hover:shadow-[0_0_60px_rgba(168,255,0,0.2)] transition-shadow">
                <div className="absolute top-0 right-8 -translate-y-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase">
                  Recomendado
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Sinapse Pro</h3>
                <p className="text-muted-foreground mb-6">
                  A ferramenta definitiva para altíssima performance.
                </p>
                <div className="flex items-baseline gap-2 mb-8">
                  <span className="text-5xl font-display font-bold text-white">R$ 29</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>

                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3 text-white">
                    <CheckCircle2 size={20} className="text-primary" /> Planejamento Adaptativo
                  </li>
                  <li className="flex items-center gap-3 text-white">
                    <CheckCircle2 size={20} className="text-primary" /> Algoritmo de Revisão
                  </li>
                  <li className="flex items-center gap-3 text-white">
                    <CheckCircle2 size={20} className="text-primary" /> Copiloto de IA Diario
                  </li>
                  <li className="flex items-center gap-3 text-white">
                    <CheckCircle2 size={20} className="text-primary" /> Analytics Avançados
                  </li>
                </ul>

                <Link to="/cadastro" className="w-full">
                  <Button className="w-full h-12 text-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90">
                    Começar Teste Pro
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-24 max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-bold text-white">Perguntas Frequentes</h2>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-4">
            <AccordionItem
              value="item-1"
              className="border border-border bg-surface px-6 rounded-lg"
            >
              <AccordionTrigger className="hover:no-underline text-left text-lg font-medium text-white">
                O Sinapse serve para qualquer concurso?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base">
                Sim. A plataforma é agnóstica de conteúdo. Você cadastra as matérias do seu edital
                ou vestibular, e a IA organiza a distribuição de carga horária para você.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="item-2"
              className="border border-border bg-surface px-6 rounded-lg"
            >
              <AccordionTrigger className="hover:no-underline text-left text-lg font-medium text-white">
                Preciso pagar para usar?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base">
                Você pode usar o plano Básico gratuitamente para sempre, que inclui timer e
                dashboard simples. Os recursos adaptativos e a IA fazem parte do Sinapse Pro.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="item-3"
              className="border border-border bg-surface px-6 rounded-lg"
            >
              <AccordionTrigger className="hover:no-underline text-left text-lg font-medium text-white">
                Como funcionam as revisões inteligentes?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base">
                Ao finalizar um tópico, ele entra no funil de revisões. Dependendo da sua percepção
                de dificuldade (Fácil, Médio, Difícil), o algoritmo calcula o espaçamento ideal para
                a próxima revisão, evitando que você esqueça o conteúdo até a prova.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* Final CTA */}
        <section className="py-24 text-center px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 blur-[120px] -z-10 rounded-full w-full max-w-4xl mx-auto h-[400px]"></div>
          <h2 className="text-4xl md:text-6xl font-display font-bold text-white mb-6">
            Pronto para evoluir?
          </h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Junte-se a estudantes de alta performance que pararam de se planejar e começaram a agir.
          </p>
          <Link to="/cadastro">
            <Button
              size="lg"
              className="h-16 px-10 text-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-[0_0_40px_rgba(168,255,0,0.4)] hover:scale-105 transition-all"
            >
              Criar Minha Conta <Sparkles className="ml-2" size={24} />
            </Button>
          </Link>
        </section>
      </main>

      <footer className="border-t border-border bg-background py-12 text-center text-muted-foreground">
        <div className="flex items-center justify-center gap-2 mb-4">
          <BrainCircuit className="text-primary/50" size={20} />
          <span className="font-display font-bold text-lg text-white/50">Sinapse</span>
        </div>
        <p className="text-sm">© 2026 Sinapse. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
