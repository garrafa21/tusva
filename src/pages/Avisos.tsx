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
import { Bell, Plus, AlertTriangle, Star, Check } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const prioridadeCor: Record<string, string> = {
  normal: "border-l-muted-foreground",
  importante: "border-l-gold",
  urgente: "border-l-destructive",
};

export default function Avisos() {
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: avisos, isLoading } = useQuery({
    queryKey: ["avisos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("avisos").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createAviso = useMutation({
    mutationFn: async (form: FormData) => {
      const { error } = await supabase.from("avisos").insert({
        titulo: form.get("titulo") as string,
        conteudo: form.get("conteudo") as string,
        prioridade: form.get("prioridade") as "normal" | "importante" | "urgente",
        criado_por: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["avisos"] });
      queryClient.invalidateQueries({ queryKey: ["avisos-nao-lidos"] });
      setOpen(false);
      toast({ title: "Aviso publicado!" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-xl font-bold flex items-center gap-2">
          <Bell className="w-5 h-5 text-gold" /> Avisos
        </h1>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> Novo</Button></DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle className="font-display">Novo Aviso</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createAviso.mutate(new FormData(e.currentTarget)); }} className="space-y-3">
                <div><Label>Título</Label><Input name="titulo" required className="bg-secondary" /></div>
                <div><Label>Conteúdo</Label><Textarea name="conteudo" required className="bg-secondary" rows={4} /></div>
                <div><Label>Prioridade</Label>
                  <Select name="prioridade" defaultValue="normal">
                    <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="importante">Importante</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={createAviso.isPending}>
                  {createAviso.isPending ? "Publicando..." : "Publicar Aviso"}
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
          {avisos?.map((a) => {
            const lido = a.lido_por.includes(user?.id ?? "");
            return (
              <Card key={a.id} className={`bg-card border-border border-l-4 ${prioridadeCor[a.prioridade]} ${!lido ? "ring-1 ring-primary/20" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {a.prioridade === "urgente" && <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />}
                        {a.prioridade === "importante" && <Star className="w-4 h-4 text-gold shrink-0" />}
                        <h3 className="font-display font-semibold text-sm">{a.titulo}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.conteudo}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(a.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    {lido && <Check className="w-4 h-4 text-primary shrink-0 mt-1" />}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {(!avisos || avisos.length === 0) && (
            <p className="text-center text-muted-foreground py-8">Nenhum aviso publicado</p>
          )}
        </div>
      )}
    </div>
  );
}
