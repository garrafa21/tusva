import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, ClipboardList, Bell, BookOpen, AlertTriangle, Star, Sparkles, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { profile, isAdmin, user } = useAuth();

  const { data: proximoEvento } = useQuery({
    queryKey: ["proximo-evento"],
    queryFn: async () => {
      const { data } = await supabase
        .from("eventos")
        .select("*")
        .gte("data_inicio", new Date().toISOString())
        .order("data_inicio", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: avisosNaoLidos } = useQuery({
    queryKey: ["avisos-nao-lidos"],
    queryFn: async () => {
      const { data } = await supabase.from("avisos").select("*").order("created_at", { ascending: false }).limit(3);
      return data?.filter((a) => !a.lido_por.includes(user?.id ?? "")) ?? [];
    },
  });

  const { data: minhaEscala } = useQuery({
    queryKey: ["minha-escala"],
    queryFn: async () => {
      const { data } = await supabase
        .from("escalas_limpeza")
        .select("*")
        .gte("data", new Date().toISOString().split("T")[0])
        .order("data", { ascending: true })
        .limit(1);
      return data?.find((e) => e.responsaveis.includes(user?.id ?? "")) ?? null;
    },
  });

  const tipoLabel: Record<string, string> = { gira: "Gira", festa: "Festa", reuniao: "Reunião", desenvolvimento: "Desenvolvimento", outro: "Evento" };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      {/* Greeting */}
      <div className="flex items-center gap-3 mb-6">
        <img src="/logo-tusva.jpg" alt="TUSVA" className="w-12 h-12 rounded-full object-cover shadow-md shadow-primary/20" />
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

      {/* Próximo evento */}
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

      {/* Avisos */}
      <Link to="/avisos">
        <Card className="bg-card border-border hover:border-gold/40 transition-colors mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Bell className="w-4 h-4 text-gold" />
              Avisos
              {(avisosNaoLidos?.length ?? 0) > 0 && (
                <span className="ml-auto text-xs bg-gold text-gold-foreground px-2 py-0.5 rounded-full font-bold">
                  {avisosNaoLidos?.length} novo(s)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
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
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum aviso novo</p>
            )}
          </CardContent>
        </Card>
      </Link>

      {/* Escala */}
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
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma limpeza agendada para você</p>
            )}
          </CardContent>
        </Card>
      </Link>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <Link to="/estudos" className="flex items-center gap-2 p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
          <BookOpen className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium">Estudos</span>
        </Link>
        <Link to="/calendario" className="flex items-center gap-2 p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
          <Calendar className="w-5 h-5 text-gold" />
          <span className="text-sm font-medium">Calendário</span>
        </Link>
      </div>
    </div>
  );
}
