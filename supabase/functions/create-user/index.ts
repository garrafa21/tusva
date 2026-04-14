import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SPECIAL_ADMINS = new Set(["melissa", "tathiane"]);
const SPECIAL_ESCALA = new Set(["fepaganini", "fernanda", "sabrina"]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");

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

      const callerId = userData.user.id;

      const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

      const { data: role } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", callerId)
        .eq("role", "admin")
        .maybeSingle();

      if (!role) {
        return new Response(JSON.stringify({ error: "Não autorizado" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Proceed with admin client
      const { nome, senha, isAdmin: makeAdmin, role: requestedRole } = await req.json();
      const trimmedName = String(nome ?? "").trim();
      const normalizedName = trimmedName.toLowerCase();
      const email = normalizedName.replace(/\s+/g, ".") + "@tusva.app";

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { nome: trimmedName },
      });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const normalizedRole = requestedRole === "admin" || requestedRole === "escala" ? requestedRole : "membro";
      const rolesToAssign = new Set<string>(["membro"]);

      if (normalizedRole === "admin" || makeAdmin || SPECIAL_ADMINS.has(normalizedName)) {
        rolesToAssign.add("admin");
      }

      if (normalizedRole === "escala" || SPECIAL_ESCALA.has(normalizedName)) {
        rolesToAssign.add("escala");
      }

      const roleRows = Array.from(rolesToAssign).map((assignedRole) => ({
        user_id: data.user.id,
        role: assignedRole,
      }));

      const { error: rolesError } = await supabaseAdmin.from("user_roles").insert(roleRows);
      if (rolesError) {
        return new Response(JSON.stringify({ error: rolesError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, user_id: data.user.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Não autenticado" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
