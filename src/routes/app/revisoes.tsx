import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Subject, ReviewItem } from "@/types/models";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  BrainCircuit, 
  CalendarDays, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Gauge, 
  Plus, 
  History
} from "lucide-react";

export const Route = createFileRoute("/app/revisoes")({
  component: RevisoesRoute,
});

function RevisoesRoute() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const subs = localStorage.getItem("@sinapse:subjects");
      if (subs) setSubjects(JSON.parse(subs));

      const revs = localStorage.getItem("@sinapse:reviewItems");
      if (revs) setReviews(JSON.parse(revs));
    } catch (e) {
      console.error(e);
    }
  };

  const saveData = (newReviews: ReviewItem[]) => {
    setReviews(newReviews);
    localStorage.setItem("@sinapse:reviewItems", JSON.stringify(newReviews));
  };

  const getSubjectColor = (subjectId: string) => {
    return subjects.find(s => s.id === subjectId)?.color || "#a8ff00";
  };

  const getSubjectName = (subjectId: string) => {
    return subjects.find(s => s.id === subjectId)?.name || "Múltiplas";
  };

  // Filter Logic
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isLate = (dateStr: string) => {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return d < today;
  };

  const isToday = (dateStr: string) => {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  };

  const isFuture = (dateStr: string) => {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return d > today;
  };

  const lateReviews = reviews.filter(r => isLate(r.nextReviewDate)).sort((a,b) => new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime());
  const todayReviews = reviews.filter(r => isToday(r.nextReviewDate));
  const futureReviews = reviews.filter(r => isFuture(r.nextReviewDate)).sort((a,b) => new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime());

  // SRS Logic
  const handleReview = (item: ReviewItem, perception: "Difícil" | "Médio" | "Fácil") => {
    let nextInterval = item.intervalDays || 1;
    let newConfidence = item.confidenceLevel || 50;

    switch (perception) {
      case "Difícil":
        nextInterval = 1; // Try again tomorrow
        newConfidence = Math.max(0, newConfidence - 20);
        break;
      case "Médio":
        nextInterval = Math.ceil(nextInterval * 1.5);
        newConfidence = Math.min(100, newConfidence + 10);
        break;
      case "Fácil":
        nextInterval = Math.ceil(nextInterval * 2.5);
        newConfidence = Math.min(100, newConfidence + 25);
        break;
    }

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + nextInterval);

    let newPriority: "Alta" | "Média" | "Baixa" = "Baixa";
    if (newConfidence < 40) newPriority = "Alta";
    else if (newConfidence < 70) newPriority = "Média";

    const updatedItem: ReviewItem = {
      ...item,
      intervalDays: nextInterval,
      confidenceLevel: newConfidence,
      priority: newPriority,
      lastReviewDate: new Date().toISOString(),
      nextReviewDate: nextDate.toISOString()
    };

    const newReviews = reviews.map(r => r.id === item.id ? updatedItem : r);
    saveData(newReviews);
    setExpandedCard(null);
    toast.success(`Próxima revisão em ${nextInterval} dia(s)`);
  };

  // Mocks
  const generateMocks = () => {
    if (subjects.length === 0) {
      toast.error("Você precisa criar matérias primeiro (no Dashboard)");
      return;
    }
    
    const now = new Date();
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 2);
    const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);

    const mocks: ReviewItem[] = [
      {
        id: "mock1",
        subjectId: subjects[0].id,
        topicName: "Citologia Básica",
        intervalDays: 1,
        confidenceLevel: 30,
        priority: "Alta",
        nextReviewDate: yesterday.toISOString(), // Atrasado
      },
      {
        id: "mock2",
        subjectId: subjects[subjects.length > 1 ? 1 : 0].id,
        topicName: "Revolução Francesa",
        intervalDays: 3,
        confidenceLevel: 60,
        priority: "Média",
        nextReviewDate: now.toISOString(), // Hoje
      },
      {
        id: "mock3",
        subjectId: subjects[0].id,
        topicName: "Geometria Espacial",
        intervalDays: 7,
        confidenceLevel: 85,
        priority: "Baixa",
        nextReviewDate: tomorrow.toISOString(), // Futuro
      }
    ];

    saveData([...reviews, ...mocks]);
    toast.success("Mocks injetados!");
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "Alta": return <Badge variant="destructive" className="bg-red-500/20 text-red-500 hover:bg-red-500/30">Alta</Badge>;
      case "Média": return <Badge variant="secondary" className="bg-orange-500/20 text-orange-500 hover:bg-orange-500/30">Média</Badge>;
      case "Baixa": return <Badge variant="outline" className="border-border text-muted-foreground">Baixa</Badge>;
      default: return null;
    }
  };

  const ReviewCard = ({ item }: { item: ReviewItem }) => {
    const isExpanded = expandedCard === item.id;

    return (
      <Card className="bg-surface-elevated border-border shadow-sm mb-3 overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-glow group">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: getSubjectColor(item.subjectId) }} 
              />
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {getSubjectName(item.subjectId)}
              </span>
            </div>
            {getPriorityBadge(item.priority)}
          </div>

          <h3 className="text-lg font-bold mb-2">{item.topicName}</h3>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
            <div className="flex items-center gap-1" title="Confiança">
              <Gauge size={14} className={item.confidenceLevel > 70 ? "text-green-500" : item.confidenceLevel < 40 ? "text-red-500" : "text-orange-500"} />
              {Math.floor(item.confidenceLevel)}%
            </div>
            {item.lastReviewDate && (
              <div className="flex items-center gap-1" title="Última Revisão">
                <History size={14} />
                {new Date(item.lastReviewDate).toLocaleDateString("pt-BR", {day:'2-digit', month:'2-digit'})}
              </div>
            )}
            <div className="flex items-center gap-1" title="Próxima Revisão">
              <Clock size={14} className="text-primary" />
              {new Date(item.nextReviewDate).toLocaleDateString("pt-BR", {day:'2-digit', month:'2-digit'})}
            </div>
          </div>

          {isExpanded ? (
            <div className="animate-in slide-in-from-top-2 fade-in duration-200 bg-background/50 rounded-lg p-3 mt-2 border border-border">
              <p className="text-xs text-center text-muted-foreground mb-3 font-medium">Como foi lembrar disso?</p>
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  variant="outline" 
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20"
                  onClick={() => handleReview(item, "Difícil")}
                >
                  Difícil
                </Button>
                <Button 
                  variant="outline" 
                  className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border-orange-500/20"
                  onClick={() => handleReview(item, "Médio")}
                >
                  Médio
                </Button>
                <Button 
                  variant="outline" 
                  className="bg-green-500/10 hover:bg-green-500/20 text-green-500 border-green-500/20"
                  onClick={() => handleReview(item, "Fácil")}
                >
                  Fácil
                </Button>
              </div>
            </div>
          ) : (
            <Button 
              variant="default" 
              className="w-full text-primary-foreground font-bold"
              onClick={() => setExpandedCard(item.id)}
            >
              Revisar Agora
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Revisões Inteligentes</h1>
          <p className="text-muted-foreground text-sm">O motor que consolida sua memória a longo prazo.</p>
        </div>
        <Button variant="outline" size="sm" onClick={generateMocks} className="border-dashed">
          <Plus size={16} className="mr-2" /> Gerar Mocks
        </Button>
      </div>

      <Tabs defaultValue="hoje" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-surface border border-border p-1">
          <TabsTrigger value="atrasadas" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-500">
            <AlertCircle size={14} className="mr-2" /> Atrasadas ({lateReviews.length})
          </TabsTrigger>
          <TabsTrigger value="hoje" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <CheckCircle2 size={14} className="mr-2" /> Hoje ({todayReviews.length})
          </TabsTrigger>
          <TabsTrigger value="proximas">
            <CalendarDays size={14} className="mr-2" /> Próximas ({futureReviews.length})
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="atrasadas">
            {lateReviews.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BrainCircuit size={48} className="mx-auto mb-4 opacity-20" />
                <p>Nenhuma revisão atrasada! Excelente.</p>
              </div>
            ) : (
              lateReviews.map(r => <ReviewCard key={r.id} item={r} />)
            )}
          </TabsContent>

          <TabsContent value="hoje">
            {todayReviews.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 size={48} className="mx-auto mb-4 opacity-20" />
                <p>Tudo limpo por hoje. Descanse ou avance na teoria.</p>
              </div>
            ) : (
              todayReviews.map(r => <ReviewCard key={r.id} item={r} />)
            )}
          </TabsContent>

          <TabsContent value="proximas">
            {futureReviews.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarDays size={48} className="mx-auto mb-4 opacity-20" />
                <p>O futuro está vazio. Continue estudando!</p>
              </div>
            ) : (
              futureReviews.map(r => <ReviewCard key={r.id} item={r} />)
            )}
          </TabsContent>
        </div>
      </Tabs>

    </div>
  );
}
