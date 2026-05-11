import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type SubscribeBody = {
  action: "subscribe" | "unsubscribe";
  endpoint?: string;
  userAgent?: string;
  platform?: string;
  subscription?: {
    endpoint: string;
    keys?: {
      p256dh?: string;
      auth?: string;
    };
  };
};

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

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !userData?.user?.id) {
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

    const body = (await req.json()) as SubscribeBody;

    if (body.action === "unsubscribe") {
      let query = supabaseAdmin.from("push_subscriptions").delete().eq("user_id", userId);
      if (body.endpoint) query = query.eq("endpoint", body.endpoint);
      await query;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const endpoint = body.subscription?.endpoint;
    const p256dh = body.subscription?.keys?.p256dh;
    const auth = body.subscription?.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      return new Response(JSON.stringify({ error: "Subscription inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Remove other subscriptions for the same device (same user + same user_agent)
    // to avoid duplicate notifications when a device re-subscribes with a new endpoint.
    if (body.userAgent) {
      await supabaseAdmin
        .from("push_subscriptions")
        .delete()
        .eq("user_id", userId)
        .eq("user_agent", body.userAgent)
        .neq("endpoint", endpoint);
    }

    const { error } = await supabaseAdmin.from("push_subscriptions").upsert(
      {
        endpoint,
        p256dh,
        auth,
        user_id: userId,
        user_agent: body.userAgent ?? null,
        platform: body.platform ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    );

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
