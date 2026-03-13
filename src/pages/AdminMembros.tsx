import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, UserCheck, Shield } from "lucide-react";

export default function AdminMembros() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: membros, isLoading, refetch } = useQuery({
    queryKey: ["admin-membros"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase.from("profiles").select("*").order("nome");
      if (error) throw error;
      const { data: roles } = await supabase.from("user_roles").select("*");
      return profiles.map((p) => ({
        ...p,
        isAdmin: roles?.some((r) => r.user_id === p.user_id && r.role === "admin") ?? false,
      }));
    },
  });

  const handleCadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget as HTMLFormElement);
    const email = form.get("email") as string;
    const nome = form.get("nome") as string;
    const senha = form.get("senha") as string;

    if (senha.length < 6) {
      toast({ title: "Senha muito curta", description: "Mínimo 6 caracteres", variant: "destructive" });
      return;
    }

    setLoading(true);

    // Create user via Supabase Auth admin (using signUp since we don't have admin API on client)
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome } },
    });

    if (error) {
      toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    if (data.user) {
      // Add membro role
      await supabase.from("user_roles").insert({ user_id: data.user.id, role: "membro" as const });
    }

    setLoading(false);
    setOpen(false);
    toast({ title: "Filho(a) cadastrado(a)!", description: `${nome} foi cadastrado com sucesso.` });
    refetch();
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-xl font-bold flex items-center gap-2">
          <Users className="w-5 h-5 text-gold" /> Membros da Casa
        </h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> Cadastrar</Button></DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle className="font-display">Cadastrar Filho(a)</DialogTitle></DialogHeader>
            <form onSubmit={handleCadastrar} className="space-y-3">
              <div><Label>Nome completo</Label><Input name="nome" required className="bg-secondary" /></div>
              <div><Label>Email</Label><Input name="email" type="email" required className="bg-secondary" /></div>
              <div><Label>Senha inicial</Label><Input name="senha" type="text" required className="bg-secondary" placeholder="Mín. 6 caracteres" /></div>
              <p className="text-xs text-muted-foreground">O filho poderá trocar a senha depois no perfil.</p>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Cadastrando..." : "Cadastrar"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {membros?.map((m) => (
            <Card key={m.id} className="bg-card border-border">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  {m.isAdmin ? <Shield className="w-4 h-4 text-gold" /> : <UserCheck className="w-4 h-4 text-primary" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{m.nome}</p>
                  {m.nome_espiritual && <p className="text-xs text-primary truncate">{m.nome_espiritual}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${m.isAdmin ? "bg-gold/20 text-gold" : "bg-secondary text-muted-foreground"}`}>
                  {m.isAdmin ? "Admin" : "Membro"}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
