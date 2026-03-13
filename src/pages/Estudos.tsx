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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BookOpen, Plus, ArrowLeft, Trash2, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const LINHAS = [
  "Caboclo", "Preto Velho", "Erê", "Baiano",
  "Marinheiro", "Boiadeiro", "Cigano", "Malandro", "Exu",
];

const linhaEmoji: Record<string, string> = {
  "Caboclo": "🪶",
  "Preto Velho": "🕯️",
  "Erê": "🍭",
  "Baiano": "🌴",
  "Marinheiro": "⚓",
  "Boiadeiro": "🐂",
  "Cigano": "🔮",
  "Malandro": "🎩",
  "Exu": "🔥",
};

type Tab = "estudos" | "entidades";

export default function Estudos() {
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("estudos");
  const [open, setOpen] = useState(false);
  const [openCat, setOpenCat] = useState(false);
  const [openEntidade, setOpenEntidade] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  // ---- Estudos queries ----
  const { data: categorias } = useQuery({
    queryKey: ["categorias-estudo"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categorias_estudo").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: estudos, isLoading: loadingEstudos } = useQuery({
    queryKey: ["estudos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("estudos").select("*, categorias_estudo(nome)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // ---- Entidades queries ----
  const { data: entidades, isLoading: loadingEntidades } = useQuery({
    queryKey: ["entidades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entidades")
        .select("*")
        .order("medium_user_id", { ascending: true })
        .order("categoria", { ascending: true })
        .order("nome", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: membros } = useQuery({
    queryKey: ["membros-entidades"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, nome, nome_espiritual");
      return data ?? [];
    },
  });

  // ---- Mutations ----
  const createCategoria = useMutation({
    mutationFn: async (form: FormData) => {
      const { error } = await supabase.from("categorias_estudo").insert({ nome: form.get("nome") as string, descricao: (form.get("descricao") as string) || null });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categorias-estudo"] }); setOpenCat(false); toast({ title: "Categoria criada!" }); },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const createEstudo = useMutation({
    mutationFn: async (form: FormData) => {
      const catId = form.get("categoria_id") as string;
      const { error } = await supabase.from("estudos").insert({
        titulo: form.get("titulo") as string,
        conteudo: form.get("conteudo") as string,
        categoria_id: catId || null,
        imagem_url: (form.get("imagem_url") as string) || null,
        criado_por: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["estudos"] }); setOpen(false); toast({ title: "Estudo publicado!" }); },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteEstudo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("estudos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["estudos"] }); toast({ title: "Estudo excluído!" }); },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const createEntidade = useMutation({
    mutationFn: async (form: FormData) => {
      const { error } = await supabase.from("entidades").insert({
        nome: form.get("nome") as string,
        categoria: form.get("categoria") as string,
        descricao: (form.get("descricao") as string) || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["entidades"] }); setOpenEntidade(false); toast({ title: "Entidade adicionada!" }); },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteEntidade = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("entidades").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["entidades"] }); toast({ title: "Entidade excluída!" }); },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  // ---- Estudo detail view ----
  const selectedEstudo = estudos?.find((e) => e.id === selected);

  if (selectedEstudo) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        {selectedEstudo.imagem_url && (
          <img src={selectedEstudo.imagem_url} alt={selectedEstudo.titulo} className="w-full h-48 object-cover rounded-lg mb-4" />
        )}
        <span className="text-xs text-primary bg-primary/20 px-2 py-0.5 rounded-full">
          {(selectedEstudo as any).categorias_estudo?.nome || "Sem categoria"}
        </span>
        <h1 className="font-display text-xl font-bold mt-2">{selectedEstudo.titulo}</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {format(new Date(selectedEstudo.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
        <div className="mt-4 text-sm leading-relaxed whitespace-pre-wrap">{selectedEstudo.conteudo}</div>
        {isAdmin && (
          <Button variant="destructive" size="sm" className="mt-4" onClick={() => { if (confirm("Excluir este estudo?")) { deleteEstudo.mutate(selectedEstudo.id); setSelected(null); } }}>
            <Trash2 className="w-4 h-4 mr-1" /> Excluir
          </Button>
        )}
      </div>
    );
  }

  // ---- Entidades grouped ----
  const grouped = LINHAS.reduce((acc, cat) => {
    const items = entidades?.filter((e) => e.categoria === cat) ?? [];
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {} as Record<string, typeof entidades>);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-xl font-bold flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" /> Estudos
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-secondary rounded-lg p-1">
        <button
          onClick={() => setTab("estudos")}
          className={`flex-1 text-sm py-2 rounded-md transition-colors font-medium ${tab === "estudos" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
        >
          📚 Estudos
        </button>
        <button
          onClick={() => setTab("entidades")}
          className={`flex-1 text-sm py-2 rounded-md transition-colors font-medium ${tab === "entidades" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
        >
          ✨ Entidades
        </button>
      </div>

      {/* ===== ESTUDOS TAB ===== */}
      {tab === "estudos" && (
        <>
          {isAdmin && (
            <div className="flex gap-2 mb-4 justify-end">
              <Dialog open={openCat} onOpenChange={setOpenCat}>
                <DialogTrigger asChild><Button variant="outline" size="sm">+ Categoria</Button></DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader><DialogTitle className="font-display">Nova Categoria</DialogTitle></DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); createCategoria.mutate(new FormData(e.currentTarget)); }} className="space-y-3">
                    <div><Label>Nome</Label><Input name="nome" required className="bg-secondary" placeholder="Ex: Firmezas" /></div>
                    <div><Label>Descrição (opcional)</Label><Textarea name="descricao" className="bg-secondary" /></div>
                    <Button type="submit" className="w-full" disabled={createCategoria.isPending}>Criar</Button>
                  </form>
                </DialogContent>
              </Dialog>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> Novo</Button></DialogTrigger>
                <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-display">Novo Estudo</DialogTitle></DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); createEstudo.mutate(new FormData(e.currentTarget)); }} className="space-y-3">
                    <div><Label>Título</Label><Input name="titulo" required className="bg-secondary" /></div>
                    <div><Label>Categoria</Label>
                      <Select name="categoria_id">
                        <SelectTrigger className="bg-secondary"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>{categorias?.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>URL da Imagem (opcional)</Label><Input name="imagem_url" className="bg-secondary" placeholder="https://..." /></div>
                    <div><Label>Conteúdo</Label><Textarea name="conteudo" required className="bg-secondary" rows={8} /></div>
                    <Button type="submit" className="w-full" disabled={createEstudo.isPending}>
                      {createEstudo.isPending ? "Publicando..." : "Publicar Estudo"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {categorias && categorias.length > 0 && (
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {categorias.map((c) => (
                <button key={c.id} className="text-xs px-3 py-1 rounded-full bg-secondary hover:bg-primary/20 text-muted-foreground hover:text-primary whitespace-nowrap transition-colors">
                  {c.nome}
                </button>
              ))}
            </div>
          )}

          {loadingEstudos ? (
            <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="space-y-3">
              {estudos?.map((e) => (
                <Card key={e.id} className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setSelected(e.id)}>
                  <CardContent className="p-4 flex gap-3">
                    {e.imagem_url && <img src={e.imagem_url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <span className="text-xs text-primary">{(e as any).categorias_estudo?.nome || "Sem categoria"}</span>
                      <h3 className="font-display font-semibold text-sm truncate">{e.titulo}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{e.conteudo}</p>
                    </div>
                    {isAdmin && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={(ev) => { ev.stopPropagation(); if (confirm("Excluir este estudo?")) deleteEstudo.mutate(e.id); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
              {(!estudos || estudos.length === 0) && (
                <p className="text-center text-muted-foreground py-8">Nenhum estudo publicado</p>
              )}
            </div>
          )}
        </>
      )}

      {/* ===== ENTIDADES TAB ===== */}
      {tab === "entidades" && (
        <>
          {isAdmin && (
            <div className="flex justify-end mb-4">
              <Dialog open={openEntidade} onOpenChange={setOpenEntidade}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> Nova Entidade</Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader><DialogTitle className="font-display">Nova Entidade</DialogTitle></DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); createEntidade.mutate(new FormData(e.currentTarget)); }} className="space-y-3">
                    <div><Label>Nome</Label><Input name="nome" required className="bg-secondary" placeholder="Ex: Caboclo Ventania" /></div>
                    <div><Label>Linha</Label>
                      <Select name="categoria" defaultValue="Caboclos">
                        <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                        <SelectContent>{LINHAS.map((c) => <SelectItem key={c} value={c}>{linhaEmoji[c]} {c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Fundamentos / Descrição (opcional)</Label><Textarea name="descricao" className="bg-secondary" rows={4} placeholder="Fundamentos, história, características..." /></div>
                    <Button type="submit" className="w-full" disabled={createEntidade.isPending}>
                      {createEntidade.isPending ? "Adicionando..." : "Adicionar"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {loadingEntidades ? (
            <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([categoria, items]) => (
                <div key={categoria}>
                  <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                    <span>{linhaEmoji[categoria]}</span> {categoria}
                    <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{items!.length}</span>
                  </h2>
                  <div className="grid gap-2">
                    {items!.map((e) => (
                      <Card key={e.id} className="bg-card border-border">
                        <CardContent className="p-3 flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{e.nome}</p>
                            {e.descricao && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{e.descricao}</p>}
                          </div>
                          {isAdmin && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => { if (confirm("Excluir esta entidade?")) deleteEntidade.mutate(e.id); }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
              {Object.keys(grouped).length === 0 && (
                <p className="text-center text-muted-foreground py-8">Nenhuma entidade cadastrada</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
