import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, CheckCircle, AlertTriangle, Clock, Copy, CalendarDays } from "lucide-react";
import { format, isBefore, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

const PIX_KEY = "terreirotusva@gmail.com";
const VALOR_MENSALIDADE = 150;

// Generate last 12 months for the calendar view
function getLast12Months() {
  const months: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = subMonths(now, i);
    months.push(format(d, "yyyy-MM"));
  }
  return months;
}

function parseYearMonthLocal(mesRef: string) {
  const [year, month] = mesRef.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function parseDateOnlyLocal(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export default function Financeiro() {
  const { user, isAdmin, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [diaPreferido, setDiaPreferido] = useState<string>("");
  const [showDiaPicker, setShowDiaPicker] = useState(false);

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

  const { data: profiles } = useQuery({
    queryKey: ["profiles-financeiro"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*");
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const gerarMensalidade = useMutation({
    mutationFn: async (mesRef: string) => {
      const dia = parseInt(diaPreferido);
      const [year, month] = mesRef.split("-").map(Number);
      const vencimento = new Date(year, month - 1, dia);

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
      toast({ title: "Mensalidade registrada!" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

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
  const last12 = getLast12Months();
  const userMensalidades = mensalidades?.filter((m) => m.user_id === user?.id) ?? [];

  // Check if user has set preferred day (has any mensalidade)
  const hasPreferredDay = userMensalidades.length > 0;

  const getMonthStatus = (mesRef: string) => {
    const m = userMensalidades.find((m) => m.mes_referencia === mesRef);
    if (!m) return "nao_gerado";
    if (m.status === "pago") return "pago";
    if (isBefore(parseDateOnlyLocal(m.data_vencimento), now)) return "atrasado";
    return "pendente";
  };

  const getMonthMensalidade = (mesRef: string) => {
    return userMensalidades.find((m) => m.mes_referencia === mesRef);
  };

  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    pago: { bg: "bg-green-500", text: "text-green-700", label: "Pago ✓" },
    pendente: { bg: "bg-yellow-500", text: "text-yellow-700", label: "Pendente" },
    atrasado: { bg: "bg-destructive", text: "text-destructive", label: "Atrasado!" },
    nao_gerado: { bg: "bg-muted", text: "text-muted-foreground", label: "—" },
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
          {/* Preferred day selection - always show if not set */}
          {(!hasPreferredDay || showDiaPicker) && (
            <Card className="bg-card border-border border-primary/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-primary" />
                  <p className="text-sm font-medium">Qual o melhor dia do mês para você pagar?</p>
                </div>
                <p className="text-xs text-muted-foreground">Escolha o dia de vencimento da sua mensalidade</p>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="text-xs">Dia do vencimento</Label>
                    <Select value={diaPreferido} onValueChange={setDiaPreferido}>
                      <SelectTrigger className="bg-secondary"><SelectValue placeholder="Selecione o dia" /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                          <SelectItem key={d} value={String(d)}>Dia {d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => {
                      if (!diaPreferido) {
                        toast({ title: "Selecione um dia", variant: "destructive" });
                        return;
                      }
                      // Generate mensalidade for current month
                      const mesRef = format(now, "yyyy-MM");
                      gerarMensalidade.mutate(mesRef);
                      setShowDiaPicker(false);
                    }}
                    disabled={gerarMensalidade.isPending || !diaPreferido}
                  >
                    {gerarMensalidade.isPending ? "..." : "Confirmar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Monthly Calendar View */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CalendarDays className="w-4 h-4" /> Seus pagamentos
              </h2>
              {hasPreferredDay && !showDiaPicker && (
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => setShowDiaPicker(true)}>
                  Alterar dia
                </Button>
              )}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {last12.map((mesRef) => {
                const status = getMonthStatus(mesRef);
                const config = statusConfig[status];
                const m = getMonthMensalidade(mesRef);
                const mesLabel = format(new Date(mesRef + "-01"), "MMM", { locale: ptBR });
                const anoLabel = format(new Date(mesRef + "-01"), "yyyy");
                const isCurrent = mesRef === format(now, "yyyy-MM");

                return (
                  <Card
                    key={mesRef}
                    className={`bg-card border-border transition-all ${isCurrent ? "ring-2 ring-primary/50" : ""}`}
                  >
                    <CardContent className="p-3 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase">{anoLabel}</p>
                      <p className="text-sm font-semibold capitalize">{mesLabel}</p>
                      <div className={`mt-1.5 inline-block w-3 h-3 rounded-full ${config.bg}`} />
                      <p className={`text-[10px] mt-1 font-medium ${config.text}`}>{config.label}</p>
                      {status === "nao_gerado" && hasPreferredDay && isCurrent && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-1 text-[10px] h-6 px-2"
                          onClick={() => gerarMensalidade.mutate(mesRef)}
                          disabled={gerarMensalidade.isPending}
                        >
                          Gerar
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Status legend */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Pago</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> Pendente</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-destructive" /> Atrasado</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-muted" /> Não registrado</span>
          </div>
        </>
      )}

      {/* Admin view */}
      {isAdmin && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">Visão Geral — {format(now, "MMMM yyyy", { locale: ptBR })}</h2>
          {profiles?.map((p) => {
            const mesAtual = format(now, "yyyy-MM");
            const m = mensalidades?.find((m) => m.user_id === p.user_id && m.mes_referencia === mesAtual);
            const status = m ? (m.status === "pago" ? "pago" : (isBefore(new Date(m.data_vencimento), now) ? "atrasado" : "pendente")) : "nao_gerado";
            const config = statusConfig[status];

            return (
              <Card key={p.id} className="bg-card border-border">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${config.bg}`} />
                      <div>
                        <p className="text-sm font-medium">{p.nome}</p>
                        {m && <p className="text-xs text-muted-foreground">Vence dia {format(new Date(m.data_vencimento), "dd/MM")}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${config.text}`}>{config.label}</span>
                      {m && m.status !== "pago" && (
                        <Button size="sm" variant="outline" onClick={() => marcarPago.mutate(m.id)}>
                          <CheckCircle className="w-3 h-3 mr-1" /> Pago
                        </Button>
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
