import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { User, Camera, Bell, Lock } from "lucide-react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";

async function getCroppedImg(imageSrc: string, crop: Area): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  await new Promise((resolve) => { image.onload = resolve; image.src = imageSrc; });
  const canvas = document.createElement("canvas");
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.9));
}

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

  // Crop state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const avatarUrl = profile?.avatar_url;

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setCropDialogOpen(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropSave = async () => {
    if (!imageSrc || !croppedAreaPixels || !user) return;
    setUploading(true);
    setCropDialogOpen(false);

    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const filePath = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, blob, { upsert: true, contentType: "image/jpeg" });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
      if (updateError) throw updateError;

      toast({ title: "Foto atualizada!" });
      window.location.reload();
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

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

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Senha muito curta", description: "Mínimo 6 caracteres", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Senhas não coincidem", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Senha alterada com sucesso!" });
      setNewPassword("");
      setConfirmPassword("");
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
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        </div>
      </div>
      {uploading && <p className="text-center text-xs text-muted-foreground mb-4">Enviando foto...</p>}

      {/* Crop Dialog */}
      <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader><DialogTitle className="font-display">Ajustar Foto</DialogTitle></DialogHeader>
          <div className="relative w-full h-64 bg-black rounded-lg overflow-hidden">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">Zoom</span>
            <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1" />
          </div>
          <Button className="w-full mt-2" onClick={handleCropSave} disabled={uploading}>
            {uploading ? "Salvando..." : "Salvar Foto"}
          </Button>
        </DialogContent>
      </Dialog>

      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <form onSubmit={handleSave} className="space-y-4">
            <div><Label>Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} required className="bg-secondary" /></div>
            <div><Label>Nome Espiritual</Label><Input value={nomeEsp} onChange={(e) => setNomeEsp(e.target.value)} className="bg-secondary" placeholder="Opcional" /></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="bg-card border-border mt-4">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-4 h-4 text-primary" />
            <p className="text-sm font-medium">Alterar Senha</p>
          </div>
          <div><Label>Nova senha</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-secondary" placeholder="Mínimo 6 caracteres" /></div>
          <div><Label>Confirmar nova senha</Label><Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-secondary" placeholder="Repita a senha" /></div>
          <Button className="w-full" onClick={handleChangePassword} disabled={changingPassword || !newPassword}>
            {changingPassword ? "Alterando..." : "Alterar Senha"}
          </Button>
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
