import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Bell, Plus, AlertTriangle, Star, Check, Trash2, Users, Shield, Sparkles } from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";

const prioridadeCor: Record<string, string> = {
  normal: "border-l-muted-foreground",
  importante: "border-l-gold",
  urgente: "border-l-destructive",
};

const demaisFuncoesLabel: Record<string, string> = {
  porteira: "🚪 Porteira",
  senha_chamar: "📢 Senha (Chamar Consulente)",
  senha_direcionar: "👉 Senha (Direcionar Consulente)",
  apoio_conga: "🕯️ Apoio Congá",
};

const funcoesLimpezaLabel: Record<string, string> = {
  cozinha: "🍳 Cozinha", banheiro: "🚿 Banheiro", espaco_kids: "🧸 Espaço Kids",
  conga: "🕯️ Congá", salao: "🏠 Salão", escada: "🪜 Escada", lixos: "🗑️ Lixos",
};

function startOfLocalDayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function Avisos() {
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: avisos, isLoading } = useQuery({
    queryKey: ["avisos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("avisos").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Get upcoming giras for today/tomorrow to show personal assignments
  const { data: proximasGiras } = useQuery({
    queryKey: ["proximas-giras-avisos"],
    queryFn: async () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 2);
      const { data } = await supabase
        .from("eventos")
        .select("*")
        .in("tipo", ["gira", "desenvolvimento"])
        .gte("data_inicio", now.toISOString())
        .lte("data_inicio", tomorrow.toISOString())
        .order("data_inicio");
      return data ?? [];
    },
  });

  const { data: meusCambones } = useQuery({
    queryKey: ["meus-cambones"],
    queryFn: async () => {
      const { data } = await supabase.from("cambones").select("*");
      return data ?? [];
    },
  });

  const { data: minhasFuncoes } = useQuery({
    queryKey: ["minhas-funcoes"],
    queryFn: async () => {
      const { data } = await supabase.from("funcoes_gira").select("*");
      return data ?? [];
    },
  });

  // Fetch escalas for personal limpeza cards
  const { data: minhasEscalas } = useQuery({
    queryKey: ["minhas-escalas-avisos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("escalas_limpeza")
        .select("*")
        .gte("data", new Date().toISOString().split("T")[0])
        .order("data", { ascending: true });
      return data ?? [];
    },
  });

  const { data: membros } = useQuery({
    queryKey: ["membros-avisos"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, nome, nome_espiritual");
      return data ?? [];
    },
  });

  const createAviso = useMutation({
    mutationFn: async (form: FormData) => {
      const titulo = form.get("titulo") as string;
      const conteudo = form.get("conteudo") as string;
      const prioridade = form.get("prioridade") as "normal" | "importante" | "urgente";
      const { error } = await supabase.from("avisos").insert({
        titulo, conteudo, prioridade, criado_por: user?.id,
      });
      if (error) throw error;

      // Send browser notification to all users with permission
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification(`Novo aviso ${prioridade === "urgente" ? "URGENTE" : prioridade === "importante" ? "IMPORTANTE" : ""}`, {
          body: titulo,
          icon: "/logo-tusva.jpg",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["avisos"] });
      queryClient.invalidateQueries({ queryKey: ["avisos-nao-lidos"] });
      setOpen(false);
      toast({ title: "Aviso publicado!" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteAviso = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("avisos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["avisos"] });
      queryClient.invalidateQueries({ queryKey: ["avisos-nao-lidos"] });
      toast({ title: "Aviso excluído!" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const marcarComoLido = useMutation({
    mutationFn: async (aviso: any) => {
      const newLidoPor = [...(aviso.lido_por || []), user?.id];
      const { error } = await supabase.from("avisos").update({ lido_por: newLidoPor }).eq("id", aviso.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["avisos"] });
      queryClient.invalidateQueries({ queryKey: ["avisos-nao-lidos"] });
    },
  });

  const getNome = (id: string) => {
    const m = membros?.find((m) => m.user_id === id);
    return m?.nome_espiritual || m?.nome?.split(" ")[0] || "?";
  };

  // Build personal assignment cards for upcoming giras
  const personalCards: { tipo: string; texto: string; giraTitle: string; giraDate: Date; icon: "cambone" | "funcao" | "limpeza" }[] = [];

  if (proximasGiras && user) {
    for (const gira of proximasGiras) {
      // Cambones
      const meuCambone = meusCambones?.find((c) => c.cambone_user_id === user.id && c.evento_id === gira.id);
      if (meuCambone) {
        personalCards.push({
          tipo: "cambone",
          texto: `Você irá cambonar ${getNome(meuCambone.medium_user_id)}`,
          giraTitle: gira.titulo,
          giraDate: new Date(gira.data_inicio),
          icon: "cambone",
        });
      }

      // Funções
      const minhasFuncoesGira = minhasFuncoes?.filter((f) => f.user_id === user.id && f.evento_id === gira.id) ?? [];
      for (const f of minhasFuncoesGira) {
        personalCards.push({
          tipo: "funcao",
          texto: `Você será ${demaisFuncoesLabel[f.funcao] || f.funcao}`,
          giraTitle: gira.titulo,
          giraDate: new Date(gira.data_inicio),
          icon: "funcao",
        });
      }
    }
  }

  // Escalas de limpeza for this user
  if (minhasEscalas && user) {
    const minhas = minhasEscalas.filter((e) => e.responsaveis.includes(user.id));
    for (const escala of minhas) {
      const escalaDate = new Date(escala.data + "T00:00:00");
      const diffDays = Math.ceil((escalaDate.getTime() - new Date().setHours(0,0,0,0)) / (1000*60*60*24));
      if (diffDays <= 7) {
        const funcaoStr = (escala as any).funcao ? (funcoesLimpezaLabel[(escala as any).funcao] || (escala as any).funcao) : "Limpeza geral";
        const tipoStr = (escala as any).tipo_escala === "gira" ? "Limpeza pós-gira" : "Limpeza fim de semana";
        personalCards.push({
          tipo: "limpeza",
          texto: `${tipoStr}: ${funcaoStr}`,
          giraTitle: escala.descricao || "",
          giraDate: escalaDate,
          icon: "limpeza",
        });
      }
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-xl font-bold flex items-center gap-2">
          <Bell className="w-5 h-5 text-gold" /> Avisos
        </h1>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> Novo</Button></DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle className="font-display">Novo Aviso</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createAviso.mutate(new FormData(e.currentTarget)); }} className="space-y-3">
                <div><Label>Título</Label><Input name="titulo" required className="bg-secondary" /></div>
                <div><Label>Conteúdo</Label><Textarea name="conteudo" required className="bg-secondary" rows={4} /></div>
                <div><Label>Prioridade</Label>
                  <Select name="prioridade" defaultValue="normal">
                    <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="importante">Importante</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={createAviso.isPending}>
                  {createAviso.isPending ? "Publicando..." : "Publicar Aviso"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Personal assignment cards */}
      {personalCards.length > 0 && (
        <div className="space-y-2 mb-6">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Suas atribuições</h2>
          {personalCards.map((card, i) => {
            const dateLabel = isToday(card.giraDate) ? "Hoje" : isTomorrow(card.giraDate) ? "Amanhã" : format(card.giraDate, "dd/MM");
            return (
              <Card key={i} className="bg-primary/5 border-primary/20">
                <CardContent className="p-3 flex items-center gap-3">
                  {card.icon === "cambone" ? <Users className="w-5 h-5 text-primary shrink-0" /> : 
                   card.icon === "funcao" ? <Shield className="w-5 h-5 text-primary shrink-0" /> :
                   <Sparkles className="w-5 h-5 text-primary shrink-0" />}
                  <div>
                    <p className="text-sm font-medium">{card.texto}</p>
                    <p className="text-xs text-muted-foreground">{card.giraTitle} — {dateLabel}{card.icon !== "limpeza" && ` às ${format(card.giraDate, "HH:mm")}`}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {avisos?.map((a) => {
            const lido = a.lido_por.includes(user?.id ?? "");
            return (
              <Card key={a.id} className={`bg-card border-border border-l-4 ${prioridadeCor[a.prioridade]} ${!lido ? "ring-1 ring-primary/20" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {a.prioridade === "urgente" && <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />}
                        {a.prioridade === "importante" && <Star className="w-4 h-4 text-gold shrink-0" />}
                        <h3 className="font-display font-semibold text-sm">{a.titulo}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.conteudo}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(a.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {!lido ? (
                        <Button size="sm" variant="ghost" className="text-xs gap-1 h-7 text-primary"
                          onClick={() => marcarComoLido.mutate(a)}>
                          <Check className="w-3 h-3" /> Lido
                        </Button>
                      ) : (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                      {isAdmin && (
                        <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive"
                          onClick={() => { if (confirm("Excluir este aviso?")) deleteAviso.mutate(a.id); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {(!avisos || avisos.length === 0) && (
            <p className="text-center text-muted-foreground py-8">Nenhum aviso publicado</p>
          )}
        </div>
      )}
    </div>
  );
}
