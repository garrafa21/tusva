import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, CheckCircle, AlertTriangle, Clock, Copy } from "lucide-react";
import { format, addMonths, startOfMonth, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";

const PIX_KEY = "terreirotusva@gmail.com";
const VALOR_MENSALIDADE = 150;

export default function Financeiro() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [diaPreferido, setDiaPreferido] = useState<string>("10");

  // Fetch user's mensalidades
  const { data: mensalidades, isLoading } = useQuery({
    queryKey: ["mensalidades", isAdmin ? "all" : user?.id],
    queryFn: async () => {
      let query = supabase.from("mensalidades").select("*").order("mes_referencia", { ascending: false });
      if (!isAdmin) query = query.eq("user_id", user!.id);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch all profiles for admin view
  const { data: profiles } = useQuery({
    queryKey: ["profiles-financeiro"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*");
      return data ?? [];
    },
    enabled: isAdmin,
  });

  // Generate current month's mensalidade if not exists
  const gerarMensalidade = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const mesRef = format(now, "yyyy-MM");
      const dia = parseInt(diaPreferido);
      const vencimento = new Date(now.getFullYear(), now.getMonth(), dia);

      const { error } = await supabase.from("mensalidades").insert({
        user_id: user!.id,
        mes_referencia: mesRef,
        data_vencimento: format(vencimento, "yyyy-MM-dd"),
      });
      if (error) {
        if (error.code === "23505") throw new Error("Mensalidade deste mês já existe");
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mensalidades"] });
      toast({ title: "Mensalidade gerada!" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  // Admin: mark as paid
  const marcarPago = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mensalidades").update({
        status: "pago",
        data_pagamento: format(new Date(), "yyyy-MM-dd"),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mensalidades"] });
      toast({ title: "Marcado como pago!" });
    },
  });

  const copyPix = () => {
    navigator.clipboard.writeText(PIX_KEY);
    toast({ title: "Chave PIX copiada!", description: PIX_KEY });
  };

  const now = new Date();
  const mesAtual = format(now, "yyyy-MM");
  const mensalidadeAtual = mensalidades?.find((m) => m.mes_referencia === mesAtual && m.user_id === user?.id);

  const getStatusBadge = (status: string, dataVencimento: string) => {
    if (status === "pago") return <Badge className="bg-primary/20 text-primary border-0"><CheckCircle className="w-3 h-3 mr-1" /> Pago</Badge>;
    if (isBefore(new Date(dataVencimento), now) && status !== "pago") return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" /> Atrasado</Badge>;
    return <Badge className="bg-accent/20 text-accent-foreground border-0"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
  };

  const getProfileName = (userId: string) => profiles?.find((p) => p.user_id === userId)?.nome ?? "—";

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <h1 className="font-display text-xl font-bold flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-primary" /> Financeiro
      </h1>

      {/* PIX Card */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-2">Chave PIX para pagamento:</p>
          <div className="flex items-center gap-2 bg-secondary rounded-lg p-3">
            <code className="text-sm flex-1 break-all">{PIX_KEY}</code>
            <Button size="sm" variant="ghost" onClick={copyPix}><Copy className="w-4 h-4" /></Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Mensalidade: <span className="font-semibold text-foreground">R$ {VALOR_MENSALIDADE},00</span></p>
        </CardContent>
      </Card>

      {!isAdmin && (
        <>
          {/* Generate mensalidade */}
          {!mensalidadeAtual && (
            <Card className="bg-card border-border">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium">Escolha o melhor dia para pagar este mês:</p>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="text-xs">Dia do vencimento</Label>
                    <Select value={diaPreferido} onValueChange={setDiaPreferido}>
                      <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                          <SelectItem key={d} value={String(d)}>Dia {d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => gerarMensalidade.mutate()} disabled={gerarMensalidade.isPending}>
                    {gerarMensalidade.isPending ? "..." : "Confirmar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current status */}
          {mensalidadeAtual && (
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {format(new Date(mesAtual + "-01"), "MMMM yyyy", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Vence dia {format(new Date(mensalidadeAtual.data_vencimento), "dd/MM")}
                    </p>
                  </div>
                  {getStatusBadge(mensalidadeAtual.status, mensalidadeAtual.data_vencimento)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* History */}
          <h2 className="text-sm font-medium text-muted-foreground">Histórico</h2>
          <div className="space-y-2">
            {mensalidades?.filter((m) => m.user_id === user?.id).map((m) => (
              <Card key={m.id} className="bg-card border-border">
                <CardContent className="p-3 flex items-center justify-between">
                  <span className="text-sm capitalize">
                    {format(new Date(m.mes_referencia + "-01"), "MMMM yyyy", { locale: ptBR })}
                  </span>
                  {getStatusBadge(m.status, m.data_vencimento)}
                </CardContent>
              </Card>
            ))}
            {(!mensalidades || mensalidades.filter((m) => m.user_id === user?.id).length === 0) && (
              <p className="text-center text-muted-foreground py-4 text-sm">Nenhuma mensalidade registrada</p>
            )}
          </div>
        </>
      )}

      {/* Admin view */}
      {isAdmin && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">Visão Geral — {format(now, "MMMM yyyy", { locale: ptBR })}</h2>
          {profiles?.map((p) => {
            const m = mensalidades?.find((m) => m.user_id === p.user_id && m.mes_referencia === mesAtual);
            return (
              <Card key={p.id} className="bg-card border-border">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{p.nome}</p>
                      {m && <p className="text-xs text-muted-foreground">Vence dia {format(new Date(m.data_vencimento), "dd/MM")}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {m ? (
                        <>
                          {getStatusBadge(m.status, m.data_vencimento)}
                          {m.status !== "pago" && (
                            <Button size="sm" variant="outline" onClick={() => marcarPago.mutate(m.id)}>
                              <CheckCircle className="w-3 h-3 mr-1" /> Pago
                            </Button>
                          )}
                        </>
                      ) : (
                        <Badge variant="secondary">Não gerado</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
