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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, Plus, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Escalas() {
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

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

  const createEscala = useMutation({
    mutationFn: async (form: FormData) => {
      const { error } = await supabase.from("escalas_limpeza").insert({
        data: form.get("data") as string,
        descricao: (form.get("descricao") as string) || null,
        responsaveis: selectedMembers,
        criado_por: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalas"] });
      setOpen(false);
      setSelectedMembers([]);
      toast({ title: "Escala criada!" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const getNomes = (ids: string[]) =>
    ids.map((id) => {
      const m = membros?.find((m) => m.user_id === id);
      return m?.nome_espiritual || m?.nome?.split(" ")[0] || "?";
    }).join(", ");

  const hoje = new Date().toISOString().split("T")[0];

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-xl font-bold flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" /> Escalas de Limpeza
        </h1>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> Nova</Button></DialogTrigger>
            <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="font-display">Nova Escala</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createEscala.mutate(new FormData(e.currentTarget)); }} className="space-y-3">
                <div><Label>Data</Label><Input name="data" type="date" required className="bg-secondary" /></div>
                <div><Label>Descrição (opcional)</Label><Textarea name="descricao" className="bg-secondary" /></div>
                <div>
                  <Label>Responsáveis</Label>
                  <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                    {membros?.map((m) => (
                      <label key={m.user_id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={selectedMembers.includes(m.user_id)}
                          onCheckedChange={(checked) =>
                            setSelectedMembers((prev) => checked ? [...prev, m.user_id] : prev.filter((id) => id !== m.user_id))
                          }
                        />
                        {m.nome_espiritual || m.nome}
                      </label>
                    ))}
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createEscala.isPending || selectedMembers.length === 0}>
                  {createEscala.isPending ? "Criando..." : "Criar Escala"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {escalas?.map((e) => {
            const isMinhaEscala = e.responsaveis.includes(user?.id ?? "");
            const isPast = e.data < hoje;
            return (
              <Card key={e.id} className={`bg-card border-border ${isPast ? "opacity-50" : ""} ${isMinhaEscala && !isPast ? "border-primary/40" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-display font-semibold text-sm">
                        {format(new Date(e.data + "T00:00:00"), "dd 'de' MMMM, EEEE", { locale: ptBR })}
                      </p>
                      {e.descricao && <p className="text-xs text-muted-foreground mt-0.5">{e.descricao}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        Responsáveis: <span className="text-foreground">{getNomes(e.responsaveis)}</span>
                      </p>
                    </div>
                    {isMinhaEscala && !isPast && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Você
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {(!escalas || escalas.length === 0) && (
            <p className="text-center text-muted-foreground py-8">Nenhuma escala cadastrada</p>
          )}
        </div>
      )}
    </div>
  );
}
