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
import { Sparkles, Plus, Users } from "lucide-react";

const CATEGORIAS = [
  "Caboclos", "Pretos Velhos", "Erês", "Baianos",
  "Marinheiros", "Boiadeiros", "Ciganos", "Malandragem", "Esquerda"
];

const categoriaEmoji: Record<string, string> = {
  "Caboclos": "🪶",
  "Pretos Velhos": "🕯️",
  "Erês": "🍭",
  "Baianos": "🌴",
  "Marinheiros": "⚓",
  "Boiadeiros": "🐂",
  "Ciganos": "🔮",
  "Malandragem": "🎩",
  "Esquerda": "🔥",
};

export default function Entidades() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas");

  const { data: entidades, isLoading } = useQuery({
    queryKey: ["entidades"],
    queryFn: async () => {
      const { data, error } = await supabase.from("entidades").select("*").order("categoria").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const createEntidade = useMutation({
    mutationFn: async (form: FormData) => {
      const { error } = await supabase.from("entidades").insert({
        nome: form.get("nome") as string,
        categoria: form.get("categoria") as string,
        descricao: (form.get("descricao") as string) || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entidades"] });
      setOpen(false);
      toast({ title: "Entidade adicionada!" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const grouped = CATEGORIAS.reduce((acc, cat) => {
    const items = entidades?.filter((e) => e.categoria === cat) ?? [];
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {} as Record<string, typeof entidades>);

  const filteredCategories = categoriaFiltro === "todas"
    ? Object.entries(grouped)
    : Object.entries(grouped).filter(([cat]) => cat === categoriaFiltro);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-xl font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" /> Entidades
        </h1>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> Nova</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle className="font-display">Nova Entidade</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createEntidade.mutate(new FormData(e.currentTarget)); }} className="space-y-3">
                <div><Label>Nome</Label><Input name="nome" required className="bg-secondary" /></div>
                <div><Label>Categoria</Label>
                  <Select name="categoria" defaultValue="Caboclos">
                    <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{categoriaEmoji[c]} {c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Descrição (opcional)</Label><Textarea name="descricao" className="bg-secondary" /></div>
                <Button type="submit" className="w-full" disabled={createEntidade.isPending}>
                  {createEntidade.isPending ? "Adicionando..." : "Adicionar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filter */}
      <div className="mb-4">
        <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
          <SelectTrigger className="bg-secondary"><SelectValue placeholder="Filtrar por categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{categoriaEmoji[c]} {c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-6">
          {filteredCategories.map(([categoria, items]) => (
            <div key={categoria}>
              <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                <span>{categoriaEmoji[categoria]}</span> {categoria}
                <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{items!.length}</span>
              </h2>
              <div className="grid gap-2">
                {items!.map((e) => (
                  <Card key={e.id} className="bg-card border-border">
                    <CardContent className="p-3">
                      <p className="font-medium text-sm">{e.nome}</p>
                      {e.descricao && <p className="text-xs text-muted-foreground mt-1">{e.descricao}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
          {filteredCategories.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Nenhuma entidade cadastrada</p>
          )}
        </div>
      )}
    </div>
  );
}
