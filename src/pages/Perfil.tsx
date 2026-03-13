import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User } from "lucide-react";

export default function Perfil() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [nome, setNome] = useState(profile?.nome ?? "");
  const [nomeEsp, setNomeEsp] = useState(profile?.nome_espiritual ?? "");
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("profiles").update({ nome, nome_espiritual: nomeEsp || null }).eq("user_id", user!.id);
    setLoading(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Perfil atualizado!" });
      // Refresh auth context
      window.location.reload();
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="font-display text-xl font-bold flex items-center gap-2 mb-6">
        <User className="w-5 h-5 text-primary" /> Meu Perfil
      </h1>
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <form onSubmit={handleSave} className="space-y-4">
            <div><Label>Email</Label><Input value={user?.email ?? ""} disabled className="bg-muted" /></div>
            <div><Label>Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} required className="bg-secondary" /></div>
            <div><Label>Nome Espiritual</Label><Input value={nomeEsp} onChange={(e) => setNomeEsp(e.target.value)} className="bg-secondary" placeholder="Opcional" /></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
