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
import { BookOpen, Plus, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Estudos() {
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [openCat, setOpenCat] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const { data: categorias } = useQuery({
    queryKey: ["categorias-estudo"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categorias_estudo").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: estudos, isLoading } = useQuery({
    queryKey: ["estudos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("estudos").select("*, categorias_estudo(nome)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createCategoria = useMutation({
    mutationFn: async (form: FormData) => {
      const { error } = await supabase.from("categorias_estudo").insert({ nome: form.get("nome") as string, descricao: (form.get("descricao") as string) || null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias-estudo"] });
      setOpenCat(false);
      toast({ title: "Categoria criada!" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const createEstudo = useMutation({
    mutationFn: async (form: FormData) => {
      const catId = form.get("categoria_id") as string;
      const { error } = await supabase.from("estudos").insert({
        titulo: form.get("titulo") as string,
        conteudo: form.get("conteudo") as string,
        categoria_id: catId || null,
        imagem_url: (form.get("imagem_url") as string) || null,
        criado_por: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estudos"] });
      setOpen(false);
      toast({ title: "Estudo publicado!" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const selectedEstudo = estudos?.find((e) => e.id === selected);

  if (selectedEstudo) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        {selectedEstudo.imagem_url && (
          <img src={selectedEstudo.imagem_url} alt={selectedEstudo.titulo} className="w-full h-48 object-cover rounded-lg mb-4" />
        )}
        <span className="text-xs text-primary bg-primary/20 px-2 py-0.5 rounded-full">
          {(selectedEstudo as any).categorias_estudo?.nome || "Sem categoria"}
        </span>
        <h1 className="font-display text-xl font-bold mt-2">{selectedEstudo.titulo}</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {format(new Date(selectedEstudo.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
        <div className="mt-4 text-sm leading-relaxed whitespace-pre-wrap">{selectedEstudo.conteudo}</div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-xl font-bold flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" /> Estudos
        </h1>
        {isAdmin && (
          <div className="flex gap-2">
            <Dialog open={openCat} onOpenChange={setOpenCat}>
              <DialogTrigger asChild><Button variant="outline" size="sm">+ Categoria</Button></DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader><DialogTitle className="font-display">Nova Categoria</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createCategoria.mutate(new FormData(e.currentTarget)); }} className="space-y-3">
                  <div><Label>Nome</Label><Input name="nome" required className="bg-secondary" placeholder="Ex: Firmezas" /></div>
                  <div><Label>Descrição (opcional)</Label><Textarea name="descricao" className="bg-secondary" /></div>
                  <Button type="submit" className="w-full" disabled={createCategoria.isPending}>Criar</Button>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> Novo</Button></DialogTrigger>
              <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="font-display">Novo Estudo</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createEstudo.mutate(new FormData(e.currentTarget)); }} className="space-y-3">
                  <div><Label>Título</Label><Input name="titulo" required className="bg-secondary" /></div>
                  <div><Label>Categoria</Label>
                    <Select name="categoria_id">
                      <SelectTrigger className="bg-secondary"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>{categorias?.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>URL da Imagem (opcional)</Label><Input name="imagem_url" className="bg-secondary" placeholder="https://..." /></div>
                  <div><Label>Conteúdo</Label><Textarea name="conteudo" required className="bg-secondary" rows={8} /></div>
                  <Button type="submit" className="w-full" disabled={createEstudo.isPending}>
                    {createEstudo.isPending ? "Publicando..." : "Publicar Estudo"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Category filters */}
      {categorias && categorias.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {categorias.map((c) => (
            <button key={c.id} className="text-xs px-3 py-1 rounded-full bg-secondary hover:bg-primary/20 text-muted-foreground hover:text-primary whitespace-nowrap transition-colors">
              {c.nome}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {estudos?.map((e) => (
            <Card key={e.id} className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setSelected(e.id)}>
              <CardContent className="p-4 flex gap-3">
                {e.imagem_url && <img src={e.imagem_url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />}
                <div className="min-w-0">
                  <span className="text-xs text-primary">{(e as any).categorias_estudo?.nome || "Sem categoria"}</span>
                  <h3 className="font-display font-semibold text-sm truncate">{e.titulo}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{e.conteudo}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {(!estudos || estudos.length === 0) && (
            <p className="text-center text-muted-foreground py-8">Nenhum estudo publicado</p>
          )}
        </div>
      )}
    </div>
  );
}
