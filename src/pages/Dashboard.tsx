import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  ClipboardList,
  Bell,
  BookOpen,
  AlertTriangle,
  Star,
  DollarSign,
  Users,
  Shield,
  Package,
  HandHeart,
  Cake,
  Sparkles,
  Leaf,
} from "lucide-react";
import { format, differenceInSeconds } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { linhaInfo } from "@/lib/linhaColors";
import { UserAvatar } from "@/components/UserAvatar";
import { DashboardSkeleton } from "@/components/skeletons/LoadingSkeleton";

const tipoLabel: Record<string, string> = {
  gira: "Gira",
  festa: "Festa",
  reuniao: "Reunião",
  desenvolvimento: "Desenvolvimento",
  outro: "Evento",
};

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

function getSaudacao() {
  const h = new Date().getHours();
  if (h < 6) return { texto: "Boa madrugada", emoji: "🌙" };
  if (h < 12) return { texto: "Bom dia", emoji: "☀️" };
  if (h < 18) return { texto: "Boa tarde", emoji: "🌤️" };
  return { texto: "Boa noite", emoji: "🌙" };
}

function useCountdown(target?: Date | null) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(t);
  }, [target?.getTime()]);

  if (!target) return null;
  const total = differenceInSeconds(target, now);
  if (total <= 0) return { texto: "É hoje! ✨", isNow: true };
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (days > 0) return { texto: `Faltam ${days}d ${hours}h`, isNow: false };
  if (hours > 0) return { texto: `Faltam ${hours}h ${minutes}min`, isNow: false };
  return { texto: `Faltam ${minutes} minutos`, isNow: true };
}

export default function Dashboard() {
  const { profile, isAdmin, user, isLoading: authLoading } = useAuth();
  const todayLocal = toLocalDateString(new Date());
  const todayStartIso = startOfLocalDayIso();
  const saudacao = getSaudacao();

  const { data: proximoEvento, isLoading: loadingEvento } = useQuery({
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
      const { data } = await supabase
        .from("profiles")
        .select("user_id, nome, nome_espiritual, avatar_url, data_nascimento");
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

  const { data: firmezasAtivas } = useQuery({
    queryKey: ["dashboard-firmezas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("prayer_requests")
        .select("id")
        .gte("expires_at", new Date().toISOString());
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: banhosDoEvento } = useQuery({
    queryKey: ["banhos-do-evento", (proximoEvento as any)?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("ervas_banhos")
        .select("id, titulo")
        .eq("evento_id", (proximoEvento as any).id);
      return data ?? [];
    },
    enabled: !!proximoEvento,
  });

  const getMembro = (id: string) => membros?.find((m) => m.user_id === id);
  const getNome = (id: string) => {
    const m = getMembro(id);
    return m?.nome_espiritual || m?.nome || "Médium";
  };

  const avisosAtribuicoes = useMemo(() => {
    if (!user || !girasAbertas)
      return [] as { id: string; text: string; when: Date; kind: "cambone" | "funcao" }[];

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

  const aniversariantesMes = useMemo(() => {
    if (!membros) return [];
    const mesAtual = new Date().getMonth();
    const hoje = new Date().getDate();
    return (membros ?? [])
      .filter((m: any) => m.data_nascimento)
      .map((m: any) => {
        const [, mm, dd] = (m.data_nascimento as string).split("-").map(Number);
        return { ...m, mes: mm - 1, dia: dd };
      })
      .filter((m) => m.mes === mesAtual)
      .sort((a, b) => {
        const aFut = a.dia >= hoje ? 0 : 1;
        const bFut = b.dia >= hoje ? 0 : 1;
        if (aFut !== bFut) return aFut - bFut;
        return a.dia - b.dia;
      });
  }, [membros]);

  const totalAvisosDashboard = (avisosNaoLidos?.length ?? 0) + avisosAtribuicoes.length;

  const linha = (proximoEvento as any)?.linha as string | null;
  const linhaCfg = linhaInfo(linha);
  const eventDate = proximoEvento ? new Date(proximoEvento.data_inicio) : null;
  const countdown = useCountdown(eventDate);

  // Carousel de aniversariantes
  const [aniversIndex, setAniversIndex] = useState(0);
  useEffect(() => {
    if (aniversariantesMes.length <= 1) return;
    const t = setInterval(() => {
      setAniversIndex((i) => (i + 1) % aniversariantesMes.length);
    }, 4000);
    return () => clearInterval(t);
  }, [aniversariantesMes.length]);

  if (authLoading) return <DashboardSkeleton />;

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4 animate-fade-in-up">
      {/* Saudação */}
      <div className="flex items-center gap-3 mb-2">
        <UserAvatar
          name={profile?.nome}
          src={profile?.avatar_url}
          size="lg"
          ring={isAdmin ? "gold" : "vinho"}
        />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-lg sm:text-xl font-semibold leading-tight">
            {saudacao.texto}, {profile?.nome_espiritual || profile?.nome} {saudacao.emoji}
          </h1>
          <p className="text-[11px] text-muted-foreground tracking-wide uppercase mt-0.5">
            {isAdmin && <span className="text-gold font-semibold">✦ Mãe de Santo · </span>}
            Eparrey Iansã!
          </p>
        </div>
      </div>

      {/* Próximo Evento — HERO */}
      {loadingEvento ? (
        <div className="h-44 rounded-xl bg-gradient-to-r from-secondary via-muted to-secondary bg-[length:1000px_100%] animate-shimmer" />
      ) : proximoEvento ? (
        <Link to="/calendario" className="block group">
          <Card className="overflow-hidden border-0 shadow-elegant hover-lift relative">
            {/* Background gradient da linha */}
            <div className={`absolute inset-0 ${linhaCfg.gradient} opacity-95`} />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/35 via-transparent to-white/10" />
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gold/30 blur-3xl" />

            <CardContent className="relative p-5 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-3.5 h-3.5 opacity-80" />
                <span className="text-[10px] tracking-[0.25em] uppercase opacity-90">Próximo evento</span>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-4xl drop-shadow-md">{linhaCfg.emoji}</span>
                <div className="flex-1 min-w-0">
                  <h2 className="font-display text-2xl font-bold leading-tight drop-shadow-sm">
                    {proximoEvento.titulo}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm font-medium">
                      {tipoLabel[proximoEvento.tipo] ?? proximoEvento.tipo}
                    </span>
                    {linha && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm font-medium">
                        {linhaCfg.label}
                      </span>
                    )}
                    {(banhosDoEvento?.length ?? 0) > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-gold text-vinho font-semibold inline-flex items-center gap-1 shadow-sm">
                        <Leaf className="w-3 h-3" />
                        Banho disponível
                      </span>
                    )}
                  </div>
                  <p className="text-sm mt-2 opacity-95">
                    {format(eventDate!, "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                  </p>
                  {countdown && (
                    <div
                      className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-gold text-vinho font-semibold text-sm shadow-md ${
                        countdown.isNow ? "animate-pulse-gold" : ""
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {countdown.texto}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ) : (
        <Card className="bg-card border-border shadow-card gold-hairline">
          <CardContent className="p-6 text-center">
            <Calendar className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum evento agendado</p>
          </CardContent>
        </Card>
      )}

      {/* Atalhos rápidos */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { to: "/avisos", icon: Bell, label: "Avisos", count: totalAvisosDashboard, color: "text-gold" },
          { to: "/firmezas", icon: HandHeart, label: "Firmezas", count: firmezasAtivas?.length ?? 0, color: "text-primary" },
          { to: "/escalas", icon: ClipboardList, label: "Escalas", count: 0, color: "text-primary" },
          { to: "/financeiro", icon: DollarSign, label: "Financeiro", count: 0, color: "text-gold" },
          { to: "/estudos", icon: BookOpen, label: "Estudos", count: 0, color: "text-primary" },
          { to: "/reposicao", icon: Package, label: "Reposição", count: 0, color: "text-gold" },
        ].map((s, i) => (
          <Link
            key={s.to}
            to={s.to}
            className="group relative bg-card border border-border rounded-xl p-3 shadow-card hover-lift gold-hairline overflow-hidden animate-fade-in-up"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex flex-col items-start gap-1.5">
              <div className={`w-8 h-8 rounded-full bg-gradient-gold/10 flex items-center justify-center ${s.color}`}>
                <s.icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold leading-tight">{s.label}</span>
            </div>
            {s.count > 0 && (
              <span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-gradient-vinho text-white flex items-center justify-center shadow-md">
                {s.count}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Aniversariantes do mês */}
      {aniversariantesMes.length > 0 && (
        <Card className="bg-card border-border shadow-card gold-hairline overflow-hidden animate-fade-in-up">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-gradient-gold flex items-center justify-center">
                <Cake className="w-4 h-4 text-vinho" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-sm">Aniversariantes do mês</h3>
                <p className="text-[11px] text-muted-foreground">Salve a vida dos irmãos! 🎉</p>
              </div>
            </div>
            <div className="relative h-12 overflow-hidden">
              {aniversariantesMes.map((m: any, i: number) => {
                const active = i === aniversIndex % aniversariantesMes.length;
                return (
                  <div
                    key={m.user_id}
                    className={`absolute inset-0 flex items-center gap-2.5 transition-all duration-500 ${
                      active ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none"
                    }`}
                  >
                    <UserAvatar name={m.nome_espiritual || m.nome} src={m.avatar_url} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.nome_espiritual || m.nome}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gold/15 text-gold-foreground border border-gold/30 font-semibold">
                      Dia {String(m.dia).padStart(2, "0")}
                    </span>
                  </div>
                );
              })}
            </div>
            {aniversariantesMes.length > 1 && (
              <div className="flex justify-center gap-1 mt-2">
                {aniversariantesMes.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setAniversIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === aniversIndex % aniversariantesMes.length ? "w-4 bg-gold" : "w-1.5 bg-muted-foreground/30"
                    }`}
                    aria-label={`Aniversariante ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Avisos */}
      <Link to="/avisos" className="block">
        <Card className="bg-card border-border shadow-card hover-lift gold-hairline">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-4 h-4 text-gold" />
              <span className="font-display text-sm font-semibold">Avisos</span>
              {totalAvisosDashboard > 0 && (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-gradient-vinho text-white font-bold">
                  {totalAvisosDashboard} novo(s)
                </span>
              )}
            </div>
            {avisosAtribuicoes.length > 0 && (
              <div className="space-y-2 mb-2">
                {avisosAtribuicoes.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-start gap-2">
                    {item.kind === "cambone" ? (
                      <Users className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    ) : (
                      <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{item.text}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {format(item.when, "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {avisosNaoLidos && avisosNaoLidos.length > 0 ? (
              <div className="space-y-2">
                {avisosNaoLidos.map((a) => (
                  <div key={a.id} className="flex items-start gap-2">
                    {a.prioridade === "urgente" && (
                      <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                    )}
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

      {/* Minha próxima limpeza */}
      <Link to="/escalas" className="block">
        <Card className="bg-card border-border shadow-card hover-lift gold-hairline">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              <span className="font-display text-sm font-semibold">Minha Próxima Limpeza</span>
            </div>
            {minhaEscala ? (
              <p className="text-sm">
                <span className="font-medium">
                  {format(new Date(minhaEscala.data + "T00:00:00"), "dd 'de' MMMM", { locale: ptBR })}
                </span>
                {minhaEscala.descricao && (
                  <span className="text-muted-foreground"> — {minhaEscala.descricao}</span>
                )}
                {minhaEscala.funcao && <span className="text-muted-foreground"> ({minhaEscala.funcao})</span>}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma limpeza agendada para você</p>
            )}
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
