import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, ClipboardList, Bell, BookOpen, AlertTriangle, Star, DollarSign, Users, Shield, Package } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";

const tipoLabel: Record<string, string> = { gira: "Gira", festa: "Festa", reuniao: "Reunião", desenvolvimento: "Desenvolvimento", caboclos: "🪶 Caboclos", pretos_velhos: "🕯️ Pretos Velhos", eres: "🍭 Erês", baianos: "🌴 Baianos", marinheiros: "⚓ Marinheiros", boiadeiros: "🐂 Boiadeiros", ciganos: "🔮 Ciganos", malandragem: "🎩 Malandragem", esquerda: "🔥 Esquerda", outro: "Evento" };

const demaisFuncoesLabel: Record<string, string> = {
  porteira: "Porteira",
  senha_chamar: "Senha (Chamar Consulente)",
  senha_direcionar: "Senha (Direcionar Consulente)",
  apoio_conga: "Apoio Congá",
};

function toLocalDateString(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfLocalDayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function Dashboard() {
  const { profile, isAdmin, user } = useAuth();
  const todayLocal = toLocalDateString(new Date());
  const todayStartIso = startOfLocalDayIso();

  const { data: proximoEvento } = useQuery({
    queryKey: ["proximo-evento", todayStartIso],
    queryFn: async () => {
      const { data } = await supabase
        .from("eventos")
        .select("*")
        .gte("data_inicio", todayStartIso)
        .order("data_inicio", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: avisosNaoLidos } = useQuery({
    queryKey: ["avisos-nao-lidos", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("avisos").select("*").order("created_at", { ascending: false }).limit(3);
      return data?.filter((a) => !a.lido_por.includes(user?.id ?? "")) ?? [];
    },
    enabled: !!user,
  });

  const { data: minhaEscala } = useQuery({
    queryKey: ["minha-escala", user?.id, todayLocal],
    queryFn: async () => {
      const { data } = await supabase
        .from("escalas_limpeza")
        .select("*")
        .gte("data", todayLocal)
        .order("data", { ascending: true });
      return data?.find((e) => e.responsaveis.includes(user?.id ?? "")) ?? null;
    },
    enabled: !!user,
  });

  const { data: membros } = useQuery({
    queryKey: ["membros-dash"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, nome, nome_espiritual");
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: girasAbertas } = useQuery({
    queryKey: ["giras-dashboard-avisos", todayStartIso],
    queryFn: async () => {
      const { data } = await supabase
        .from("eventos")
        .select("*")
        .in("tipo", ["gira", "desenvolvimento"])
        .gte("data_inicio", todayStartIso)
        .order("data_inicio", { ascending: true });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: meusCambones } = useQuery({
    queryKey: ["dashboard-meus-cambones", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("cambones").select("*").eq("cambone_user_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: minhasFuncoes } = useQuery({
    queryKey: ["dashboard-minhas-funcoes", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("funcoes_gira").select("*").eq("user_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const getNome = (userId: string) => {
    const m = membros?.find((p) => p.user_id === userId);
    return m?.nome_espiritual || m?.nome?.split(" ")[0] || "Médium";
  };

  const avisosAtribuicoes = useMemo(() => {
    if (!user || !girasAbertas) return [] as { id: string; text: string; when: Date; kind: "cambone" | "funcao" }[];

    const byEvento = new Map(girasAbertas.map((g) => [g.id, g]));
    const cards: { id: string; text: string; when: Date; kind: "cambone" | "funcao" }[] = [];

    for (const c of meusCambones ?? []) {
      const evento = byEvento.get(c.evento_id);
      if (!evento) continue;
      cards.push({
        id: `c-${c.id}`,
        text: `Você irá cambonar ${getNome(c.medium_user_id)}`,
        when: new Date(evento.data_inicio),
        kind: "cambone",
      });
    }

    for (const f of minhasFuncoes ?? []) {
      const evento = byEvento.get(f.evento_id);
      if (!evento) continue;
      cards.push({
        id: `f-${f.id}`,
        text: `Você está escalado em ${demaisFuncoesLabel[f.funcao] ?? f.funcao}`,
        when: new Date(evento.data_inicio),
        kind: "funcao",
      });
    }

    return cards.sort((a, b) => a.when.getTime() - b.when.getTime());
  }, [user, girasAbertas, meusCambones, minhasFuncoes, membros]);

  const totalAvisosDashboard = (avisosNaoLidos?.length ?? 0) + avisosAtribuicoes.length;

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <img src="/logo-tusva.jpg" alt="TUSVA" className="w-12 h-12 rounded-full object-cover shadow-md shadow-primary/20" loading="eager" />
        <div>
          <h1 className="font-display text-lg font-semibold">
            Axé, {profile?.nome_espiritual || profile?.nome?.split(" ")[0]}!
          </h1>
          <p className="text-xs text-muted-foreground">
            {isAdmin && <span className="text-gold font-medium">✦ Administrador(a) </span>}
            Bem-vindo(a) ao TUSVA
          </p>
        </div>
      </div>

      <Link to="/calendario">
        <Card className="bg-card border-border hover:border-primary/40 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="w-4 h-4 text-primary" />
              Próximo Evento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {proximoEvento ? (
              <div>
                <p className="font-display text-base font-semibold">{proximoEvento.titulo}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                    {tipoLabel[proximoEvento.tipo] ?? proximoEvento.tipo}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(proximoEvento.data_inicio), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum evento agendado</p>
            )}
          </CardContent>
        </Card>
      </Link>

      <Link to="/avisos">
        <Card className="bg-card border-border hover:border-gold/40 transition-colors mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Bell className="w-4 h-4 text-gold" />
              Avisos
              {totalAvisosDashboard > 0 && (
                <span className="ml-auto text-xs bg-gold text-gold-foreground px-2 py-0.5 rounded-full font-bold">
                  {totalAvisosDashboard} novo(s)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {avisosAtribuicoes.length > 0 && (
              <div className="space-y-2 mb-2">
                {avisosAtribuicoes.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-start gap-2">
                    {item.kind === "cambone" ? <Users className="w-4 h-4 text-primary mt-0.5 shrink-0" /> : <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />}
                    <div>
                      <p className="text-sm font-medium">{item.text}</p>
                      <p className="text-xs text-muted-foreground">{format(item.when, "dd/MM 'às' HH:mm", { locale: ptBR })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {avisosNaoLidos && avisosNaoLidos.length > 0 ? (
              <div className="space-y-2">
                {avisosNaoLidos.map((a) => (
                  <div key={a.id} className="flex items-start gap-2">
                    {a.prioridade === "urgente" && <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />}
                    {a.prioridade === "importante" && <Star className="w-4 h-4 text-gold mt-0.5 shrink-0" />}
                    <div>
                      <p className="text-sm font-medium">{a.titulo}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{a.conteudo}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : avisosAtribuicoes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum aviso novo</p>
            ) : null}
          </CardContent>
        </Card>
      </Link>

      <Link to="/escalas">
        <Card className="bg-card border-border hover:border-primary/40 transition-colors mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <ClipboardList className="w-4 h-4 text-primary" />
              Minha Próxima Limpeza
            </CardTitle>
          </CardHeader>
          <CardContent>
            {minhaEscala ? (
              <p className="text-sm">
                <span className="font-medium">{format(new Date(minhaEscala.data + "T00:00:00"), "dd 'de' MMMM", { locale: ptBR })}</span>
                {minhaEscala.descricao && <span className="text-muted-foreground"> — {minhaEscala.descricao}</span>}
                {minhaEscala.funcao && <span className="text-muted-foreground"> ({minhaEscala.funcao})</span>}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma limpeza agendada para você</p>
            )}
          </CardContent>
        </Card>
      </Link>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <Link to="/estudos" className="flex items-center gap-2 p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium">Estudos</span>
        </Link>
        <Link to="/financeiro" className="flex items-center gap-2 p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
          <DollarSign className="w-5 h-5 text-accent" />
          <span className="text-sm font-medium">Financeiro</span>
        </Link>
        <Link to="/escalas" className="flex items-center gap-2 p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
          <ClipboardList className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium">Escalas</span>
        </Link>
        <Link to="/calendario" className="flex items-center gap-2 p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
          <Calendar className="w-5 h-5 text-accent" />
          <span className="text-sm font-medium">Calendário</span>
        </Link>
        <Link to="/reposicao" className="flex items-center gap-2 p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors col-span-2">
          <Package className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium">Reposição</span>
        </Link>
      </div>
    </div>
  );
}