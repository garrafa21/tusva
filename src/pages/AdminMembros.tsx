import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, UserCheck, Shield, Trash2, KeyRound } from "lucide-react";

type CategoriaMembro = "admin" | "escala" | "membro";

const categoriaMeta: Record<CategoriaMembro, { label: string; badgeClass: string }> = {
  admin: { label: "Admin", badgeClass: "bg-accent/20 text-accent" },
  escala: { label: "Cambone Chefe", badgeClass: "bg-cambone/20 text-cambone" },
  membro: { label: "Membro", badgeClass: "bg-secondary text-muted-foreground" },
};

export default function AdminMembros() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState<CategoriaMembro>("membro");

  const { data: membros, isLoading, refetch } = useQuery({
    queryKey: ["admin-membros"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase.from("profiles").select("*").order("nome");
      if (error) throw error;

      const { data: roles, error: rolesError } = await supabase.from("user_roles").select("user_id, role");
      if (rolesError) throw rolesError;

      const roleByUser = new Map<string, Set<string>>();
      (roles ?? []).forEach((r) => {
        const current = roleByUser.get(r.user_id) ?? new Set<string>();
        current.add(r.role);
        roleByUser.set(r.user_id, current);
      });

      return (profiles ?? []).map((p) => {
        const userRoles = roleByUser.get(p.user_id) ?? new Set<string>();
        const categoria: CategoriaMembro = userRoles.has("admin") ? "admin" : userRoles.has("escala") ? "escala" : "membro";
        return {
          ...p,
          categoria,
          isAdmin: categoria === "admin",
        };
      });
    },
  });

  const resumoCategorias = useMemo(() => {
    return {
      admin: membros?.filter((m) => m.categoria === "admin").length ?? 0,
      escala: membros?.filter((m) => m.categoria === "escala").length ?? 0,
      membro: membros?.filter((m) => m.categoria === "membro").length ?? 0,
    };
  }, [membros]);

  const handleCadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget as HTMLFormElement);
    const nome = form.get("nome") as string;
    const senha = form.get("senha") as string;

    if (senha.length < 6) {
      toast({ title: "Senha muito curta", description: "Mínimo 6 caracteres", variant: "destructive" });
      return;
    }

    setLoading(true);

    const res = await supabase.functions.invoke("create-user", {
      body: { nome, senha, role: novaCategoria, isAdmin: novaCategoria === "admin" },
    });

    if (res.error || res.data?.error) {
      toast({ title: "Erro ao cadastrar", description: res.data?.error || res.error?.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    setLoading(false);
    setOpen(false);
    setNovaCategoria("membro");
    toast({ title: "Filho(a) cadastrado(a)!", description: `${nome} foi cadastrado com sucesso.` });
    refetch();
  };

  const deleteMembro = useMutation({
    mutationFn: async (userId: string) => {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("profiles").delete().eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-membros"] });
      toast({ title: "Membro removido!" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-xl flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" /> Membros da Casa
        </h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> Cadastrar</Button></DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle className="font-display">Cadastrar Filho(a)</DialogTitle></DialogHeader>
            <form onSubmit={handleCadastrar} className="space-y-3">
              <div><Label>Nome completo</Label><Input name="nome" required className="bg-secondary" placeholder="Ex: João da Silva" /></div>
              <div><Label>Senha inicial</Label><Input name="senha" type="text" required className="bg-secondary" placeholder="Mín. 6 caracteres" /></div>
              <div>
                <Label>Categoria</Label>
                <Select value={novaCategoria} onValueChange={(value) => setNovaCategoria(value as CategoriaMembro)}>
                  <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="membro">Membro</SelectItem>
                    <SelectItem value="escala">Cambone Chefe</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">O login é criado pelo admin e não muda quando o nome de exibição for alterado.</p>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Cadastrando..." : "Cadastrar"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 mb-4 text-xs text-muted-foreground">
        <span>Admin: {resumoCategorias.admin}</span>
        <span>•</span>
        <span>Cambone Chefe: {resumoCategorias.escala}</span>
        <span>•</span>
        <span>Membro: {resumoCategorias.membro}</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {membros?.map((m) => (
            <Card key={m.id} className="bg-card border-border">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {m.categoria === "admin" ? <Shield className="w-4 h-4 text-gold" /> : <UserCheck className="w-4 h-4 text-primary" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{m.nome}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${categoriaMeta[m.categoria].badgeClass}`}>
                  {categoriaMeta[m.categoria].label}
                </span>
                <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-primary shrink-0"
                  title="Trocar senha"
                  onClick={async () => {
                    const novaSenha = prompt(`Nova senha para ${m.nome} (mín. 6 caracteres):`);
                    if (!novaSenha) return;
                    if (novaSenha.length < 6) {
                      toast({ title: "Senha muito curta", description: "Mínimo 6 caracteres", variant: "destructive" });
                      return;
                    }
                    const res = await supabase.functions.invoke("admin-reset-password", {
                      body: { user_id: m.user_id, nova_senha: novaSenha },
                    });
                    if (res.error || res.data?.error) {
                      toast({ title: "Erro ao trocar senha", description: res.data?.error || res.error?.message, variant: "destructive" });
                      return;
                    }
                    toast({ title: "Senha alterada!", description: `Nova senha de ${m.nome} foi definida.` });
                  }}>
                  <KeyRound className="w-4 h-4" />
                </Button>
                {!m.isAdmin && m.user_id !== user?.id && (
                  <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => { if (confirm(`Remover ${m.nome}?`)) deleteMembro.mutate(m.user_id); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
