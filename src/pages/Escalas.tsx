import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, Plus, CheckCircle2, Trash2, Sparkles, CalendarDays, Users, Shield } from "lucide-react";
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

const demaisFuncoes = [
  { value: "porteira", label: "🚪 Porteira" },
  { value: "senha_chamar", label: "📢 Senha (Chamar Consulente)" },
  { value: "senha_direcionar", label: "👉 Senha (Direcionar Consulente)" },
  { value: "apoio_conga", label: "🕯️ Apoio Congá" },
];

const linhaLabel: Record<string, string> = {
  caboclos: "🪶 Caboclos", pretos_velhos: "🕯️ Pretos Velhos", eres: "🍭 Erês",
  baianos: "🌴 Baianos", marinheiros: "⚓ Marinheiros", boiadeiros: "🐂 Boiadeiros",
  ciganos: "🔮 Ciganos", malandragem: "🎩 Malandragem", esquerda: "🔥 Esquerda",
};

export default function Escalas() {
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("gira");
  const [openGira, setOpenGira] = useState(false);
  const [openFds, setOpenFds] = useState(false);
  const [openCambone, setOpenCambone] = useState(false);
  const [openFuncoes, setOpenFuncoes] = useState(false);

  // Gira assignments
  const [selectedGiraId, setSelectedGiraId] = useState("");
  const [giraAssignments, setGiraAssignments] = useState<Record<string, string>>({});
  const [fdsMembers, setFdsMembers] = useState<string[]>([]);

  // Cambone assignments
  const [camboneGiraId, setCamboneGiraId] = useState("");
  const [camboneAssignments, setCamboneAssignments] = useState<Record<string, string>>({});
  const [selectedMediums, setSelectedMediums] = useState<string[]>([]);

  // Demais funções
  const [funcoesGiraId, setFuncoesGiraId] = useState("");
  const [funcoesAssignments, setFuncoesAssignments] = useState<Record<string, string>>({});

  const hoje = new Date().toISOString().split("T")[0];

  // Queries
  const { data: giras } = useQuery({
    queryKey: ["giras-futuras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eventos")
        .select("*")
        .in("tipo", ["gira", "desenvolvimento"])
        .gte("data_inicio", new Date().toISOString())
        .order("data_inicio", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

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

  const { data: cambones } = useQuery({
    queryKey: ["cambones"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cambones").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: funcoesGiraData } = useQuery({
    queryKey: ["funcoes-gira"],
    queryFn: async () => {
      const { data, error } = await supabase.from("funcoes_gira").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  // Mutations
  const createEscalaGira = useMutation({
    mutationFn: async () => {
      if (!selectedGiraId) throw new Error("Selecione uma gira");
      const gira = giras?.find((g) => g.id === selectedGiraId);
      if (!gira) throw new Error("Gira não encontrada");
      const entries = Object.entries(giraAssignments).filter(([, v]) => v);
      if (entries.length === 0) throw new Error("Selecione pelo menos um responsável");

      const dataStr = gira.data_inicio.split("T")[0];
      const inserts = entries.map(([funcao, userId]) => ({
        data: dataStr,
        tipo_escala: "gira",
        funcao,
        responsaveis: [userId],
        criado_por: user?.id,
        descricao: gira.titulo,
      }));

      const { error } = await supabase.from("escalas_limpeza").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalas"] });
      setOpenGira(false);
      setGiraAssignments({});
      setSelectedGiraId("");
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

  const createCambones = useMutation({
    mutationFn: async () => {
      if (!camboneGiraId) throw new Error("Selecione uma gira");
      const entries = Object.entries(camboneAssignments).filter(([, v]) => v);
      if (entries.length === 0) throw new Error("Atribua pelo menos um cambone");
      const inserts = entries.map(([mediumId, camboneId]) => ({
        evento_id: camboneGiraId,
        medium_user_id: mediumId,
        cambone_user_id: camboneId,
      }));
      const { error } = await supabase.from("cambones").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cambones"] });
      setOpenCambone(false);
      setCamboneAssignments({});
      setSelectedMediums([]);
      setCamboneGiraId("");
      toast({ title: "Cambones atribuídos!" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const createFuncoesGira = useMutation({
    mutationFn: async () => {
      if (!funcoesGiraId) throw new Error("Selecione uma gira");
      const entries = Object.entries(funcoesAssignments).filter(([, v]) => v);
      if (entries.length === 0) throw new Error("Atribua pelo menos uma função");
      const inserts = entries.map(([funcao, userId]) => ({
        evento_id: funcoesGiraId,
        funcao,
        user_id: userId,
      }));
      const { error } = await supabase.from("funcoes_gira").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funcoes-gira"] });
      setOpenFuncoes(false);
      setFuncoesAssignments({});
      setFuncoesGiraId("");
      toast({ title: "Funções atribuídas!" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteEscala = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("escalas_limpeza").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["escalas"] }); toast({ title: "Excluído!" }); },
  });

  const deleteCambone = useMutation({
    mutationFn: async (eventoId: string) => {
      const { error } = await supabase.from("cambones").delete().eq("evento_id", eventoId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["cambones"] }); toast({ title: "Cambones excluídos!" }); },
  });

  const deleteFuncaoGira = useMutation({
    mutationFn: async (eventoId: string) => {
      const { error } = await supabase.from("funcoes_gira").delete().eq("evento_id", eventoId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["funcoes-gira"] }); toast({ title: "Funções excluídas!" }); },
  });

  const getNome = (id: string) => {
    const m = membros?.find((m) => m.user_id === id);
    return m?.nome_espiritual || m?.nome?.split(" ")[0] || "?";
  };

  const getGiraLabel = (gira: any) => {
    const linha = gira.linha ? ` — ${linhaLabel[gira.linha] || gira.linha}` : "";
    return `${gira.titulo}${linha} (${format(new Date(gira.data_inicio), "dd/MM", { locale: ptBR })})`;
  };

  const escalasGira = escalas?.filter((e) => (e as any).tipo_escala === "gira") ?? [];
  const escalasFds = escalas?.filter((e) => (e as any).tipo_escala === "fim_de_semana" || !(e as any).tipo_escala) ?? [];

  // Group gira escalas by date
  const giraByDate = escalasGira.reduce<Record<string, typeof escalasGira>>((acc, e) => {
    if (!acc[e.data]) acc[e.data] = [];
    acc[e.data].push(e);
    return acc;
  }, {});

  // Group cambones by evento
  const cambonesByEvento = (cambones ?? []).reduce<Record<string, typeof cambones>>((acc, c) => {
    if (!acc[c.evento_id]) acc[c.evento_id] = [];
    acc[c.evento_id].push(c);
    return acc;
  }, {});

  // Group funcoes by evento
  const funcoesByEvento = (funcoesGiraData ?? []).reduce<Record<string, typeof funcoesGiraData>>((acc, f) => {
    if (!acc[f.evento_id]) acc[f.evento_id] = [];
    acc[f.evento_id].push(f);
    return acc;
  }, {});

  const toggleFdsMember = (userId: string) => {
    setFdsMembers((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);
  };

  const toggleMedium = (userId: string) => {
    setSelectedMediums((prev) => {
      if (prev.includes(userId)) {
        const newAssign = { ...camboneAssignments };
        delete newAssign[userId];
        setCamboneAssignments(newAssign);
        return prev.filter((id) => id !== userId);
      }
      return [...prev, userId];
    });
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-xl font-bold flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" /> Escalas
        </h1>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="w-full mb-4 h-auto flex-wrap">
          <TabsTrigger value="gira" className="flex-1 gap-1 text-xs"><Sparkles className="w-3 h-3" /> Limpeza Gira</TabsTrigger>
          <TabsTrigger value="fds" className="flex-1 gap-1 text-xs"><CalendarDays className="w-3 h-3" /> Fim de Semana</TabsTrigger>
          <TabsTrigger value="cambones" className="flex-1 gap-1 text-xs"><Users className="w-3 h-3" /> Cambones</TabsTrigger>
          <TabsTrigger value="funcoes" className="flex-1 gap-1 text-xs"><Shield className="w-3 h-3" /> Funções</TabsTrigger>
        </TabsList>

        {/* ========== LIMPEZA POR GIRA ========== */}
        <TabsContent value="gira">
          {isAdmin && (
            <Dialog open={openGira} onOpenChange={setOpenGira}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1 mb-4 w-full"><Plus className="w-4 h-4" /> Nova Escala de Gira</Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="font-display">Escala de Limpeza — Gira</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Selecione a Gira</Label>
                    <Select value={selectedGiraId} onValueChange={setSelectedGiraId}>
                      <SelectTrigger className="bg-secondary"><SelectValue placeholder="Escolha uma gira..." /></SelectTrigger>
                      <SelectContent>
                        {giras && giras.length > 0 ? giras.map((g) => (
                          <SelectItem key={g.id} value={g.id}>{getGiraLabel(g)}</SelectItem>
                        )) : <SelectItem value="none" disabled>Nenhuma gira cadastrada</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedGiraId && (
                    <>
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
                      <Button className="w-full" onClick={() => createEscalaGira.mutate()} disabled={createEscalaGira.isPending}>
                        {createEscalaGira.isPending ? "Criando..." : "Criar Escala"}
                      </Button>
                    </>
                  )}
                </div>
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
                        <div>
                          <p className="font-display font-semibold text-sm">
                            {format(new Date(data + "T00:00:00"), "dd 'de' MMMM, EEEE", { locale: ptBR })}
                          </p>
                          {items[0]?.descricao && <p className="text-xs text-muted-foreground">{items[0].descricao}</p>}
                        </div>
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
                                {e.responsaveis.map(getNome).join(", ")}
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
              {escalasGira.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma escala de gira cadastrada</p>}
            </div>
          )}
        </TabsContent>

        {/* ========== FIM DE SEMANA ========== */}
        <TabsContent value="fds">
          {isAdmin && (
            <Dialog open={openFds} onOpenChange={setOpenFds}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1 mb-4 w-full"><Plus className="w-4 h-4" /> Nova Escala Fim de Semana</Button>
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
                          <input type="checkbox" checked={fdsMembers.includes(m.user_id)} onChange={() => toggleFdsMember(m.user_id)} className="rounded border-border" />
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
                          <p className="font-display font-semibold text-sm">{format(new Date(e.data + "T00:00:00"), "dd 'de' MMMM, EEEE", { locale: ptBR })}</p>
                          <p className="text-xs text-muted-foreground mt-1">Responsáveis: <span className="text-foreground">{e.responsaveis.map(getNome).join(", ")}</span></p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isMe && !isPast && (
                            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Você
                            </span>
                          )}
                          {isAdmin && (
                            <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive"
                              onClick={() => { if (confirm("Excluir?")) deleteEscala.mutate(e.id); }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {escalasFds.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma escala de fim de semana</p>}
            </div>
          )}
        </TabsContent>

        {/* ========== CAMBONES ========== */}
        <TabsContent value="cambones">
          {isAdmin && (
            <Dialog open={openCambone} onOpenChange={setOpenCambone}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1 mb-4 w-full"><Plus className="w-4 h-4" /> Escalar Cambones</Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="font-display">Cambones da Gira</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Selecione a Gira</Label>
                    <Select value={camboneGiraId} onValueChange={setCamboneGiraId}>
                      <SelectTrigger className="bg-secondary"><SelectValue placeholder="Escolha uma gira..." /></SelectTrigger>
                      <SelectContent>
                        {giras && giras.length > 0 ? giras.map((g) => (
                          <SelectItem key={g.id} value={g.id}>{getGiraLabel(g)}</SelectItem>
                        )) : <SelectItem value="none" disabled>Nenhuma gira cadastrada</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>

                  {camboneGiraId && (
                    <>
                      <div>
                        <Label className="mb-2 block">Médiuns que darão atendimento</Label>
                        <div className="space-y-2 max-h-36 overflow-y-auto">
                          {membros?.map((m) => (
                            <label key={m.user_id} className="flex items-center gap-2 text-sm cursor-pointer">
                              <input type="checkbox" checked={selectedMediums.includes(m.user_id)} onChange={() => toggleMedium(m.user_id)} className="rounded border-border" />
                              {m.nome_espiritual || m.nome}
                            </label>
                          ))}
                        </div>
                      </div>

                      {selectedMediums.length > 0 && (
                        <div className="space-y-3">
                          <Label>Atribuir cambone para cada médium</Label>
                          {selectedMediums.map((mediumId) => (
                            <div key={mediumId} className="flex items-center gap-2 bg-secondary/50 rounded-lg p-2">
                              <span className="text-sm font-medium w-28 shrink-0 truncate">{getNome(mediumId)}</span>
                              <span className="text-muted-foreground">→</span>
                              <Select value={camboneAssignments[mediumId] || ""} onValueChange={(v) => setCamboneAssignments((prev) => ({ ...prev, [mediumId]: v }))}>
                                <SelectTrigger className="bg-secondary flex-1"><SelectValue placeholder="Cambone..." /></SelectTrigger>
                                <SelectContent>
                                  {membros?.filter((m) => m.user_id !== mediumId).map((m) => (
                                    <SelectItem key={m.user_id} value={m.user_id}>{m.nome_espiritual || m.nome}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                      )}

                      <Button className="w-full" onClick={() => createCambones.mutate()} disabled={createCambones.isPending}>
                        {createCambones.isPending ? "Salvando..." : "Salvar Cambones"}
                      </Button>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* List cambones by gira */}
          <div className="space-y-4">
            {Object.entries(cambonesByEvento).map(([eventoId, items]) => {
              const gira = giras?.find((g) => g.id === eventoId);
              if (!gira) return null;
              const isMyAssignment = items!.some((c) => c.cambone_user_id === user?.id || c.medium_user_id === user?.id);
              return (
                <Card key={eventoId} className={`bg-card border-border ${isMyAssignment ? "border-primary/40" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-display font-semibold text-sm">{gira.titulo}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(gira.data_inicio), "dd/MM 'às' HH:mm", { locale: ptBR })}</p>
                      </div>
                      {isAdmin && (
                        <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive h-7 w-7"
                          onClick={() => { if (confirm("Excluir cambones desta gira?")) deleteCambone.mutate(eventoId); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {items!.map((c) => {
                        const isMe = c.cambone_user_id === user?.id;
                        return (
                          <div key={c.id} className={`flex items-center gap-2 text-sm ${isMe ? "text-primary font-medium" : ""}`}>
                            <span className="font-medium">{getNome(c.medium_user_id)}</span>
                            <span className="text-muted-foreground">→</span>
                            <span>{getNome(c.cambone_user_id)}</span>
                            {isMe && <CheckCircle2 className="w-3 h-3 text-primary" />}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {Object.keys(cambonesByEvento).length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum cambone escalado</p>}
          </div>
        </TabsContent>

        {/* ========== DEMAIS FUNÇÕES ========== */}
        <TabsContent value="funcoes">
          {isAdmin && (
            <Dialog open={openFuncoes} onOpenChange={setOpenFuncoes}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1 mb-4 w-full"><Plus className="w-4 h-4" /> Escalar Funções</Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="font-display">Demais Funções da Gira</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Selecione a Gira</Label>
                    <Select value={funcoesGiraId} onValueChange={setFuncoesGiraId}>
                      <SelectTrigger className="bg-secondary"><SelectValue placeholder="Escolha uma gira..." /></SelectTrigger>
                      <SelectContent>
                        {giras && giras.length > 0 ? giras.map((g) => (
                          <SelectItem key={g.id} value={g.id}>{getGiraLabel(g)}</SelectItem>
                        )) : <SelectItem value="none" disabled>Nenhuma gira cadastrada</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>

                  {funcoesGiraId && (
                    <>
                      <Label>Atribuir funções</Label>
                      {demaisFuncoes.map((f) => (
                        <div key={f.value} className="flex items-center gap-2">
                          <span className="text-xs w-32 shrink-0">{f.label}</span>
                          <Select value={funcoesAssignments[f.value] || ""} onValueChange={(v) => setFuncoesAssignments((prev) => ({ ...prev, [f.value]: v }))}>
                            <SelectTrigger className="bg-secondary flex-1"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                            <SelectContent>
                              {membros?.map((m) => (
                                <SelectItem key={m.user_id} value={m.user_id}>{m.nome_espiritual || m.nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                      <Button className="w-full" onClick={() => createFuncoesGira.mutate()} disabled={createFuncoesGira.isPending}>
                        {createFuncoesGira.isPending ? "Salvando..." : "Salvar Funções"}
                      </Button>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}

          <div className="space-y-4">
            {Object.entries(funcoesByEvento).map(([eventoId, items]) => {
              const gira = giras?.find((g) => g.id === eventoId);
              if (!gira) return null;
              const isMyFunc = items!.some((f) => f.user_id === user?.id);
              return (
                <Card key={eventoId} className={`bg-card border-border ${isMyFunc ? "border-primary/40" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-display font-semibold text-sm">{gira.titulo}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(gira.data_inicio), "dd/MM 'às' HH:mm", { locale: ptBR })}</p>
                      </div>
                      {isAdmin && (
                        <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive h-7 w-7"
                          onClick={() => { if (confirm("Excluir funções desta gira?")) deleteFuncaoGira.mutate(eventoId); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-1">
                      {items!.map((f) => {
                        const funcLabel = demaisFuncoes.find((df) => df.value === f.funcao)?.label || f.funcao;
                        const isMe = f.user_id === user?.id;
                        return (
                          <div key={f.id} className={`flex items-center justify-between text-sm ${isMe ? "text-primary font-medium" : "text-muted-foreground"}`}>
                            <span>{funcLabel}</span>
                            <span className="flex items-center gap-1">
                              {getNome(f.user_id)}
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
            {Object.keys(funcoesByEvento).length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma função escalada</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
