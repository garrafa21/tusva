import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { User, Camera, Bell } from "lucide-react";

export default function Perfil() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [nome, setNome] = useState(profile?.nome ?? "");
  const [nomeEsp, setNomeEsp] = useState(profile?.nome_espiritual ?? "");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    typeof Notification !== "undefined" && Notification.permission === "granted"
  );

  const avatarUrl = profile?.avatar_url;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("profiles").update({ nome, nome_espiritual: nomeEsp || null }).eq("user_id", user!.id);
    setLoading(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Perfil atualizado!" });
      window.location.reload();
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setUploading(false);
      toast({ title: "Erro no upload", description: uploadError.message, variant: "destructive" });
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("user_id", user.id);

    setUploading(false);
    if (updateError) {
      toast({ title: "Erro", description: updateError.message, variant: "destructive" });
    } else {
      toast({ title: "Foto atualizada!" });
      window.location.reload();
    }
  };

  const handleNotificationToggle = async (checked: boolean) => {
    if (checked) {
      if (typeof Notification === "undefined") {
        toast({ title: "Notificações não suportadas neste navegador", variant: "destructive" });
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationsEnabled(true);
        toast({ title: "Notificações ativadas!" });
      } else {
        toast({ title: "Permissão negada", description: "Ative nas configurações do navegador", variant: "destructive" });
      }
    } else {
      setNotificationsEnabled(false);
      toast({ title: "Notificações desativadas" });
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="font-display text-xl font-bold flex items-center gap-2 mb-6">
        <User className="w-5 h-5 text-primary" /> Meu Perfil
      </h1>

      {/* Avatar */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-secondary flex items-center justify-center border-2 border-primary/30">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-muted-foreground" />
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
          >
            <Camera className="w-4 h-4" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </div>
      </div>
      {uploading && <p className="text-center text-xs text-muted-foreground mb-4">Enviando foto...</p>}

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

      {/* Notifications */}
      <Card className="bg-card border-border mt-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Notificações</p>
                <p className="text-xs text-muted-foreground">Receber avisos e lembretes</p>
              </div>
            </div>
            <Switch checked={notificationsEnabled} onCheckedChange={handleNotificationToggle} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
