import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Music, Plus, Trash2, Upload, X, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { linhaInfo, linhaLabel } from "@/lib/linhaColors";
import { ListSkeleton } from "@/components/skeletons/LoadingSkeleton";

export default function Pontos() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [linha, setLinha] = useState<string>("none");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");

  const { data: pontos, isLoading } = useQuery({
    queryKey: ["pontos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pontos")
        .select("*")
        .order("titulo", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast({
        title: "Áudio muito grande",
        description: "Tamanho máximo: 15MB",
        variant: "destructive",
      });
      return;
    }
    setAudioFile(file);
  };

  const resetForm = () => {
    setEditing(null);
    setLinha("none");
    setAudioFile(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setLinha(p.linha ?? "none");
    setAudioFile(null);
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async (form: FormData) => {
      let audio_url: string | null | undefined = undefined;
      if (audioFile) {
        setUploading(true);
        const ext = audioFile.name.split(".").pop();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("pontos-audio")
          .upload(path, audioFile, { contentType: audioFile.type });
        if (upErr) throw upErr;
        audio_url = supabase.storage.from("pontos-audio").getPublicUrl(path).data
          .publicUrl;
        setUploading(false);
      }

      const payload: any = {
        titulo: (form.get("titulo") as string).trim(),
        letra: (form.get("letra") as string).trim(),
        linha: linha !== "none" ? linha : null,
      };
      if (audio_url !== undefined) payload.audio_url = audio_url;

      if (editing) {
        const { error } = await supabase
          .from("pontos")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        payload.criado_por = user!.id;
        const { error } = await supabase.from("pontos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pontos"] });
      setOpen(false);
      resetForm();
      toast({ title: editing ? "Ponto atualizado!" : "Ponto cadastrado!" });
    },
    onError: (e) => {
      setUploading(false);
      toast({
        title: "Erro",
        description: (e as Error).message,
        variant: "destructive",
      });
    },
  });

  const remove = useMutation({
    mutationFn: async (p: any) => {
      // tenta apagar áudio do storage
      if (p.audio_url) {
        try {
          const url = new URL(p.audio_url);
          const idx = url.pathname.indexOf("/pontos-audio/");
          if (idx >= 0) {
            const path = url.pathname.slice(idx + "/pontos-audio/".length);
            await supabase.storage.from("pontos-audio").remove([path]);
          }
        } catch {
          /* noop */
        }
      }
      const { error } = await supabase.from("pontos").delete().eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pontos"] });
      toast({ title: "Ponto removido" });
    },
  });

  const filtered = useMemo(() => {
    if (!pontos) return [];
    const s = search.trim().toLowerCase();
    if (!s) return pontos;
    return pontos.filter(
      (p: any) =>
        p.titulo.toLowerCase().includes(s) ||
        p.letra.toLowerCase().includes(s) ||
        (p.linha && linhaLabel[p.linha]?.toLowerCase().includes(s)),
    );
  }, [pontos, search]);

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-full bg-gradient-gold flex items-center justify-center shadow-glow-gold shrink-0">
            <Music className="w-4 h-4 text-vinho" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-lg sm:text-xl font-semibold leading-tight">
              Pontos Cantados
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Letras e áudios dos pontos da casa
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} size="sm" className="shrink-0">
            <Plus className="w-4 h-4 mr-1" /> Novo
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar ponto, letra ou linha..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : filtered.length === 0 ? (
        <Card className="bg-card border-border shadow-card gold-hairline">
          <CardContent className="p-8 text-center">
            <Music className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              {search ? "Nenhum ponto encontrado" : "Nenhum ponto cadastrado ainda"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((p: any) => {
            const cfg = linhaInfo(p.linha);
            return (
              <Card
                key={p.id}
                className="bg-card border-border shadow-card gold-hairline overflow-hidden"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-2xl">{cfg.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold leading-tight">
                        {p.titulo}
                      </h3>
                      {p.linha && (
                        <span
                          className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}
                        >
                          {cfg.label}
                        </span>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="text-[11px] text-muted-foreground hover:text-primary px-2 py-1 rounded-md hover:bg-secondary"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Excluir "${p.titulo}"?`)) remove.mutate(p);
                          }}
                          className="text-muted-foreground hover:text-destructive p-1.5 rounded-md hover:bg-secondary"
                          aria-label="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">
                    {p.letra}
                  </pre>

                  {p.audio_url && (
                    <audio
                      controls
                      preload="none"
                      src={p.audio_url}
                      className="w-full"
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog cadastrar/editar */}
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) resetForm();
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar ponto" : "Novo ponto"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate(new FormData(e.currentTarget));
            }}
            className="space-y-3"
          >
            <div>
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                name="titulo"
                required
                defaultValue={editing?.titulo ?? ""}
                placeholder="Ex: Ponto de Iansã"
              />
            </div>

            <div>
              <Label>Linha (opcional)</Label>
              <Select value={linha} onValueChange={setLinha}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a linha" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem linha específica</SelectItem>
                  {Object.entries(linhaLabel).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="letra">Letra *</Label>
              <Textarea
                id="letra"
                name="letra"
                required
                defaultValue={editing?.letra ?? ""}
                placeholder="Digite a letra do ponto..."
                rows={8}
              />
            </div>

            <div>
              <Label>Áudio (opcional, máx 15MB)</Label>
              {editing?.audio_url && !audioFile && (
                <div className="mb-2">
                  <audio controls src={editing.audio_url} className="w-full" />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Envie um novo arquivo para substituir
                  </p>
                </div>
              )}
              {audioFile ? (
                <div className="flex items-center justify-between gap-2 p-2 rounded-md border border-border bg-secondary/40">
                  <span className="text-xs truncate">{audioFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setAudioFile(null)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 px-3 py-3 rounded-md border border-dashed border-border cursor-pointer hover:bg-secondary/40 transition-colors text-sm text-muted-foreground">
                  <Upload className="w-4 h-4" />
                  Escolher áudio (mp3, m4a, wav...)
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={save.isPending || uploading}
                className="flex-1"
              >
                {uploading
                  ? "Enviando áudio..."
                  : save.isPending
                    ? "Salvando..."
                    : editing
                      ? "Salvar"
                      : "Cadastrar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
