import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Package, Plus, Check, X, Archive, Users, Clock } from "lucide-react";
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
  const [customItem, setCustomItem] = useState("");
  const [selectedTab, setSelectedTab] = useState("ativas");
  const canManage = isAdmin || canManageEscalas;

  // Fetch reposições
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
      const { data } = await supabase.from("profiles").select("user_id, nome, nome_espiritual");
      return data ?? [];
    },
    enabled: !!user,
  });

  const getNome = (id: string) => {
    const m = membros?.find((p) => p.user_id === id);
    return m?.nome_espiritual || m?.nome?.split(" ")[0] || "?";
  };

  const ativas = useMemo(
    () => (reposicoes ?? []).filter((r) => !isPast(new Date(r.expires_at))),
    [reposicoes]
  );

  const arquivadas = useMemo(
    () => (reposicoes ?? []).filter((r) => isPast(new Date(r.expires_at))),
    [reposicoes]
  );

  const getItensForRepo = (repoId: string) =>
    (itens ?? []).filter((i) => i.reposicao_id === repoId);

  const getRespostasForItem = (itemId: string) =>
    (respostas ?? []).filter((r) => r.reposicao_item_id === itemId);

  const getMyResposta = (itemId: string) =>
    respostas?.find((r) => r.reposicao_item_id === itemId && r.user_id === user?.id);

  // Create reposição
  const createReposicao = useMutation({
    mutationFn: async () => {
      const titulo = newTitle.trim() || "Reposição";
      const { data: repo, error } = await supabase
        .from("reposicoes")
        .insert({ titulo, created_by: user!.id })
        .select("id")
        .single();
      if (error) throw error;

      const itemsToInsert = DEFAULT_ITEMS.map((item, idx) => ({
        reposicao_id: repo.id,
        nome: item.nome,
        requires_color: item.requires_color,
        sort_order: idx,
        is_custom: false,
      }));

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

  // Toggle vote
  const toggleVote = useMutation({
    mutationFn: async ({ itemId, colorDetail }: { itemId: string; colorDetail?: string }) => {
      const existing = getMyResposta(itemId);
      if (existing) {
        // Remove vote
        const { error } = await supabase
          .from("reposicao_respostas")
          .delete()
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        // Add vote
        const { error } = await supabase
          .from("reposicao_respostas")
          .insert({
            reposicao_item_id: itemId,
            user_id: user!.id,
            color_detail: colorDetail || null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reposicao-respostas"] });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  // Update color
  const updateColor = useMutation({
    mutationFn: async ({ respostaId, color }: { respostaId: string; color: string }) => {
      const { error } = await supabase
        .from("reposicao_respostas")
        .update({ color_detail: color })
        .eq("id", respostaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reposicao-respostas"] });
    },
  });

  const RepoCard = ({ repo, isArchived }: { repo: typeof ativas[0]; isArchived: boolean }) => {
    const repoItens = getItensForRepo(repo.id);
    const expiresAt = new Date(repo.expires_at);
    const timeLeft = isPast(expiresAt)
      ? "Expirado"
      : `Expira ${formatDistanceToNow(expiresAt, { locale: ptBR, addSuffix: true })}`;

    return (
      <Card className={`bg-card border-border ${isArchived ? "opacity-75" : ""}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-display font-semibold text-sm">{repo.titulo}</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeLeft} — {format(new Date(repo.created_at), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
            {isArchived && (
              <Badge variant="secondary" className="text-xs">
                <Archive className="w-3 h-3 mr-1" /> Arquivado
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            {repoItens.map((item) => {
              const itemRespostas = getRespostasForItem(item.id);
              const myResposta = getMyResposta(item.id);
              const voted = !!myResposta;

              return (
                <div key={item.id} className="border border-border rounded-lg p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      {!isArchived && (
                        <button
                          onClick={() => {
                            if (item.requires_color && !voted) {
                              const color = prompt("Qual a cor? (ex: branca, vermelha, preta)");
                              if (color) toggleVote.mutate({ itemId: item.id, colorDetail: color });
                            } else {
                              toggleVote.mutate({ itemId: item.id });
                            }
                          }}
                          className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            voted
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/30 hover:border-primary"
                          }`}
                        >
                          {voted && <Check className="w-3 h-3" />}
                        </button>
                      )}
                      <span className={`text-sm ${voted ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                        {item.nome}
                        {item.is_custom && (
                          <span className="text-xs text-muted-foreground ml-1">(outro)</span>
                        )}
                      </span>
                      {myResposta?.color_detail && (
                        <Badge variant="outline" className="text-xs ml-1">
                          {myResposta.color_detail}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {itemRespostas.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {itemRespostas.length}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Admin/Cambone Chefe: show who voted */}
                  {canManage && itemRespostas.length > 0 && (
                    <div className="mt-1.5 pl-8">
                      <div className="flex flex-wrap gap-1">
                        {itemRespostas.map((r) => (
                          <span key={r.id} className="text-[10px] bg-secondary rounded-full px-2 py-0.5 text-muted-foreground">
                            {getNome(r.user_id)}
                            {r.color_detail && ` (${r.color_detail})`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add custom item - only for active repos */}
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
        {canManage && (
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="w-4 h-4" /> Nova
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-display">Nova Reposição</DialogTitle>
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
                <p className="text-xs text-muted-foreground">
                  Os itens padrão serão adicionados automaticamente. A reposição expira em 15 dias.
                </p>
                <Button
                  className="w-full"
                  onClick={() => createReposicao.mutate()}
                  disabled={createReposicao.isPending}
                >
                  {createReposicao.isPending ? "Criando..." : "Criar Reposição"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
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