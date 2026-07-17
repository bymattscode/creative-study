<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

# Diretrizes Oficiais de Desenvolvimento - Sinapse

Este arquivo contém as regras permanentes e o contexto do produto para todos os agentes e desenvolvedores atuando no repositório. **LEIA-O SEMPRE** antes de realizar qualquer alteração.

## 🎯 Visão do Produto

**Sinapse** é um produto SaaS premium de organização de estudos para estudantes, concurseiros e vestibulandos.
Ele foca em planejamento adaptativo, revisões inteligentes, técnica pomodoro, análise de desempenho e insights baseados em IA.
**Objetivo da UX:** O app deve parecer um "sistema operacional de estudos", não apenas um planner. Deve transmitir clareza, controle absoluto, consistência, foco e progresso real. O design deve ser limpo, focado na produtividade, sem excessos visuais.

## 🛠 Stack Tecnológica

- **Framework:** React 19 + Vite
- **Roteamento:** `@tanstack/react-router` (File-based routing em `src/routes/`)
- **Estado/Cache:** `@tanstack/react-query`
- **Estilização:** Tailwind CSS v4
- **Componentes Base:** Shadcn UI + Radix UI Primitives (`src/components/ui/`)
- **Ícones:** `lucide-react`
- **Ferramentas:** TypeScript, ESLint, Prettier, Bun/npm

## 📂 Convenções Arquiteturais

### Estrutura de Pastas

- `src/routes/`: Apenas arquivos de rota do TanStack. Nomes em kebab-case ou convencionais do TanStack (ex: `__root.tsx`, `index.tsx`, `app.tsx`, `app.index.tsx`).
- `src/components/ui/`: Apenas componentes base (Shadcn/Radix). **Não altere componentes base a menos que estritamente necessário.**
- `src/components/layout/`: Componentes estruturais (Sidebars, Navbars, Wrappers).
- `src/components/features/`: Componentes específicos de domínio de negócio (ex: `PlannerSemanal`, `CardRevisao`).
- `src/lib/`: Funções utilitárias (`utils.ts`), configurações globais e integração de APIs.
- `src/hooks/`: Custom hooks react (`useAuth`, `usePlanner`).
- `src/contexts/`: Provedores de estado global (Context API).

### Regras de Ouro do Código

1. **Verificar Antes de Criar:** Sempre explore o repositório (`list_dir`, `grep_search`) antes de criar um componente, hook ou provider.
2. **Reuso Extremo:** Maximize o uso dos componentes da pasta `src/components/ui/`. Não crie botões, inputs ou dialogs do zero.
3. **Não Duplicação:** Nunca duplique páginas, layouts, hooks, contexts ou tipos. Se algo já existe, expanda sua flexibilidade via props.
4. **Respeite Estruturas Estáveis:** Não refatore a arquitetura ou partes estáveis (como o setup do Vite/TanStack) sem necessidade explícita.
5. **Implementação Incremental:** Faça mudanças atômicas, incrementais e seguras.
6. **Lovable Sync:** Mantenha a compatibilidade com a infraestrutura do Lovable. Não delete o diretório `.lovable` nem arquivos base gerados por ele.

## 🎨 Design System e Estilo

### Identidade Visual (Cores Oficiais)

- **Fundo Principal:** `#0f0b1f` (Fundo geral da aplicação)
- **Fundo Secundário:** `#17122b` (Painéis laterais, áreas secundárias)
- **Superfícies/Cards:** `#21193a` (Fundo de cards, modais e containers destacados)
- **Borda:** `#3a2a67` (Divisórias e contornos de cards/inputs)
- **Primária (Destaque):** `#a8ff00` (Verde neon - Ações principais, CTA, sucesso intenso)
- **Secundária (Marca):** `#2a0863` (Roxo profundo - Apoio, botões secundários, headers)
- **Texto Principal:** `#f5f7ff` (Branco gelo - Alta legibilidade)
- **Texto Secundário:** `#b8b4d1` (Cinza arroxeado - Descrições, placeholders, texto de apoio)
- **Feedback:**
  - Sucesso: `#37d67a` (Verde suave)
  - Alerta: `#ffcc33` (Amarelo)
  - Erro: `#ff5c7a` (Vermelho)

### Tipografia

- **Display/Headings:** `Aloevera Display` (Usar em títulos principais, branding, hero sections).
- **Interface/Texto Corrido:** `Nexa` (Usar em parágrafos, botões, labels de formulário, navegação).
- _Regra de Fallback:_ Se as fontes customizadas não carregarem, a interface deve usar `sans-serif` (Inter, Roboto, system-ui) sem quebrar o layout (ajuste de leading/tracking seguro).

### Padrões de Componentes

- **Botões:** Arredondamento suave (`rounded-md` ou `rounded-lg`). Ações primárias usando a cor verde neon com texto escuro para alto contraste.
- **Cards:** Fundo `#21193a`, borda sutil (`border border-[#3a2a67]`), leve sombra (`shadow-lg` adaptada para modo escuro), cantos `rounded-xl`.
- **Espaçamento:** Escala padrão do Tailwind (fator de `4px`). Priorize `gap-4` ou `gap-6` entre seções. Layout arejado.
- **Estados Vazios (Empty States):** Devem ser acolhedores, contendo ilustração/ícone sutil (`text-muted-foreground`), uma mensagem curta encorajadora e um Call-to-Action (botão) claro.
- **Loading:** Preferir esqueletos (Skeletons) pulsantes na mesma cor das superfícies em vez de spinners tela-toda (exceto em submissões bloqueantes de forms).
- **Feedback (Toast/Sonner):** Mensagens de sucesso ou erro devem ser efêmeras, surgindo no canto inferior direito, sempre com linguagem clara e encorajadora.

## 📱 Responsividade e Acessibilidade

- **Mobile-first:** A aplicação deve ser totalmente funcional em telas de celular. Teste sidebars como drawers no mobile e colapse grids complexos em uma coluna.
- **Acessibilidade (a11y):** Utilize as propriedades ARIA inclusas nos componentes Radix. Garanta contraste suficiente entre o texto e o fundo (especialmente sobre a cor primária neon). Inputs sempre devem ter labels (`<Label htmlFor="...">`). Focus rings visíveis ao usar navegação por teclado.

## 🧪 Qualidade e Testes

- **Testes Mínimos:** Sempre que criar uma utilidade lógica complexa (ex: em `src/lib/`), adicione um caso de teste simples caso haja um framework de testes presente (Vitest/Jest).
- **Verificação Local:** Antes de finalizar qualquer tarefa, rode o build da aplicação (`npm run build`) para assegurar que não haja quebra de tipos TypeScript ou erros do Tailwind.
- **Integração de Código:** Mantenha o código estritamente tipado (TypeScript) sem usar `any` levianamente.

---

**Nota para Agentes IA:** Siga rigorosamente estas orientações em cada chamada de ferramenta (tool call). O objetivo é construir um sistema robusto sem gerar lixo tecnológico ("tech debt"). Em caso de dúvida sobre design, priorize a estética "Premium, Dark, Minimal e Contrastante".
