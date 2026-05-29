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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Plus, Clock, Trash2, CheckCircle2, XCircle, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { sendPushNotification } from "@/lib/pushNotifications";
import { linhaInfo } from "@/lib/linhaColors";
import type { Database } from "@/integrations/supabase/types";

type EventoRow = Database["public"]["Tables"]["eventos"]["Row"];
type TipoEvento = Database["public"]["Enums"]["tipo_evento"];

const tipoLabel: Record<string, string> = {
  gira: "Gira", festa: "Festa", reuniao: "Reunião", desenvolvimento: "Desenvolvimento", outro: "Outro",
};

const linhaLabel: Record<string, string> = {
  caboclos: "🪶 Caboclos", pretos_velhos: "🕯️ Pretos Velhos", eres: "🍭 Erês",
  baianos: "🌴 Baianos", marinheiros: "⚓ Marinheiros", boiadeiros: "🐂 Boiadeiros",
  ciganos: "🔮 Ciganos", malandragem: "🎩 Malandragem", esquerda: "🔥 Esquerda",
};

const tipoCor: Record<string, string> = {
  gira: "bg-primary/20 text-primary", festa: "bg-accent/20 text-accent dark:text-accent",
  reuniao: "bg-blue-500/20 text-blue-500", desenvolvimento: "bg-green-500/20 text-green-600", outro: "bg-secondary text-muted-foreground",
};

// Brazil (São Paulo) is always UTC-3 (no DST since 2019)
const SAO_PAULO_OFFSET = "-03:00";

function getEventNotificationTitle(titulo: string, tipo: string, linha?: string | null) {
  if ((tipo === "gira" || tipo === "desenvolvimento") && linha) {
    return `GIRA DE ${linhaInfo(linha).label.toUpperCase()}`;
  }

  return titulo.trim() || "Novo evento";
}

function formatEventDateTime(dateIso: string) {
  const date = new Date(dateIso);
  const data = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
  const hora = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  return `${data} às ${hora}`;
}

export default function Calendario() {
  const { isAdmin, canManageEscalas, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedTipo, setSelectedTipo] = useState("gira");
  const [selectedLinha, setSelectedLinha] = useState("");
  const [showPresenca, setShowPresenca] = useState<string | null>(null);

  const { data: eventos, isLoading } = useQuery({
    queryKey: ["eventos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("eventos").select("*").order("data_inicio", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: confirmacoes } = useQuery({
    queryKey: ["confirmacoes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("confirmacoes_presenca").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: membros } = useQuery({
    queryKey: ["membros-presenca"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, nome, nome_espiritual");
      return data ?? [];
    },
  });

  const createEvento = useMutation({
    mutationFn: async (form: FormData) => {
      const dataStr = form.get("data") as string;
      const hora = form.get("hora") as string;
      const dataInicio = `${dataStr}T${hora}:00${SAO_PAULO_OFFSET}`;

      if ((selectedTipo === "gira" || selectedTipo === "desenvolvimento") && !selectedLinha) {
        throw new Error("Selecione a linha espiritual para a gira");
      }

      const titulo = (form.get("titulo") as string) || "Novo evento";
      const descricao = (form.get("descricao") as string) || null;

      const { error } = await supabase.from("eventos").insert({
        titulo,
        descricao,
        tipo: selectedTipo as TipoEvento,
        linha: selectedLinha || null,
        data_inicio: dataInicio,
        criado_por: user?.id,
      });
      if (error) throw error;

      return sendPushNotification({
        title: getEventNotificationTitle(titulo, selectedTipo, selectedLinha || null),
        body: `CONFIRME SUA PRESENÇA! ${formatEventDateTime(dataInicio)}`,
        url: "/calendario",
      });
    },
    onSuccess: (pushDelivered) => {
      queryClient.invalidateQueries({ queryKey: ["eventos"] });
      queryClient.invalidateQueries({ queryKey: ["proximo-evento"] });
      setOpen(false);
      setSelectedTipo("gira");
      setSelectedLinha("");
      toast({
        title: "Evento criado!",
        description: pushDelivered ? "Notificação enviada para todos." : "Evento criado, mas não consegui confirmar o envio da notificação.",
      });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteEvento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("eventos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos"] });
      queryClient.invalidateQueries({ queryKey: ["proximo-evento"] });
      toast({ title: "Evento excluído!" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const confirmarPresenca = useMutation({
    mutationFn: async ({ eventoId, status }: { eventoId: string; status: string }) => {
      const { error } = await supabase.from("confirmacoes_presenca").upsert({
        evento_id: eventoId,
        user_id: user!.id,
        status,
      }, { onConflict: "evento_id,user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["confirmacoes"] });
      toast({ title: "Presença atualizada!" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const showLinhaSelector = selectedTipo === "gira" || selectedTipo === "desenvolvimento";
  const now = new Date();
  const futuros = eventos?.filter((e) => new Date(e.data_inicio) >= now) ?? [];
  const passados = eventos?.filter((e) => new Date(e.data_inicio) < now) ?? [];

  const getMyConfirmacao = (eventoId: string) => {
    return confirmacoes?.find((c) => c.evento_id === eventoId && c.user_id === user?.id);
  };

  const getConfirmacoesByEvento = (eventoId: string) => {
    return confirmacoes?.filter((c) => c.evento_id === eventoId) ?? [];
  };

  const getNome = (id: string) => {
    const m = membros?.find((m) => m.user_id === id);
    return m?.nome_espiritual || m?.nome || "?";
  };

  const renderEvento = (e: EventoRow, isPast = false) => {
    const linha = e.linha;
    const isGira = e.tipo === "gira" || e.tipo === "desenvolvimento";
    const myConf = getMyConfirmacao(e.id);
    const confs = getConfirmacoesByEvento(e.id);
    const vaiCount = confs.filter((c) => c.status === "vai").length;
    const naoVaiCount = confs.filter((c) => c.status === "nao_vai").length;

    return (
      <Card key={e.id} className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex flex-wrap gap-1.5">
                <span className={`text-xs px-2 py-0.5 rounded-full ${tipoCor[e.tipo] ?? tipoCor.outro}`}>
                  {tipoLabel[e.tipo] ?? e.tipo}
                </span>
                {linha && (() => {
                  const linhaCfg = linhaInfo(linha);
                  return (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${linhaCfg.badge}`}>
                      {linhaCfg.emoji} {linhaCfg.label}
                    </span>
                  );
                })()}
              </div>
              <h3 className="font-display font-semibold mt-1">{e.titulo}</h3>
              {e.descricao && <p className="text-sm text-muted-foreground mt-1">{e.descricao}</p>}
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(e.data_inicio), "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
              </div>

              {/* Presence confirmation for all events */}
              {!isPast && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={myConf?.status === "vai" ? "default" : "outline"}
                      className="gap-1 h-7 text-xs"
                      onClick={() => confirmarPresenca.mutate({ eventoId: e.id, status: "vai" })}
                    >
                      <CheckCircle2 className="w-3 h-3" /> Vou
                    </Button>
                    <Button
                      size="sm"
                      variant={myConf?.status === "nao_vai" ? "destructive" : "outline"}
                      className="gap-1 h-7 text-xs"
                      onClick={() => confirmarPresenca.mutate({ eventoId: e.id, status: "nao_vai" })}
                    >
                      <XCircle className="w-3 h-3" /> Não vou
                    </Button>
                    <span className="text-xs text-muted-foreground ml-auto">
                      ✓ {vaiCount} · ✗ {naoVaiCount}
                    </span>
                  </div>

                  {/* Admin/Cambone Chefe: show who confirmed */}
                  {(isAdmin || canManageEscalas) && confs.length > 0 && (
                    <button
                      onClick={() => setShowPresenca(showPresenca === e.id ? null : e.id)}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <Users className="w-3 h-3" /> Ver confirmações ({confs.length})
                    </button>
                  )}
                  {showPresenca === e.id && (
                    <div className="bg-secondary rounded-lg p-2 space-y-1">
                      {confs.map((c) => (
                        <div key={c.id} className="flex items-center justify-between text-xs">
                          <span>{getNome(c.user_id)}</span>
                          <span className={c.status === "vai" ? "text-green-600 font-medium" : "text-destructive font-medium"}>
                            {c.status === "vai" ? "✓ Vai" : "✗ Não vai"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {isAdmin && (
              <Button
                size="icon"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => { if (confirm("Excluir este evento?")) deleteEvento.mutate(e.id); }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-xl font-bold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" /> Calendário
        </h1>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> Novo</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="font-display">Novo Evento</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createEvento.mutate(new FormData(e.currentTarget)); }} className="space-y-3">
                <div><Label>Título</Label><Input name="titulo" required className="bg-secondary" /></div>
                <div><Label>Tipo de Evento</Label>
                  <Select value={selectedTipo} onValueChange={setSelectedTipo}>
                    <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gira">Gira</SelectItem>
                      <SelectItem value="desenvolvimento">Desenvolvimento</SelectItem>
                      <SelectItem value="festa">Festa</SelectItem>
                      <SelectItem value="reuniao">Reunião</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {showLinhaSelector && (
                  <div><Label>Linha Espiritual</Label>
                    <Select value={selectedLinha} onValueChange={setSelectedLinha}>
                      <SelectTrigger className="bg-secondary"><SelectValue placeholder="Selecione a linha..." /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(linhaLabel).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Data</Label><Input name="data" type="date" required className="bg-secondary" /></div>
                  <div><Label>Horário</Label><Input name="hora" type="time" required className="bg-secondary" defaultValue="20:00" /></div>
                </div>
                <div><Label>Descrição (opcional)</Label><Textarea name="descricao" className="bg-secondary" /></div>
                <Button type="submit" className="w-full" disabled={createEvento.isPending}>
                  {createEvento.isPending ? "Criando..." : "Criar Evento"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-6">
          {futuros.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Próximos Eventos</h2>
              <div className="space-y-3">{futuros.map((e) => renderEvento(e))}</div>
            </div>
          )}
          {passados.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Eventos Passados</h2>
              <div className="space-y-3 opacity-60">{passados.slice(-5).map((e) => renderEvento(e, true))}</div>
            </div>
          )}
          {futuros.length === 0 && passados.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Nenhum evento cadastrado</p>
          )}
        </div>
      )}
    </div>
  );
}
