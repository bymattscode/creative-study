import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre — Sinapse" },
      { name: "description", content: "Por que criamos o Sinapse: um app de estudos que respeita como o cérebro realmente aprende." },
      { property: "og:title", content: "Sobre — Sinapse" },
      { property: "og:description", content: "A história por trás do Sinapse." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <p className="mt-10 text-xs uppercase tracking-widest text-lime">Sobre</p>
        <h1 className="mt-3 font-display text-5xl leading-[1.05] tracking-tight text-balance md:text-6xl">
          Feito para quem <em className="italic">estuda de verdade</em>.
        </h1>
        <div className="prose prose-invert mt-10 max-w-none space-y-6 text-muted-foreground">
          <p className="text-lg leading-relaxed">
            Todo estudante já viveu isso: passa horas revisando, no dia seguinte parece que
            nunca leu aquilo. A ciência tem nome para isso — curva do esquecimento — e uma
            solução conhecida há décadas: repetição espaçada.
          </p>
          <p className="leading-relaxed">
            O problema é que a maioria dos apps de estudo trata isso como decoração. Colocam
            um "revisar" no menu e mandam notificação genérica. O Sinapse foi construído
            ao contrário: o algoritmo SM-2 é o centro do produto, não um acessório.
          </p>
          <p className="leading-relaxed">
            Somos um time pequeno obcecado por design, ciência cognitiva e por criar uma
            ferramenta que funciona sem virar mais uma fonte de ansiedade.
          </p>
          <p className="leading-relaxed">
            Obrigado por chegar até aqui. Bons estudos.
          </p>
        </div>
      </div>
    </div>
  );
}