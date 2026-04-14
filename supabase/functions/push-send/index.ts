import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type PushRequest = {
  title: string;
  body: string;
  url?: string;
  userIds?: string[];
};

const MAX_TITLE = 50;
const MAX_BODY = 120;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !userData?.user?.id) {
      console.error("Auth error:", userError?.message);
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleRows, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "escala"]);

    if (roleError) throw roleError;
    if (!roleRows || roleRows.length === 0) {
      return new Response(JSON.stringify({ error: "Sem permissão para enviar notificações" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as PushRequest;

    const title = (body.title ?? "").trim().slice(0, MAX_TITLE);
    const message = (body.body ?? "").trim().slice(0, MAX_BODY);
    const url = body.url ?? "/";

    if (!title || !message) {
      return new Response(JSON.stringify({ error: "Título e mensagem são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let { data: keys } = await supabaseAdmin
      .from("notification_vapid_keys")
      .select("id, public_key, private_key, subject")
      .eq("id", 1)
      .maybeSingle();

    if (!keys) {
      const generated = webpush.generateVAPIDKeys();
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("notification_vapid_keys")
        .upsert(
          {
            id: 1,
            public_key: generated.publicKey,
            private_key: generated.privateKey,
            subject: "mailto:no-reply@tusva.app",
          },
          { onConflict: "id" }
        )
        .select("id, public_key, private_key, subject")
        .single();

      if (insertError) throw insertError;
      keys = inserted;
    }

    webpush.setVapidDetails(keys.subject, keys.public_key, keys.private_key);

    let subscriptionsQuery = supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth, user_id");

    if (Array.isArray(body.userIds) && body.userIds.length > 0) {
      subscriptionsQuery = subscriptionsQuery.in("user_id", body.userIds);
    }

    const { data: subscriptions, error: subscriptionsError } = await subscriptionsQuery;
    if (subscriptionsError) throw subscriptionsError;

    const uniqueSubscriptions = (subscriptions ?? []).filter(
      (sub, index, arr) => arr.findIndex((s) => s.endpoint === sub.endpoint) === index
    );

    const payload = JSON.stringify({ title, body: message, url });
    const invalidEndpoints: string[] = [];

    const results = await Promise.allSettled(
      uniqueSubscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          );
          return true;
        } catch (error: any) {
          const statusCode = error?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            invalidEndpoints.push(sub.endpoint);
          }
          return false;
        }
      })
    );

    if (invalidEndpoints.length > 0) {
      await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", invalidEndpoints);
    }

    const sent = results.filter((r) => r.status === "fulfilled" && r.value).length;

    return new Response(JSON.stringify({ success: true, sent, total: uniqueSubscriptions.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Push send error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
