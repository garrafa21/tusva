import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Leaf } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { linhaInfo, linhaLabel } from "@/lib/linhaColors";
import { ListSkeleton } from "@/components/skeletons/LoadingSkeleton";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function ErvasBanhosTab({ isAdmin }: { isAdmin: boolean }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [linha, setLinha] = useState<string>("");

  const { data: ervas, isLoading } = useQuery({
    queryKey: ["ervas-banhos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ervas_banhos").select("*").order("dia_semana");
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (form: FormData) => {
      const { error } = await supabase.from("ervas_banhos").insert({
        dia_semana: parseInt(form.get("dia_semana") as string, 10),
        linha: linha || null,
        titulo: form.get("titulo") as string,
        descricao: (form.get("descricao") as string) || null,
        finalidade: (form.get("finalidade") as string) || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ervas-banhos"] });
      setOpen(false);
      setLinha("");
      toast({ title: "Banho cadastrado!" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ervas_banhos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ervas-banhos"] }),
  });

  const grouped = (ervas ?? []).reduce<Record<number, typeof ervas>>((acc, e) => {
    const d = e.dia_semana ?? 0;
    if (!acc[d]) acc[d] = [] as any;
    (acc[d] as any).push(e);
    return acc;
  }, {});

  return (
    <div className="space-y-4 animate-fade-in-up">
      {isAdmin && (
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1 bg-gradient-vinho text-white">
                <Plus className="w-4 h-4" /> Banho
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="font-display">Novo banho / erva</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  create.mutate(new FormData(e.currentTarget));
                }}
                className="space-y-3"
              >
                <div>
                  <Label>Dia da semana</Label>
                  <Select name="dia_semana" defaultValue="1">
                    <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DIAS.map((d, i) => (
                        <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Linha (opcional)</Label>
                  <Select value={linha} onValueChange={setLinha}>
                    <SelectTrigger className="bg-secondary"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(linhaLabel).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Título</Label><Input name="titulo" required className="bg-secondary" placeholder="Ex.: Banho de descarrego" /></div>
                <div><Label>Finalidade</Label><Input name="finalidade" className="bg-secondary" placeholder="Ex.: Limpeza energética" /></div>
                <div><Label>Descrição / ervas</Label><Textarea name="descricao" rows={4} className="bg-secondary" placeholder="Ervas, modo de preparo..." /></div>
                <Button type="submit" className="w-full" disabled={create.isPending}>{create.isPending ? "Salvando..." : "Salvar"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {isLoading ? (
        <ListSkeleton count={3} />
      ) : (ervas?.length ?? 0) === 0 ? (
        <Card className="bg-card border-border shadow-card gold-hairline">
          <CardContent className="p-8 text-center text-muted-foreground">
            <Leaf className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm">Nenhum banho cadastrado ainda.</p>
          </CardContent>
        </Card>
      ) : (
        DIAS.map((dia, idx) => {
          const items = (grouped[idx] ?? []) as any[];
          if (items.length === 0) return null;
          return (
            <div key={idx} className="space-y-2">
              <h3 className="font-display text-sm font-semibold text-gradient-vinho uppercase tracking-wider">{dia}</h3>
              {items.map((e) => {
                const cfg = linhaInfo(e.linha);
                return (
                  <Card key={e.id} className="bg-card border-border shadow-card hover-lift gold-hairline overflow-hidden">
                    <CardContent className="p-4 flex gap-3">
                      <div className={`w-10 h-10 rounded-full ${cfg.gradient} flex items-center justify-center text-lg shrink-0 shadow-card`}>
                        <span>{cfg.emoji}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <h4 className="font-display font-semibold text-sm">{e.titulo}</h4>
                          {isAdmin && (
                            <button
                              onClick={() => { if (confirm("Excluir?")) remove.mutate(e.id); }}
                              className="text-muted-foreground hover:text-destructive shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {e.linha && (
                          <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full mt-1 ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                        )}
                        {e.finalidade && <p className="text-xs text-muted-foreground mt-1"><span className="font-medium text-foreground">Finalidade:</span> {e.finalidade}</p>}
                        {e.descricao && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{e.descricao}</p>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          );
        })
      )}
    </div>
  );
}
