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
import { Calendar, Plus, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const tipoLabel: Record<string, string> = {
  gira: "Gira", festa: "Festa", reuniao: "Reunião",
  desenvolvimento: "Desenvolvimento", outro: "Outro"
};
const tipoCor: Record<string, string> = {
  gira: "bg-primary/20 text-primary",
  festa: "bg-accent/20 text-accent-foreground",
  reuniao: "bg-blue-500/20 text-blue-500",
  desenvolvimento: "bg-green-500/20 text-green-600",
  outro: "bg-secondary text-muted-foreground"
};

export default function Calendario() {
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: eventos, isLoading } = useQuery({
    queryKey: ["eventos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("eventos").select("*").order("data_inicio", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const createEvento = useMutation({
    mutationFn: async (form: FormData) => {
      const dia = form.get("dia") as string; // MM-DD
      const hora = form.get("hora") as string; // HH:mm
      const year = new Date().getFullYear();
      const dataInicio = `${year}-${dia}T${hora}:00`;

      const { error } = await supabase.from("eventos").insert({
        titulo: form.get("titulo") as string,
        descricao: (form.get("descricao") as string) || null,
        tipo: form.get("tipo") as any,
        data_inicio: dataInicio,
        criado_por: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos"] });
      queryClient.invalidateQueries({ queryKey: ["proximo-evento"] });
      setOpen(false);
      toast({ title: "Evento criado!" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const now = new Date();
  const futuros = eventos?.filter((e) => new Date(e.data_inicio) >= now) ?? [];
  const passados = eventos?.filter((e) => new Date(e.data_inicio) < now) ?? [];

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-xl font-bold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" /> Calendário
        </h1>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> Novo</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle className="font-display">Novo Evento</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createEvento.mutate(new FormData(e.currentTarget)); }} className="space-y-3">
                <div><Label>Título</Label><Input name="titulo" required className="bg-secondary" /></div>
                <div><Label>Tipo</Label>
                  <Select name="tipo" defaultValue="gira">
                    <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(tipoLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Dia (mês/dia)</Label><Input name="dia" type="text" placeholder="03-15" required className="bg-secondary" pattern="\d{2}-\d{2}" title="Formato: MM-DD (ex: 03-15)" /></div>
                  <div><Label>Horário</Label><Input name="hora" type="time" required className="bg-secondary" defaultValue="19:00" /></div>
                </div>
                <div><Label>Descrição (opcional)</Label><Textarea name="descricao" className="bg-secondary" /></div>
                <Button type="submit" className="w-full" disabled={createEvento.isPending}>
                  {createEvento.isPending ? "Criando..." : "Criar Evento"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-6">
          {futuros.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Próximos Eventos</h2>
              <div className="space-y-3">
                {futuros.map((e) => (
                  <Card key={e.id} className="bg-card border-border">
                    <CardContent className="p-4">
                      <div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${tipoCor[e.tipo]}`}>{tipoLabel[e.tipo] ?? e.tipo}</span>
                        <h3 className="font-display font-semibold mt-1">{e.titulo}</h3>
                        {e.descricao && <p className="text-sm text-muted-foreground mt-1">{e.descricao}</p>}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(e.data_inicio), "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {passados.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Eventos Passados</h2>
              <div className="space-y-3 opacity-60">
                {passados.slice(-5).map((e) => (
                  <Card key={e.id} className="bg-card border-border">
                    <CardContent className="p-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${tipoCor[e.tipo]}`}>{tipoLabel[e.tipo] ?? e.tipo}</span>
                      <h3 className="font-display font-semibold mt-1">{e.titulo}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(e.data_inicio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {futuros.length === 0 && passados.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Nenhum evento cadastrado</p>
          )}
        </div>
      )}
    </div>
  );
}
