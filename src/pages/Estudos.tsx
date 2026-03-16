import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BookOpen, Plus, ArrowLeft, Trash2, ChevronDown, Pencil } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const LINHAS = ["Caboclo", "Preto Velho", "Erê", "Baiano", "Marinheiro", "Boiadeiro", "Cigano", "Malandro", "Exu"];

const linhaEmoji: Record<string, string> = {
  Caboclo: "🪶",
  "Preto Velho": "🕯️",
  "Erê": "🍭",
  Baiano: "🌴",
  Marinheiro: "⚓",
  Boiadeiro: "🐂",
  Cigano: "🔮",
  Malandro: "🎩",
  Exu: "🔥",
};

type Tab = "estudos" | "entidades";

type CategoriaEdicao = { id: string; nome: string; descricao: string | null };
type EntidadeEdicao = {
  id: string;
  medium_user_id: string;
  nome: string;
  categoria: string;
  como_trabalha: string | null;
  elementos: string | null;
  descricao: string | null;
};

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();

export default function Estudos() {
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>("estudos");
  const [open, setOpen] = useState(false);
  const [openCat, setOpenCat] = useState(false);
  const [openEntidade, setOpenEntidade] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const [editingCategoria, setEditingCategoria] = useState<CategoriaEdicao | null>(null);
  const [editingEntidade, setEditingEntidade] = useState<EntidadeEdicao | null>(null);

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
      const { data, error } = await supabase
        .from("estudos")
        .select("*, categorias_estudo(nome)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

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
      const { data } = await supabase.from("profiles").select("user_id, nome, nome_espiritual, avatar_url");
      return data ?? [];
    },
  });

  const getNomeMembroById = (userId: string) => {
    const m = membros?.find((p) => p.user_id === userId);
    return m?.nome_espiritual || m?.nome || "Filho";
  };

  const mediumPriorityIndex = (name: string) => {
    const clean = normalize(name);
    if (clean === normalize("Mãe Gabi") || clean === normalize("Mae Gabi") || clean === normalize("admin")) return 0;
    if (clean === normalize("Tathiane")) return 1;
    return 2;
  };

  const compareMediumIds = (aId: string, bId: string) => {
    const aName = getNomeMembroById(aId);
    const bName = getNomeMembroById(bId);

    const aPriority = mediumPriorityIndex(aName);
    const bPriority = mediumPriorityIndex(bName);
    if (aPriority !== bPriority) return aPriority - bPriority;

    return aName.localeCompare(bName, "pt-BR", { sensitivity: "base" });
  };

  const membrosOrdenados = useMemo(() => {
    return [...(membros ?? [])].sort((a, b) => {
      const aName = a.nome_espiritual || a.nome;
      const bName = b.nome_espiritual || b.nome;

      const aPriority = mediumPriorityIndex(aName);
      const bPriority = mediumPriorityIndex(bName);
      if (aPriority !== bPriority) return aPriority - bPriority;

      return aName.localeCompare(bName, "pt-BR", { sensitivity: "base" });
    });
  }, [membros]);

  const entidadesPorMedium = (entidades ?? []).reduce<Record<string, any[]>>((acc, e) => {
    const mediumId = (e as any).medium_user_id as string | null;
    if (!mediumId) return acc;
    if (!acc[mediumId]) acc[mediumId] = [];
    acc[mediumId].push(e as any);
    return acc;
  }, {});

  const mediumsOrdenados = Object.keys(entidadesPorMedium).sort(compareMediumIds);

  const uploadEstudoImage = async (file: File) => {
    if (!user) throw new Error("Usuário não autenticado");

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/estudos/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
  };

  const createCategoria = useMutation({
    mutationFn: async (form: FormData) => {
      const { error } = await supabase.from("categorias_estudo").insert({
        nome: form.get("nome") as string,
        descricao: (form.get("descricao") as string) || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias-estudo"] });
      setOpenCat(false);
      toast({ title: "Categoria criada!" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateCategoria = useMutation({
    mutationFn: async (form: FormData) => {
      if (!editingCategoria) throw new Error("Categoria inválida");
      const { error } = await supabase
        .from("categorias_estudo")
        .update({
          nome: form.get("nome") as string,
          descricao: (form.get("descricao") as string) || null,
        })
        .eq("id", editingCategoria.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias-estudo"] });
      queryClient.invalidateQueries({ queryKey: ["estudos"] });
      setEditingCategoria(null);
      toast({ title: "Categoria atualizada!" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteCategoria = useMutation({
    mutationFn: async (categoriaId: string) => {
      const { error: updateError } = await supabase.from("estudos").update({ categoria_id: null }).eq("categoria_id", categoriaId);
      if (updateError) throw updateError;

      const { error } = await supabase.from("categorias_estudo").delete().eq("id", categoriaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias-estudo"] });
      queryClient.invalidateQueries({ queryKey: ["estudos"] });
      toast({ title: "Categoria excluída!" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const createEstudo = useMutation({
    mutationFn: async (form: FormData) => {
      const catId = form.get("categoria_id") as string;
      const imageFile = form.get("imagem_file") as File | null;

      let imagemUrl: string | null = null;
      if (imageFile && imageFile.size > 0) {
        imagemUrl = await uploadEstudoImage(imageFile);
      }

      const { error } = await supabase.from("estudos").insert({
        titulo: form.get("titulo") as string,
        conteudo: form.get("conteudo") as string,
        categoria_id: catId || null,
        imagem_url: imagemUrl,
        criado_por: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estudos"] });
      setOpen(false);
      toast({ title: "Estudo publicado!" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteEstudo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("estudos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estudos"] });
      toast({ title: "Estudo excluído!" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const createEntidade = useMutation({
    mutationFn: async (form: FormData) => {
      const mediumUserId = form.get("medium_user_id") as string;
      const payload = {
        medium_user_id: mediumUserId,
        nome: form.get("nome") as string,
        categoria: form.get("categoria") as string,
        como_trabalha: (form.get("como_trabalha") as string) || null,
        elementos: (form.get("elementos") as string) || null,
        descricao: (form.get("descricao") as string) || null,
      } as const;

      const { error } = await supabase.from("entidades").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entidades"] });
      setOpenEntidade(false);
      toast({ title: "Entidade adicionada!" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateEntidade = useMutation({
    mutationFn: async (form: FormData) => {
      if (!editingEntidade) throw new Error("Entidade inválida");

      const { error } = await supabase
        .from("entidades")
        .update({
          medium_user_id: form.get("medium_user_id") as string,
          nome: form.get("nome") as string,
          categoria: form.get("categoria") as string,
          como_trabalha: (form.get("como_trabalha") as string) || null,
          elementos: (form.get("elementos") as string) || null,
          descricao: (form.get("descricao") as string) || null,
        })
        .eq("id", editingEntidade.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entidades"] });
      setEditingEntidade(null);
      toast({ title: "Entidade atualizada!" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteEntidade = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("entidades").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entidades"] });
      toast({ title: "Entidade excluída!" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const selectedEstudo = estudos?.find((e) => e.id === selected);

  if (selectedEstudo) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        {selectedEstudo.imagem_url && <img src={selectedEstudo.imagem_url} alt={selectedEstudo.titulo} className="w-full h-48 object-cover rounded-lg mb-4" />}
        <span className="text-xs text-primary bg-primary/20 px-2 py-0.5 rounded-full">{(selectedEstudo as any).categorias_estudo?.nome || "Sem categoria"}</span>
        <h1 className="font-display text-xl font-bold mt-2">{selectedEstudo.titulo}</h1>
        <p className="text-xs text-muted-foreground mt-1">{format(new Date(selectedEstudo.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
        <div className="mt-4 text-sm leading-relaxed whitespace-pre-wrap">{selectedEstudo.conteudo}</div>
        {isAdmin && (
          <Button
            variant="destructive"
            size="sm"
            className="mt-4"
            onClick={() => {
              if (confirm("Excluir este estudo?")) {
                deleteEstudo.mutate(selectedEstudo.id);
                setSelected(null);
              }
            }}
          >
            <Trash2 className="w-4 h-4 mr-1" /> Excluir
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-xl font-bold flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" /> Estudos
        </h1>
      </div>

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

      {tab === "estudos" && (
        <>
          {isAdmin && (
            <div className="flex gap-2 mb-4 justify-end">
              <Dialog open={openCat} onOpenChange={setOpenCat}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    + Categoria
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle className="font-display">Nova Categoria</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    createCategoria.mutate(new FormData(e.currentTarget));
                  }} className="space-y-3">
                    <div>
                      <Label>Nome</Label>
                      <Input name="nome" required className="bg-secondary" placeholder="Ex: Firmezas" />
                    </div>
                    <div>
                      <Label>Descrição (opcional)</Label>
                      <Textarea name="descricao" className="bg-secondary" />
                    </div>
                    <Button type="submit" className="w-full" disabled={createCategoria.isPending}>
                      Criar
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1">
                    <Plus className="w-4 h-4" /> Novo
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="font-display">Novo Estudo</DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      createEstudo.mutate(new FormData(e.currentTarget));
                    }}
                    className="space-y-3"
                  >
                    <div>
                      <Label>Título</Label>
                      <Input name="titulo" required className="bg-secondary" />
                    </div>
                    <div>
                      <Label>Categoria</Label>
                      <Select name="categoria_id">
                        <SelectTrigger className="bg-secondary">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>{categorias?.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Imagem (upload direto)</Label>
                      <Input name="imagem_file" type="file" accept="image/*" capture="environment" className="bg-secondary" />
                    </div>
                    <div>
                      <Label>Conteúdo</Label>
                      <Textarea name="conteudo" required className="bg-secondary" rows={8} />
                    </div>
                    <Button type="submit" className="w-full" disabled={createEstudo.isPending}>
                      {createEstudo.isPending ? "Publicando..." : "Publicar Estudo"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {isAdmin && editingCategoria && (
            <Dialog open={!!editingCategoria} onOpenChange={(openValue) => !openValue && setEditingCategoria(null)}>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="font-display">Editar Categoria</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateCategoria.mutate(new FormData(e.currentTarget));
                  }}
                  className="space-y-3"
                >
                  <div>
                    <Label>Nome</Label>
                    <Input name="nome" required defaultValue={editingCategoria.nome} className="bg-secondary" />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Textarea name="descricao" defaultValue={editingCategoria.descricao ?? ""} className="bg-secondary" />
                  </div>
                  <Button type="submit" className="w-full" disabled={updateCategoria.isPending}>
                    {updateCategoria.isPending ? "Salvando..." : "Salvar alterações"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {categorias && categorias.length > 0 && (
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {categorias.map((c) => (
                <div key={c.id} className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-secondary text-muted-foreground whitespace-nowrap">
                  <span>{c.nome}</span>
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditingCategoria({ id: c.id, nome: c.nome, descricao: c.descricao })}
                        className="text-muted-foreground hover:text-foreground"
                        title="Editar categoria"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Excluir categoria ${c.nome}? Os estudos ficarão sem categoria.`)) {
                            deleteCategoria.mutate(c.id);
                          }
                        }}
                        className="text-muted-foreground hover:text-destructive"
                        title="Excluir categoria"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {loadingEstudos ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
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
                        onClick={(ev) => {
                          ev.stopPropagation();
                          if (confirm("Excluir este estudo?")) deleteEstudo.mutate(e.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
              {(!estudos || estudos.length === 0) && <p className="text-center text-muted-foreground py-8">Nenhum estudo publicado</p>}
            </div>
          )}
        </>
      )}

      {tab === "entidades" && (
        <>
          {isAdmin && (
            <div className="flex justify-end mb-4">
              <Dialog open={openEntidade} onOpenChange={setOpenEntidade}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1">
                    <Plus className="w-4 h-4" /> Nova Entidade
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto pb-8">
                  <DialogHeader>
                    <DialogTitle className="font-display">Cadastrar Entidade de Médium</DialogTitle>
                    <DialogDescription>Preencha os dados da entidade</DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      createEntidade.mutate(new FormData(e.currentTarget));
                    }}
                    className="space-y-3"
                  >
                    <div>
                      <Label>Médium</Label>
                      <Select name="medium_user_id" required>
                        <SelectTrigger className="bg-secondary">
                          <SelectValue placeholder="Selecione o filho médium" />
                        </SelectTrigger>
                        <SelectContent>
                          {membrosOrdenados.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.nome_espiritual || m.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Linha</Label>
                      <Select name="categoria" defaultValue="Caboclo">
                        <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                        <SelectContent>{LINHAS.map((c) => <SelectItem key={c} value={c}>{linhaEmoji[c]} {c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Nome da entidade</Label><Input name="nome" required className="bg-secondary" placeholder="Ex: Exu Capa Preta" /></div>
                    <div><Label>Como trabalha</Label><Textarea name="como_trabalha" className="bg-secondary" rows={2} placeholder="Forma de trabalho da entidade" /></div>
                    <div><Label>Elementos</Label><Input name="elementos" className="bg-secondary" placeholder="Ex: marafo, charuto, pemba..." /></div>
                    <div><Label>Detalhes adicionais</Label><Textarea name="descricao" className="bg-secondary" rows={3} placeholder="Observações e fundamentos" /></div>
                    <Button type="submit" className="w-full" disabled={createEntidade.isPending}>
                      {createEntidade.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {isAdmin && editingEntidade && (
            <Dialog open={!!editingEntidade} onOpenChange={(openValue) => !openValue && setEditingEntidade(null)}>
              <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto pb-8">
                <DialogHeader>
                  <DialogTitle className="font-display">Editar Entidade</DialogTitle>
                  <DialogDescription>Altere os dados da entidade</DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateEntidade.mutate(new FormData(e.currentTarget));
                  }}
                  className="space-y-3"
                >
                  <div>
                    <Label>Médium</Label>
                    <Select name="medium_user_id" defaultValue={editingEntidade.medium_user_id}>
                      <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {membrosOrdenados.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.nome_espiritual || m.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Linha</Label>
                    <Select name="categoria" defaultValue={editingEntidade.categoria}>
                      <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                      <SelectContent>{LINHAS.map((c) => <SelectItem key={c} value={c}>{linhaEmoji[c]} {c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Nome da entidade</Label><Input name="nome" required defaultValue={editingEntidade.nome} className="bg-secondary" /></div>
                  <div><Label>Como trabalha</Label><Textarea name="como_trabalha" rows={2} defaultValue={editingEntidade.como_trabalha ?? ""} className="bg-secondary" /></div>
                  <div><Label>Elementos</Label><Input name="elementos" defaultValue={editingEntidade.elementos ?? ""} className="bg-secondary" /></div>
                  <div><Label>Detalhes adicionais</Label><Textarea name="descricao" rows={3} defaultValue={editingEntidade.descricao ?? ""} className="bg-secondary" /></div>
                  <Button type="submit" className="w-full" disabled={updateEntidade.isPending}>
                    {updateEntidade.isPending ? "Salvando..." : "Salvar alterações"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {loadingEntidades ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {mediumsOrdenados.map((mediumId) => {
                const items = entidadesPorMedium[mediumId] ?? [];
                return (
                  <Collapsible key={mediumId} className="border border-border rounded-lg bg-card">
                    <CollapsibleTrigger className="w-full p-3 flex items-center justify-between text-left">
                      <span className="font-medium text-sm flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={membros?.find((m) => m.user_id === mediumId)?.avatar_url ?? undefined} />
                          <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                            {getNomeMembroById(mediumId).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {getNomeMembroById(mediumId)}
                      </span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        {items.length} entidade(s)
                        <ChevronDown className="w-4 h-4" />
                      </span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-3 pb-3 space-y-2">
                      {LINHAS.map((linha) => {
                        const itensLinha = items.filter((e) => e.categoria === linha);
                        if (itensLinha.length === 0) return null;

                        return (
                          <Collapsible key={`${mediumId}-${linha}`} className="rounded-md border border-border/60">
                            <CollapsibleTrigger className="w-full p-2 flex items-center justify-between text-sm">
                              <span>{linhaEmoji[linha]} {linha}</span>
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="px-2 pb-2 space-y-2">
                              {itensLinha.map((ent) => (
                                <Collapsible key={ent.id} className="rounded-md bg-secondary/40">
                                  <CollapsibleTrigger className="w-full p-2 flex items-center justify-between text-sm font-medium">
                                    {ent.nome}
                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="px-3 pb-3 space-y-1 text-xs text-muted-foreground">
                                    {(ent as any).como_trabalha && <p><span className="text-foreground font-medium">Como trabalha:</span> {(ent as any).como_trabalha}</p>}
                                    {(ent as any).elementos && <p><span className="text-foreground font-medium">Elementos:</span> {(ent as any).elementos}</p>}
                                    {ent.descricao && <p><span className="text-foreground font-medium">Detalhes:</span> {ent.descricao}</p>}

                                    {isAdmin && (
                                      <div className="pt-1 flex gap-1">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 px-2 text-muted-foreground hover:text-foreground"
                                          onClick={() => {
                                            setEditingEntidade({
                                              id: ent.id,
                                              medium_user_id: ent.medium_user_id,
                                              nome: ent.nome,
                                              categoria: ent.categoria,
                                              como_trabalha: (ent as any).como_trabalha ?? null,
                                              elementos: (ent as any).elementos ?? null,
                                              descricao: ent.descricao ?? null,
                                            });
                                          }}
                                        >
                                          <Pencil className="w-3 h-3 mr-1" /> Editar
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 px-2 text-destructive"
                                          onClick={() => {
                                            if (confirm("Excluir esta entidade?")) deleteEntidade.mutate(ent.id);
                                          }}
                                        >
                                          <Trash2 className="w-3 h-3 mr-1" /> Excluir
                                        </Button>
                                      </div>
                                    )}
                                  </CollapsibleContent>
                                </Collapsible>
                              ))}
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
              {Object.keys(entidadesPorMedium).length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma entidade cadastrada</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
