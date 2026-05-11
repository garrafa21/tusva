import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, HandHeart } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { UserAvatar } from "@/components/UserAvatar";
import { ListSkeleton } from "@/components/skeletons/LoadingSkeleton";
import { sendPushNotification } from "@/lib/pushNotifications";

export default function Firmezas() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: pedidos, isLoading } = useQuery({
    queryKey: ["prayer-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prayer_requests")
        .select("*")
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: supports } = useQuery({
    queryKey: ["prayer-supports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("prayer_supports").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: membros } = useQuery({
    queryKey: ["membros-firmezas"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, nome, nome_espiritual, avatar_url");
      return data ?? [];
    },
  });

  const getMembro = (id: string) => membros?.find((m) => m.user_id === id);
  const getNome = (id: string) => {
    const m = getMembro(id);
    return m?.nome_espiritual || m?.nome || "Médium";
  };

  const create = useMutation({
    mutationFn: async (form: FormData) => {
      const titulo = form.get("titulo") as string;
      const descricao = (form.get("descricao") as string) || null;
      const { error } = await supabase.from("prayer_requests").insert({
        user_id: user!.id,
        titulo,
        descricao,
      });
      if (error) throw error;
      void sendPushNotification({
        title: "🙏 Novo pedido de firmeza",
        body: `${getNome(user!.id)}: ${titulo}`,
        url: "/firmezas",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prayer-requests"] });
      setOpen(false);
      toast({ title: "Pedido publicado", description: "A corrente está aberta 🙏" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prayer_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["prayer-requests"] }),
  });

  const toggleSupport = useMutation({
    mutationFn: async ({ requestId, currentlySupporting }: { requestId: string; currentlySupporting: boolean }) => {
      if (currentlySupporting) {
        const { error } = await supabase
          .from("prayer_supports")
          .delete()
          .eq("request_id", requestId)
          .eq("user_id", user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("prayer_supports")
          .insert({ request_id: requestId, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["prayer-supports"] }),
  });

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2 text-gradient-vinho">
            <HandHeart className="w-6 h-6 text-primary" /> Firmezas
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Compartilhe pedidos de oração e firme com a corrente</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1 bg-gradient-vinho text-white shadow-glow-vinho">
              <Plus className="w-4 h-4" /> Pedido
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display">Novo pedido de firmeza</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                create.mutate(new FormData(e.currentTarget));
              }}
              className="space-y-3"
            >
              <div>
                <Label>Título</Label>
                <Input name="titulo" required className="bg-secondary" placeholder="Ex.: Saúde da minha mãe" maxLength={120} />
              </div>
              <div>
                <Label>Descrição (opcional)</Label>
                <Textarea name="descricao" className="bg-secondary" rows={4} placeholder="Conte para a corrente..." />
              </div>
              <p className="text-xs text-muted-foreground">O pedido fica ativo por 30 dias.</p>
              <Button type="submit" className="w-full" disabled={create.isPending}>
                {create.isPending ? "Publicando..." : "Publicar pedido"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <ListSkeleton count={3} />
      ) : !pedidos || pedidos.length === 0 ? (
        <Card className="bg-card border-border shadow-card">
          <CardContent className="p-8 text-center text-muted-foreground">
            <HandHeart className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm">Nenhum pedido ativo no momento.</p>
            <p className="text-xs mt-1">Seja o primeiro a abrir uma corrente.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pedidos.map((p, idx) => {
            const mySupport = supports?.find((s) => s.request_id === p.id && s.user_id === user?.id);
            const count = supports?.filter((s) => s.request_id === p.id).length ?? 0;
            const supporters = supports?.filter((s) => s.request_id === p.id) ?? [];
            const canDelete = isAdmin || p.user_id === user?.id;

            return (
              <Card
                key={p.id}
                className="bg-card border-border shadow-card hover-lift gold-hairline relative overflow-hidden animate-fade-in-up"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      name={getNome(p.user_id)}
                      src={getMembro(p.user_id)?.avatar_url}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{getNome(p.user_id)}</span>
                          {" · "}
                          {formatDistanceToNow(new Date(p.created_at), { locale: ptBR, addSuffix: true })}
                        </p>
                        {canDelete && (
                          <button
                            onClick={() => {
                              if (confirm("Apagar este pedido?")) remove.mutate(p.id);
                            }}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <h3 className="font-display font-semibold mt-0.5 leading-tight">{p.titulo}</h3>
                      {p.descricao && (
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{p.descricao}</p>
                      )}

                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={mySupport ? "default" : "outline"}
                          onClick={() =>
                            toggleSupport.mutate({ requestId: p.id, currentlySupporting: !!mySupport })
                          }
                          className={`gap-1 h-8 transition-all ${
                            mySupport
                              ? "bg-gradient-vinho text-white shadow-glow-vinho"
                              : "hover:border-primary/50"
                          }`}
                        >
                          <HandHeart className="w-3.5 h-3.5" />
                          {mySupport ? "Estou firmando" : "Firmar com"}
                        </Button>
                        {count > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <div className="flex -space-x-2">
                              {supporters.slice(0, 3).map((s) => (
                                <UserAvatar
                                  key={s.id}
                                  size="xs"
                                  name={getNome(s.user_id)}
                                  src={getMembro(s.user_id)?.avatar_url}
                                  className="ring-2 ring-card"
                                />
                              ))}
                            </div>
                            <span className="ml-1">
                              {count} firmando{count !== 1 ? "" : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
