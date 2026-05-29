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
import { Plus, Trash2, Leaf, Upload, X, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { linhaInfo, linhaLabel } from "@/lib/linhaColors";
import { ListSkeleton } from "@/components/skeletons/LoadingSkeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function ErvasBanhosTab({ isAdmin }: { isAdmin: boolean }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [linha, setLinha] = useState<string>("");
  const [eventoId, setEventoId] = useState<string>("none");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: ervas, isLoading } = useQuery({
    queryKey: ["ervas-banhos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ervas_banhos").select("*").order("dia_semana");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: eventosFuturos } = useQuery({
    queryKey: ["ervas-eventos-futuros"],
    queryFn: async () => {
      const { data } = await supabase
        .from("eventos")
        .select("id, titulo, data_inicio, tipo")
        .gte("data_inicio", new Date().toISOString())
        .order("data_inicio", { ascending: true })
        .limit(20);
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Imagem muito grande", description: "Máx 5MB", variant: "destructive" });
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const resetForm = () => {
    setLinha("");
    setEventoId("none");
    setImageFile(null);
    setImagePreview(null);
  };

  const create = useMutation({
    mutationFn: async (form: FormData) => {
      let imagem_url: string | null = null;
      if (imageFile) {
        setUploading(true);
        const ext = imageFile.name.split(".").pop();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("ervas").upload(path, imageFile);
        if (upErr) throw upErr;
        imagem_url = supabase.storage.from("ervas").getPublicUrl(path).data.publicUrl;
        setUploading(false);
      }
      const { error } = await supabase.from("ervas_banhos").insert({
        dia_semana: parseInt(form.get("dia_semana") as string, 10),
        linha: linha || null,
        evento_id: eventoId !== "none" ? eventoId : null,
        titulo: form.get("titulo") as string,
        descricao: (form.get("descricao") as string) || null,
        finalidade: (form.get("finalidade") as string) || null,
        imagem_url,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ervas-banhos"] });
      qc.invalidateQueries({ queryKey: ["banhos-do-evento"] });
      setOpen(false);
      resetForm();
      toast({ title: "Banho cadastrado!" });
    },
    onError: (e) => {
      setUploading(false);
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ervas_banhos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ervas-banhos"] });
      qc.invalidateQueries({ queryKey: ["banhos-do-evento"] });
    },
  });

  const grouped = (ervas ?? []).reduce<Record<number, any[]>>((acc, e: any) => {
    const d = e.dia_semana ?? 0;
    if (!acc[d]) acc[d] = [];
    acc[d].push(e);
    return acc;
  }, {});

  const eventosMap = new Map((eventosFuturos ?? []).map((e: any) => [e.id, e]));

  return (
    <div className="space-y-4 animate-fade-in-up">
      {isAdmin && (
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1 bg-gradient-vinho text-white">
                <Plus className="w-4 h-4" /> Banho
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
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
                <div>
                  <Label>Vincular a uma gira (opcional)</Label>
                  <Select value={eventoId} onValueChange={setEventoId}>
                    <SelectTrigger className="bg-secondary"><SelectValue placeholder="Sem vínculo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem vínculo</SelectItem>
                      {(eventosFuturos ?? []).map((e: any) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.titulo} — {format(new Date(e.data_inicio), "dd/MM HH:mm", { locale: ptBR })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Se vinculado, aparece "Banho disponível" no card da próxima gira.
                  </p>
                </div>
                <div><Label>Título</Label><Input name="titulo" required className="bg-secondary" placeholder="Ex.: Banho de descarrego" /></div>
                <div><Label>Finalidade</Label><Input name="finalidade" className="bg-secondary" placeholder="Ex.: Limpeza energética" /></div>
                <div><Label>Descrição / ervas</Label><Textarea name="descricao" rows={4} className="bg-secondary" placeholder="Ervas, modo de preparo..." /></div>
                <div>
                  <Label>Foto da erva / banho (opcional)</Label>
                  {imagePreview ? (
                    <div className="relative mt-2 rounded-lg overflow-hidden border border-border">
                      <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover" />
                      <button
                        type="button"
                        onClick={() => { setImageFile(null); setImagePreview(null); }}
                        className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="mt-2 flex items-center justify-center gap-2 h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-secondary/40 transition">
                      <Upload className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Escolher imagem</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    </label>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={create.isPending || uploading}>
                  {uploading ? "Enviando imagem..." : create.isPending ? "Salvando..." : "Salvar"}
                </Button>
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
          const items = grouped[idx] ?? [];
          if (items.length === 0) return null;
          return (
            <div key={idx} className="space-y-2">
              <h3 className="font-display text-sm font-semibold text-gradient-vinho uppercase tracking-wider">{dia}</h3>
              {items.map((e: any) => {
                const cfg = linhaInfo(e.linha);
                const evento = e.evento_id ? eventosMap.get(e.evento_id) : null;
                return (
                  <Card key={e.id} className="bg-card border-border shadow-card hover-lift gold-hairline overflow-hidden">
                    {e.imagem_url && (
                      <button type="button" onClick={() => setLightbox(e.imagem_url)} className="block w-full">
                        <img src={e.imagem_url} alt={e.titulo} className="w-full max-h-64 object-cover hover:opacity-90 transition cursor-zoom-in" loading="lazy" />
                      </button>
                    )}
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
                        <div className="flex flex-wrap gap-1 mt-1">
                          {e.linha && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${cfg.badge}`}>
                              {cfg.label}
                            </span>
                          )}
                          {evento && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/15 text-gold dark:text-accent border border-gold/40 font-semibold inline-flex items-center gap-1">
                              <CalendarDays className="w-3 h-3" />
                              {(evento as any).titulo}
                            </span>
                          )}
                        </div>
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

      <Dialog open={!!lightbox} onOpenChange={(v) => !v && setLightbox(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 bg-background border-border overflow-auto">
          <DialogHeader className="sr-only"><DialogTitle>Imagem</DialogTitle></DialogHeader>
          {lightbox && <img src={lightbox} alt="" className="w-full h-auto object-contain max-h-[90vh] mx-auto" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
