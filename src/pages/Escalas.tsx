import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, Plus, CheckCircle2, Trash2, Sparkles, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const funcoesGira = [
  { value: "cozinha", label: "🍳 Cozinha" },
  { value: "banheiro", label: "🚿 Banheiro" },
  { value: "espaco_kids", label: "🧸 Espaço Kids" },
  { value: "conga", label: "🕯️ Congá" },
  { value: "salao", label: "🏠 Salão" },
  { value: "escada", label: "🪜 Escada" },
  { value: "lixos", label: "🗑️ Lixos" },
];

export default function Escalas() {
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openGira, setOpenGira] = useState(false);
  const [openFds, setOpenFds] = useState(false);
  const [selectedTab, setSelectedTab] = useState("gira");

  // For gira: one member per function
  const [giraAssignments, setGiraAssignments] = useState<Record<string, string>>({});

  // For weekend: multiple members
  const [fdsMembers, setFdsMembers] = useState<string[]>([]);

  const { data: escalas, isLoading } = useQuery({
    queryKey: ["escalas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("escalas_limpeza").select("*").order("data", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: membros } = useQuery({
    queryKey: ["membros"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, nome, nome_espiritual");
      if (error) throw error;
      return data;
    },
  });

  const createEscalaGira = useMutation({
    mutationFn: async (form: FormData) => {
      const data = form.get("data") as string;
      const entries = Object.entries(giraAssignments).filter(([, v]) => v);
      if (entries.length === 0) throw new Error("Selecione pelo menos um responsável");

      const inserts = entries.map(([funcao, userId]) => ({
        data,
        tipo_escala: "gira",
        funcao,
        responsaveis: [userId],
        criado_por: user?.id,
        descricao: null,
      }));

      const { error } = await supabase.from("escalas_limpeza").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalas"] });
      setOpenGira(false);
      setGiraAssignments({});
      toast({ title: "Escala de gira criada!" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const createEscalaFds = useMutation({
    mutationFn: async (form: FormData) => {
      const data = form.get("data") as string;
      if (fdsMembers.length === 0) throw new Error("Selecione os filhos");

      const { error } = await supabase.from("escalas_limpeza").insert({
        data,
        tipo_escala: "fim_de_semana",
        funcao: null,
        responsaveis: fdsMembers,
        criado_por: user?.id,
        descricao: null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalas"] });
      setOpenFds(false);
      setFdsMembers([]);
      toast({ title: "Escala de fim de semana criada!" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteEscala = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("escalas_limpeza").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalas"] });
      toast({ title: "Escala excluída!" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const getNome = (id: string) => {
    const m = membros?.find((m) => m.user_id === id);
    return m?.nome_espiritual || m?.nome?.split(" ")[0] || "?";
  };

  const getNomes = (ids: string[]) => ids.map(getNome).join(", ");

  const hoje = new Date().toISOString().split("T")[0];

  const escalasGira = escalas?.filter((e) => (e as any).tipo_escala === "gira") ?? [];
  const escalasFds = escalas?.filter((e) => (e as any).tipo_escala === "fim_de_semana" || !(e as any).tipo_escala) ?? [];

  // Group gira escalas by date
  const giraByDate = escalasGira.reduce<Record<string, typeof escalasGira>>((acc, e) => {
    if (!acc[e.data]) acc[e.data] = [];
    acc[e.data].push(e);
    return acc;
  }, {});

  const toggleFdsMember = (userId: string) => {
    setFdsMembers((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-xl font-bold flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" /> Escalas de Limpeza
        </h1>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="w-full mb-4">
          <TabsTrigger value="gira" className="flex-1 gap-1"><Sparkles className="w-3.5 h-3.5" /> Por Gira</TabsTrigger>
          <TabsTrigger value="fds" className="flex-1 gap-1"><CalendarDays className="w-3.5 h-3.5" /> Fim de Semana</TabsTrigger>
        </TabsList>

        {/* ========== ESCALA POR GIRA ========== */}
        <TabsContent value="gira">
          {isAdmin && (
            <Dialog open={openGira} onOpenChange={setOpenGira}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1 mb-4 w-full"><Plus className="w-4 h-4" /> Nova Escala de Gira</Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="font-display">Escala de Gira</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createEscalaGira.mutate(new FormData(e.currentTarget)); }} className="space-y-3">
                  <div><Label>Data da Gira</Label><Input name="data" type="date" required className="bg-secondary" /></div>
                  <div className="space-y-3">
                    <Label>Atribuir funções</Label>
                    {funcoesGira.map((f) => (
                      <div key={f.value} className="flex items-center gap-2">
                        <span className="text-sm w-28 shrink-0">{f.label}</span>
                        <Select value={giraAssignments[f.value] || ""} onValueChange={(v) => setGiraAssignments((prev) => ({ ...prev, [f.value]: v }))}>
                          <SelectTrigger className="bg-secondary flex-1"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                          <SelectContent>
                            {membros?.map((m) => (
                              <SelectItem key={m.user_id} value={m.user_id}>{m.nome_espiritual || m.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                  <Button type="submit" className="w-full" disabled={createEscalaGira.isPending}>
                    {createEscalaGira.isPending ? "Criando..." : "Criar Escala"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="space-y-4">
              {Object.entries(giraByDate).map(([data, items]) => {
                const isPast = data < hoje;
                const isMyEscala = items.some((e) => e.responsaveis.includes(user?.id ?? ""));
                return (
                  <Card key={data} className={`bg-card border-border ${isPast ? "opacity-50" : ""} ${isMyEscala && !isPast ? "border-primary/40" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-display font-semibold text-sm">
                          {format(new Date(data + "T00:00:00"), "dd 'de' MMMM, EEEE", { locale: ptBR })}
                        </p>
                        {isAdmin && (
                          <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive h-7 w-7"
                            onClick={() => { if (confirm("Excluir toda a escala desta gira?")) items.forEach((e) => deleteEscala.mutate(e.id)); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <div className="space-y-1">
                        {items.map((e) => {
                          const funcaoLabel = funcoesGira.find((f) => f.value === (e as any).funcao)?.label || (e as any).funcao;
                          const isMe = e.responsaveis.includes(user?.id ?? "");
                          return (
                            <div key={e.id} className={`flex items-center justify-between text-sm ${isMe ? "text-primary font-medium" : "text-muted-foreground"}`}>
                              <span>{funcaoLabel}</span>
                              <span className="flex items-center gap-1">
                                {getNomes(e.responsaveis)}
                                {isMe && <CheckCircle2 className="w-3 h-3 text-primary" />}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {escalasGira.length === 0 && (
                <p className="text-center text-muted-foreground py-8">Nenhuma escala de gira cadastrada</p>
              )}
            </div>
          )}
        </TabsContent>

        {/* ========== ESCALA FIM DE SEMANA ========== */}
        <TabsContent value="fds">
          {isAdmin && (
            <Dialog open={openFds} onOpenChange={setOpenFds}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1 mb-4 w-full"><Plus className="w-4 h-4" /> Nova Escala de Fim de Semana</Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="font-display">Limpeza de Fim de Semana</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createEscalaFds.mutate(new FormData(e.currentTarget)); }} className="space-y-3">
                  <div><Label>Data</Label><Input name="data" type="date" required className="bg-secondary" /></div>
                  <div>
                    <Label>Filhos responsáveis</Label>
                    <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                      {membros?.map((m) => (
                        <label key={m.user_id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={fdsMembers.includes(m.user_id)}
                            onChange={() => toggleFdsMember(m.user_id)}
                            className="rounded border-border"
                          />
                          {m.nome_espiritual || m.nome}
                        </label>
                      ))}
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={createEscalaFds.isPending || fdsMembers.length === 0}>
                    {createEscalaFds.isPending ? "Criando..." : "Criar Escala"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="space-y-3">
              {escalasFds.map((e) => {
                const isPast = e.data < hoje;
                const isMe = e.responsaveis.includes(user?.id ?? "");
                return (
                  <Card key={e.id} className={`bg-card border-border ${isPast ? "opacity-50" : ""} ${isMe && !isPast ? "border-primary/40" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-display font-semibold text-sm">
                            {format(new Date(e.data + "T00:00:00"), "dd 'de' MMMM, EEEE", { locale: ptBR })}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Responsáveis: <span className="text-foreground">{getNomes(e.responsaveis)}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isMe && !isPast && (
                            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Você
                            </span>
                          )}
                          {isAdmin && (
                            <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive"
                              onClick={() => { if (confirm("Excluir esta escala?")) deleteEscala.mutate(e.id); }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {escalasFds.length === 0 && (
                <p className="text-center text-muted-foreground py-8">Nenhuma escala de fim de semana cadastrada</p>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
