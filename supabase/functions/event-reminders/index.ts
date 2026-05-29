import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REMINDER_INTERVAL_HOURS = 5;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const now = new Date();
    const cutoff = new Date(now.getTime() - REMINDER_INTERVAL_HOURS * 60 * 60 * 1000).toISOString();

    // Eventos futuros, criados há >=5h, e que não receberam lembrete nos últimos 5h
    const { data: eventos, error: eventosError } = await supabase
      .from("eventos")
      .select("id, titulo, data_inicio, created_at, last_reminder_sent_at")
      .gt("data_inicio", now.toISOString())
      .lte("created_at", cutoff)
      .or(`last_reminder_sent_at.is.null,last_reminder_sent_at.lte.${cutoff}`);

    if (eventosError) throw eventosError;
    if (!eventos || eventos.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Carrega VAPID
    const { data: keys } = await supabase
      .from("notification_vapid_keys")
      .select("public_key, private_key, subject")
      .eq("id", 1)
      .maybeSingle();
    if (!keys) {
      return new Response(JSON.stringify({ error: "VAPID keys missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    webpush.setVapidDetails(keys.subject, keys.public_key, keys.private_key);

    // Todos usuários do terreiro (com perfil)
    const { data: profiles } = await supabase.from("profiles").select("user_id");
    const allUserIds = (profiles ?? []).map((p) => p.user_id);

    let totalSent = 0;
    const processedEventIds: string[] = [];

    for (const ev of eventos) {
      // Quem JÁ respondeu (vai OU nao_vai) — só lembramos quem ainda não respondeu
      const { data: respondidos } = await supabase
        .from("confirmacoes_presenca")
        .select("user_id")
        .eq("evento_id", ev.id);
      const respondedIds = new Set((respondidos ?? []).map((c) => c.user_id));
      const pendingIds = allUserIds.filter((uid) => !respondedIds.has(uid));
      if (pendingIds.length === 0) {
        processedEventIds.push(ev.id);
        continue;
      }

      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth, user_id")
        .in("user_id", pendingIds);

      const unique = (subs ?? []).filter(
        (s, i, a) => a.findIndex((x) => x.endpoint === s.endpoint) === i
      );

      const dataEvento = new Date(ev.data_inicio);
      const dataFmt = dataEvento.toLocaleDateString("pt-BR", {
        day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo",
      });
      const horaFmt = dataEvento.toLocaleTimeString("pt-BR", {
        hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
      });

      const payload = JSON.stringify({
        title: ev.titulo || "Confirme sua presença 🙏",
        body: `${ev.titulo} — ${dataFmt} às ${horaFmt}. Toque para confirmar.`,
        url: "/calendario",
      });

      const invalid: string[] = [];
      const results = await Promise.allSettled(
        unique.map(async (sub) => {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload
            );
            return true;
          } catch (err: any) {
            if (err?.statusCode === 404 || err?.statusCode === 410) invalid.push(sub.endpoint);
            return false;
          }
        })
      );
      if (invalid.length) {
        await supabase.from("push_subscriptions").delete().in("endpoint", invalid);
      }
      totalSent += results.filter((r) => r.status === "fulfilled" && r.value).length;
      processedEventIds.push(ev.id);
    }

    if (processedEventIds.length) {
      await supabase
        .from("eventos")
        .update({ last_reminder_sent_at: now.toISOString() })
        .in("id", processedEventIds);
    }

    return new Response(
      JSON.stringify({ ok: true, processed: processedEventIds.length, sent: totalSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("event-reminders error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
