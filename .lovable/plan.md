## Nome proposto: **Sinapse**

Curto, memorável, referência direta ao cérebro/aprendizado (as sinapses são o que fortalecemos ao revisar) — encaixa perfeito na proposta de "revisões espaçadas + IA". Se você quiser outro nome, é só trocar antes de eu começar.

## Identidade visual (dark, com personalidade própria)

Para não virar mais um "Mentoris azul-neon", vou construir uma identidade distinta:

- **Paleta**: fundo carvão profundo (não preto puro), superfícies em grafite quente, acento principal **verde-limão elétrico** (evolução/acerto), acento secundário **âmbar** (revisão urgente), destaque frio ciano para dados. Foge do azul-neon padrão.
- **Tipografia**: display serifada moderna (Fraunces ou Instrument Serif) para títulos + Geist Sans para UI. Dá ar editorial/premium, não "SaaS genérico".
- **Textura**: grid sutil de fundo, cards com borda 1px + glow interno suave, gráficos com traço fino e áreas semitransparentes.
- **Motion**: micro-interações contidas (fade + slide de 200ms), sem parallax pesado.

## Roadmap em fases

Cada fase é um entregável funcional. Fazemos uma, você valida, seguimos.

**Fase 1 — Landing + Design System** ← começamos aqui
- Design tokens completos em `src/styles.css` (cores, tipografia, sombras, gradientes)
- Landing pública em `/`: hero, seções de features (Dashboard, Revisões IA, Planner, Métricas, Flashcards, Simulados, Calendário), prova social, CTA final, footer
- SEO: head metadata, sitemap.xml, robots.txt, llms.txt
- Rotas separadas para `/features`, `/precos`, `/sobre` (SEO-friendly)

**Fase 2 — Auth + Shell do app**
- Lovable Cloud ligado (email/senha + Google)
- Layout autenticado `_authenticated` com sidebar, header, tema
- Onboarding: usuário cadastra matérias e prova-alvo

**Fase 3 — Planner + Tópicos**
- CRUD de matérias e tópicos
- Priorização por peso do edital
- Views: por tópico, por matéria

**Fase 4 — Revisões espaçadas (o coração)**
- Algoritmo SM-2 (melhor que o Ebbinghaus puro do Mentoris)
- Dashboard "Revisões do dia"
- Registro de sessão com autoavaliação (0–5)

**Fase 5 — IA (Lovable AI Gateway, Gemini 3 Flash)**
- Sugestões diárias do que estudar (baseado em desempenho + prazo)
- Gerador de flashcards a partir de texto colado
- Gerador de questões estilo prova

**Fase 6 — Métricas + Metas**
- Gráfico semanal (horas, questões, desempenho)
- Metas configuráveis
- Heatmap de constância (estilo GitHub)

**Fase 7 — Calendário + Pomodoro**
- Calendário unificado (revisões + provas + tarefas)
- Timer Pomodoro integrado com registro automático de sessão
- (Opcional) sync Google Calendar

**Fase 8 — Simulados**
- Modo prova cronometrado
- Relatório pós-prova com pontos fracos

## Diferenciais vs Mentoris

- **SM-2 completo** em vez de Ebbinghaus fixo (adapta ao usuário de verdade)
- **Pomodoro integrado ao registro** (não é feature separada solta)
- **Heatmap de constância** estilo GitHub (mais legível que o calendário deles)
- **IA de sugestão contextual** que explica *por quê* sugeriu aquele tópico
- **Identidade visual editorial** (não mais um dashboard azul-neon)

## Detalhes técnicos (para referência)

- TanStack Start + TanStack Query + Tailwind v4 (stack já configurada)
- Lovable Cloud para auth/DB/storage a partir da Fase 2
- Lovable AI Gateway (`google/gemini-3-flash-preview`) a partir da Fase 5
- Recharts para gráficos
- Shadcn com variantes customizadas usando tokens semânticos (nunca cores hardcoded)

---

**Se aprovar, começo pela Fase 1 agora.** Me diga também:
1. Aceita o nome **Sinapse** ou quer outro?
2. Alguma feature do Mentoris que você quer *remover* do roadmap?
3. Alguma que você quer *adicionar* que não listei?