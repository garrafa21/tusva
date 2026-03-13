import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Copy, CalendarDays } from "lucide-react";
import { format, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";

const PIX_KEY = "terreirotusva@gmail.com";
const VALOR_MENSALIDADE = 150;

function getCurrentYearMonths(year: number) {
  const months: string[] = [];
  for (let month = 1; month <= 12; month++) {
    months.push(`${year}-${String(month).padStart(2, "0")}`);
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
  const { user, isAdmin } = useAuth();
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

  const reportarStatus = useMutation({
    mutationFn: async (status: "paguei" | "vou_atrasar") => {
      const mesAtual = format(new Date(), "yyyy-MM");
      const mensalidadeAtual = (mensalidades ?? []).find((m) => m.user_id === user?.id && m.mes_referencia === mesAtual);
      if (!mensalidadeAtual) throw new Error("Gere a mensalidade deste mês primeiro");

      const { error } = await supabase.rpc("set_mensalidade_status" as any, {
        _mensalidade_id: mensalidadeAtual.id,
        _status: status,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mensalidades"] });
      toast({ title: "Status enviado para a mãe de santo!" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const copyPix = () => {
    navigator.clipboard.writeText(PIX_KEY);
    toast({ title: "Chave PIX copiada!", description: PIX_KEY });
  };

  const now = new Date();
  const monthsOfYear = getCurrentYearMonths();
  const userMensalidades = mensalidades?.filter((m) => m.user_id === user?.id) ?? [];
  const mesAtualRef = format(now, "yyyy-MM");

  const hasPreferredDay = userMensalidades.length > 0;

  const getMonthStatus = (mesRef: string) => {
    const m = userMensalidades.find((item) => item.mes_referencia === mesRef);
    if (!m) return "nao_gerado";
    if (m.status === "pago") return "pago_validado";
    if (m.status === "paguei") return "paguei";
    if (m.status === "vou_atrasar") return "vou_atrasar";
    if (isBefore(parseDateOnlyLocal(m.data_vencimento), now)) return "atrasado";
    return "pendente";
  };

  const getMonthMensalidade = (mesRef: string) => userMensalidades.find((m) => m.mes_referencia === mesRef);

  const statusConfig: Record<string, { dot: string; text: string; label: string }> = {
    pago_validado: { dot: "bg-primary", text: "text-primary", label: "Pago validado" },
    paguei: { dot: "bg-accent", text: "text-accent-foreground", label: "Paguei" },
    vou_atrasar: { dot: "bg-destructive", text: "text-destructive", label: "Vou atrasar" },
    pendente: { dot: "bg-secondary", text: "text-muted-foreground", label: "Pendente" },
    atrasado: { dot: "bg-destructive", text: "text-destructive", label: "Atrasado" },
    nao_gerado: { dot: "bg-muted", text: "text-muted-foreground", label: "—" },
  };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <h1 className="font-display text-xl font-bold flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-primary" /> Financeiro
      </h1>

      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-2">Chave PIX para pagamento:</p>
          <div className="flex items-center gap-2 bg-secondary rounded-lg p-3">
            <code className="text-sm flex-1 break-all">{PIX_KEY}</code>
            <Button size="sm" variant="ghost" onClick={copyPix}><Copy className="w-4 h-4" /></Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Mensalidade: <span className="font-semibold text-foreground">R$ {VALOR_MENSALIDADE},00</span>
          </p>
        </CardContent>
      </Card>

      {!isAdmin && (
        <>
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
                      gerarMensalidade.mutate(mesAtualRef);
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

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CalendarDays className="w-4 h-4" /> Ano {now.getFullYear()} — seus pagamentos
              </h2>
              {hasPreferredDay && !showDiaPicker && (
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => setShowDiaPicker(true)}>
                  Alterar dia
                </Button>
              )}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {monthsOfYear.map((mesRef) => {
                const status = getMonthStatus(mesRef);
                const config = statusConfig[status];
                const m = getMonthMensalidade(mesRef);
                const mesDate = parseYearMonthLocal(mesRef);
                const mesLabel = format(mesDate, "MMM", { locale: ptBR });
                const anoLabel = format(mesDate, "yyyy");
                const isCurrent = mesRef === mesAtualRef;

                return (
                  <Card key={mesRef} className={`bg-card border-border transition-all ${isCurrent ? "ring-2 ring-primary/50" : ""}`}>
                    <CardContent className="p-3 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase">{anoLabel}</p>
                      <p className="text-sm font-semibold capitalize">{mesLabel}</p>
                      <div className={`mt-1.5 inline-block w-3 h-3 rounded-full ${config.dot}`} />
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
                      {m && isCurrent && !isLoading && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Vence {format(parseDateOnlyLocal(m.data_vencimento), "dd/MM")}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <Card className="bg-card border-border">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium">Mês atual: informe sua situação</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => reportarStatus.mutate("paguei")}
                  disabled={reportarStatus.isPending || !hasPreferredDay}
                >
                  Paguei
                </Button>
                <Button
                  variant="outline"
                  onClick={() => reportarStatus.mutate("vou_atrasar")}
                  disabled={reportarStatus.isPending || !hasPreferredDay}
                >
                  Vou atrasar
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-primary" /> Pago validado</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-accent" /> Paguei</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-destructive" /> Vou atrasar / Atrasado</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-muted" /> Não registrado</span>
          </div>
        </>
      )}

      {isAdmin && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            Visão Geral — {format(now, "MMMM yyyy", { locale: ptBR })}
          </h2>
          {profiles?.map((p) => {
            const m = mensalidades?.find((mens) => mens.user_id === p.user_id && mens.mes_referencia === mesAtualRef);
            const status = !m
              ? "nao_gerado"
              : m.status === "pago"
                ? "pago_validado"
                : m.status === "paguei"
                  ? "paguei"
                  : m.status === "vou_atrasar"
                    ? "vou_atrasar"
                    : isBefore(parseDateOnlyLocal(m.data_vencimento), now)
                      ? "atrasado"
                      : "pendente";
            const config = statusConfig[status];

            return (
              <Card key={p.id} className="bg-card border-border">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${config.dot}`} />
                      <div>
                        <p className="text-sm font-medium">{p.nome}</p>
                        {m && <p className="text-xs text-muted-foreground">Vence dia {format(parseDateOnlyLocal(m.data_vencimento), "dd/MM")}</p>}
                      </div>
                    </div>
                    <span className={`text-xs font-medium ${config.text}`}>{config.label}</span>
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
