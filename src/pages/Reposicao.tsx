import { useState, useMemo, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Package, Plus, Check, Archive, Users, Clock, Trash2, CheckCircle2, X } from "lucide-react";
import { format, isPast, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const DEFAULT_ITEMS = [
  { nome: "Papel Higiênico", requires_color: false },
  { nome: "Absorvente", requires_color: false },
  { nome: "Álcool", requires_color: false },
  { nome: "Sabonete líquido", requires_color: false },
  { nome: "Detergente", requires_color: false },
  { nome: "Copo de água", requires_color: false },
  { nome: "Copo de café", requires_color: false },
  { nome: "Alfazema", requires_color: false },
  { nome: "Vela de 7 dias", requires_color: true },
  { nome: "Vela", requires_color: true },
  { nome: "Água sanitária", requires_color: false },
  { nome: "Pemba", requires_color: true },
  { nome: "Desinfetante", requires_color: false },
  { nome: "Incenso", requires_color: false },
  { nome: "Saco de lixo", requires_color: false },
  { nome: "Pó de café", requires_color: false },
  { nome: "Defumação", requires_color: false },
  { nome: "Farinha de mandioca", requires_color: false },
  { nome: "Cigarro", requires_color: false },
  { nome: "Cachaça", requires_color: false },
];

export default function Reposicao() {
  const { isAdmin, canManageEscalas, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openNew, setOpenNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set(DEFAULT_ITEMS.map((_, i) => i)));
  const [customItem, setCustomItem] = useState("");
  const [selectedTab, setSelectedTab] = useState("ativas");
  // Colors chosen at creation time for requires_color items: { itemIdx: ["branca", "azul"] }
  const [creationColors, setCreationColors] = useState<Record<number, string[]>>({});
  const [colorDraft, setColorDraft] = useState<Record<number, string>>({});
  const canManage = isAdmin || canManageEscalas;

  const { data: reposicoes, isLoading } = useQuery({
    queryKey: ["reposicoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reposicoes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: itens } = useQuery({
    queryKey: ["reposicao-itens"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reposicao_itens")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: respostas } = useQuery({
    queryKey: ["reposicao-respostas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reposicao_respostas")
        .select("*");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: membros } = useQuery({
    queryKey: ["membros-reposicao"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, nome, nome_espiritual, avatar_url");
      return data ?? [];
    },
    enabled: !!user,
  });

  const getNome = (id: string) => {
    const m = membros?.find((p) => p.user_id === id);
    return m?.nome_espiritual || m?.nome || "?";
  };

  const getProfile = (id: string) => membros?.find((p) => p.user_id === id);

  const isActive = (r: any) => r.status === "ativa" && !isPast(new Date(r.expires_at));

  const ativas = useMemo(
    () => (reposicoes ?? []).filter(isActive),
    [reposicoes]
  );

  const arquivadas = useMemo(
    () => (reposicoes ?? []).filter((r) => !isActive(r)),
    [reposicoes]
  );

  const getItensForRepo = (repoId: string) =>
    (itens ?? []).filter((i) => i.reposicao_id === repoId);

  const getRespostasForItem = (itemId: string) =>
    (respostas ?? []).filter((r) => r.reposicao_item_id === itemId);

  const getMyRespostas = (itemId: string) =>
    (respostas ?? []).filter((r) => r.reposicao_item_id === itemId && r.user_id === user?.id);

  // Which selected items require color?
  const selectedColorItems = useMemo(() => {
    return Array.from(selectedItems).filter((idx) => DEFAULT_ITEMS[idx]?.requires_color);
  }, [selectedItems]);

  const addCreationColor = (idx: number) => {
    const text = (colorDraft[idx] || "").trim();
    if (!text) return;
    setCreationColors((prev) => ({
      ...prev,
      [idx]: [...(prev[idx] || []), text],
    }));
    setColorDraft((prev) => ({ ...prev, [idx]: "" }));
  };

  const removeCreationColor = (idx: number, colorIdx: number) => {
    setCreationColors((prev) => ({
      ...prev,
      [idx]: (prev[idx] || []).filter((_, i) => i !== colorIdx),
    }));
  };

  // Create reposição with selected items only
  // For color items, each color becomes a separate reposicao_item with the color in the name
  const createReposicao = useMutation({
    mutationFn: async () => {
      if (selectedItems.size === 0) throw new Error("Selecione pelo menos um item");
      // Validate: color items must have at least one color
      for (const idx of selectedColorItems) {
        if (!creationColors[idx] || creationColors[idx].length === 0) {
          throw new Error(`Informe ao menos uma cor para "${DEFAULT_ITEMS[idx].nome}"`);
        }
      }
      const titulo = newTitle.trim() || "Reposição";
      const { data: repo, error } = await supabase
        .from("reposicoes")
        .insert({ titulo, created_by: user!.id })
        .select("id")
        .single();
      if (error) throw error;

      const itemsToInsert: any[] = [];
      let sortIdx = 0;
      for (const idx of Array.from(selectedItems).sort((a, b) => a - b)) {
        const item = DEFAULT_ITEMS[idx];
        if (item.requires_color) {
          // Create one item per color
          for (const color of creationColors[idx] || []) {
            itemsToInsert.push({
              reposicao_id: repo.id,
              nome: `${item.nome} - ${color}`,
              requires_color: false, // color is already in the name
              sort_order: sortIdx++,
              is_custom: false,
            });
          }
        } else {
          itemsToInsert.push({
            reposicao_id: repo.id,
            nome: item.nome,
            requires_color: false,
            sort_order: sortIdx++,
            is_custom: false,
          });
        }
      }

      const { error: itemsErr } = await supabase
        .from("reposicao_itens")
        .insert(itemsToInsert);
      if (itemsErr) throw itemsErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reposicoes"] });
      queryClient.invalidateQueries({ queryKey: ["reposicao-itens"] });
      setOpenNew(false);
      setNewTitle("");
      setSelectedItems(new Set(DEFAULT_ITEMS.map((_, i) => i)));
      setCreationColors({});
      setColorDraft({});
      toast({ title: "Reposição criada!" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  // Add custom item
  const addCustomItem = useMutation({
    mutationFn: async ({ repoId, nome }: { repoId: string; nome: string }) => {
      const { error } = await supabase.from("reposicao_itens").insert({
        reposicao_id: repoId,
        nome: nome.trim(),
        requires_color: false,
        is_custom: true,
        sort_order: 999,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reposicao-itens"] });
      setCustomItem("");
      toast({ title: "Item adicionado!" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  // Delete custom item
  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      await supabase.from("reposicao_respostas").delete().eq("reposicao_item_id", itemId);
      const { error } = await supabase.from("reposicao_itens").delete().eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reposicao-itens"] });
      queryClient.invalidateQueries({ queryKey: ["reposicao-respostas"] });
      toast({ title: "Item removido!" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  // Delete reposição
  const deleteReposicao = useMutation({
    mutationFn: async (repoId: string) => {
      const repoItens = getItensForRepo(repoId);
      for (const item of repoItens) {
        await supabase.from("reposicao_respostas").delete().eq("reposicao_item_id", item.id);
      }
      await supabase.from("reposicao_itens").delete().eq("reposicao_id", repoId);
      const { error } = await supabase.from("reposicoes").delete().eq("id", repoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reposicoes"] });
      queryClient.invalidateQueries({ queryKey: ["reposicao-itens"] });
      queryClient.invalidateQueries({ queryKey: ["reposicao-respostas"] });
      toast({ title: "Reposição excluída!" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  // Mark as completed
  const markCompleted = useMutation({
    mutationFn: async (repoId: string) => {
      const { error } = await supabase
        .from("reposicoes")
        .update({ status: "concluida" } as any)
        .eq("id", repoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reposicoes"] });
      toast({ title: "Reposição marcada como concluída!" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  // Add vote (simple, no color needed since colors are in item name now)
  const addVote = useMutation({
    mutationFn: async ({ itemId }: { itemId: string }) => {
      const { error } = await supabase
        .from("reposicao_respostas")
        .insert({
          reposicao_item_id: itemId,
          user_id: user!.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reposicao-respostas"] });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  // Remove single vote
  const removeVote = useMutation({
    mutationFn: async (respostaId: string) => {
      const { error } = await supabase
        .from("reposicao_respostas")
        .delete()
        .eq("id", respostaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reposicao-respostas"] });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const toggleItemSelection = (idx: number) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
        // Clear colors if deselected
        setCreationColors((p) => { const n = { ...p }; delete n[idx]; return n; });
        setColorDraft((p) => { const n = { ...p }; delete n[idx]; return n; });
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const RepoCard = ({ repo, isArchived }: { repo: any; isArchived: boolean }) => {
    const repoItens = getItensForRepo(repo.id);
    const expiresAt = new Date(repo.expires_at);
    const isConcluida = repo.status === "concluida";
    const creatorProfile = getProfile(repo.created_by);
    const isCreator = user?.id === repo.created_by;
    const canDelete = isCreator || canManage;
    const canComplete = isCreator || canManage;

    const timeLeft = isConcluida
      ? "Concluída"
      : isPast(expiresAt)
        ? "Expirada"
        : `Expira ${formatDistanceToNow(expiresAt, { locale: ptBR, addSuffix: true })}`;

    return (
      <Card className={`bg-card border-border ${isArchived ? "opacity-75" : ""}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Avatar className="w-7 h-7">
                {creatorProfile?.avatar_url ? (
                  <AvatarImage src={creatorProfile.avatar_url} alt={getNome(repo.created_by)} />
                ) : null}
                <AvatarFallback className="text-[10px]">
                  {getNome(repo.created_by).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-display font-semibold text-sm">{repo.titulo}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {timeLeft} — {getNome(repo.created_by)} · {format(new Date(repo.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {isConcluida && (
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Concluída
                </Badge>
              )}
              {isArchived && !isConcluida && (
                <Badge variant="secondary" className="text-xs">
                  <Archive className="w-3 h-3 mr-1" /> Expirada
                </Badge>
              )}
              {canDelete && !isArchived && (
                <>
                  {canComplete && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-green-600 hover:text-green-700"
                      title="Marcar como concluída"
                      onClick={() => {
                        if (confirm("Marcar esta reposição como concluída?")) markCompleted.mutate(repo.id);
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (confirm("Excluir esta reposição?")) deleteReposicao.mutate(repo.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {repoItens.map((item) => {
              const itemRespostas = getRespostasForItem(item.id);
              const myRespostas = getMyRespostas(item.id);
              const voted = myRespostas.length > 0;

              return (
                <div key={item.id} className="border border-border rounded-lg p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <span className={`text-sm ${voted ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                        {item.nome}
                        {item.is_custom && (
                          <span className="text-xs text-muted-foreground ml-1">(outro)</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {itemRespostas.length > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="w-3 h-3" /> {itemRespostas.length}
                        </span>
                      )}
                      {item.is_custom && canDelete && !isArchived && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteItem.mutate(item.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* My votes */}
                  {myRespostas.length > 0 && (
                    <div className="mt-1 pl-1 flex flex-wrap gap-1">
                      {myRespostas.map((r) => (
                        <Badge
                          key={r.id}
                          variant="default"
                          className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground gap-1"
                          onClick={() => {
                            if (!isArchived) removeVote.mutate(r.id);
                          }}
                        >
                          <Check className="w-2.5 h-2.5" />
                          Eu
                          {!isArchived && <X className="w-2.5 h-2.5 ml-0.5" />}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Add vote button */}
                  {!isArchived && !voted && (
                    <div className="mt-1.5 pl-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs px-2 gap-1"
                        onClick={() => addVote.mutate({ itemId: item.id })}
                      >
                        <Check className="w-3 h-3" /> Vou levar
                      </Button>
                    </div>
                  )}

                  {/* Show who voted to everyone */}
                  {itemRespostas.length > 0 && (
                    <div className="mt-1.5 pl-1">
                      <div className="flex flex-wrap gap-1">
                        {itemRespostas.map((r) => (
                          <span key={r.id} className="text-[10px] bg-secondary rounded-full px-2 py-0.5 text-muted-foreground">
                            {getNome(r.user_id)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add custom item */}
          {!isArchived && (
            <div className="mt-3 flex gap-2">
              <Input
                value={customItem}
                onChange={(e) => setCustomItem(e.target.value)}
                placeholder="Outro item..."
                className="bg-secondary text-sm h-8"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customItem.trim()) {
                    addCustomItem.mutate({ repoId: repo.id, nome: customItem });
                  }
                }}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 shrink-0"
                disabled={!customItem.trim()}
                onClick={() => {
                  if (customItem.trim()) addCustomItem.mutate({ repoId: repo.id, nome: customItem });
                }}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-xl font-bold flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" /> Reposição
        </h1>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="w-4 h-4" /> Nova
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">Nova Reposição</DialogTitle>
              <DialogDescription>Selecione os itens que estão faltando no terreiro</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Título (opcional)</Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Reposição Março"
                  className="bg-secondary"
                />
              </div>
              <div>
                <Label className="mb-2 block">Selecione os itens:</Label>
                <div className="flex gap-2 mb-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => setSelectedItems(new Set(DEFAULT_ITEMS.map((_, i) => i)))}
                  >
                    Todos
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      setSelectedItems(new Set());
                      setCreationColors({});
                      setColorDraft({});
                    }}
                  >
                    Nenhum
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto border border-border rounded-lg p-2">
                  {DEFAULT_ITEMS.map((item, idx) => (
                    <div key={idx}>
                      <label className="flex items-center gap-2 cursor-pointer hover:bg-secondary/50 rounded px-1 py-0.5">
                        <Checkbox
                          checked={selectedItems.has(idx)}
                          onCheckedChange={() => toggleItemSelection(idx)}
                        />
                        <span className="text-sm">{item.nome}</span>
                        {item.requires_color && (
                          <span className="text-xs text-muted-foreground">(cor)</span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Color inputs for selected color items */}
              {selectedColorItems.length > 0 && (
                <div className="space-y-3 border border-border rounded-lg p-3">
                  <Label className="text-xs font-semibold text-primary">Informe as cores que estão faltando:</Label>
                  {selectedColorItems.map((idx) => (
                    <div key={idx} className="space-y-1.5">
                      <span className="text-sm font-medium">{DEFAULT_ITEMS[idx].nome}</span>
                      {/* Show added colors */}
                      {(creationColors[idx] || []).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {creationColors[idx].map((color, ci) => (
                            <Badge key={ci} variant="secondary" className="text-xs gap-1">
                              {color}
                              <X
                                className="w-3 h-3 cursor-pointer hover:text-destructive"
                                onClick={() => removeCreationColor(idx, ci)}
                              />
                            </Badge>
                          ))}
                        </div>
                      )}
                      {/* Input to add color */}
                      <div className="flex items-center gap-1">
                        <Input
                          placeholder="Ex: branca, azul..."
                          className="bg-secondary text-sm h-8 flex-1"
                          value={colorDraft[idx] || ""}
                          onChange={(e) => setColorDraft((p) => ({ ...p, [idx]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCreationColor(idx);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 shrink-0"
                          disabled={!(colorDraft[idx] || "").trim()}
                          onClick={() => addCreationColor(idx)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {selectedItems.size} item(ns) selecionado(s). A reposição expira em 15 dias.
              </p>
              <Button
                className="w-full"
                onClick={() => createReposicao.mutate()}
                disabled={createReposicao.isPending || selectedItems.size === 0}
              >
                {createReposicao.isPending ? "Criando..." : "Criar Reposição"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {canManage ? (
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="ativas" className="flex-1 gap-1 text-xs">
              <Package className="w-3 h-3" /> Ativas
            </TabsTrigger>
            <TabsTrigger value="arquivadas" className="flex-1 gap-1 text-xs">
              <Archive className="w-3 h-3" /> Arquivadas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ativas">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : ativas.length > 0 ? (
              <div className="space-y-4">
                {ativas.map((r) => (
                  <RepoCard key={r.id} repo={r} isArchived={false} />
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhuma reposição ativa</p>
            )}
          </TabsContent>

          <TabsContent value="arquivadas">
            {arquivadas.length > 0 ? (
              <div className="space-y-4">
                {arquivadas.map((r) => (
                  <RepoCard key={r.id} repo={r} isArchived={true} />
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhuma reposição arquivada</p>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : ativas.length > 0 ? (
            <div className="space-y-4">
              {ativas.map((r) => (
                <RepoCard key={r.id} repo={r} isArchived={false} />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Nenhuma reposição ativa no momento</p>
          )}
        </div>
      )}
    </div>
  );
}
