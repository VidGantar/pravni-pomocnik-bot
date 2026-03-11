import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const users = [
    { email: "admin@dodv.gov.si", password: "geslo", username: "admin", role: "admin" },
    { email: "odvetnik@dodv.gov.si", password: "geslo", username: "odvetnik", role: "user" },
    { email: "it-podpora@dodv.gov.si", password: "geslo", username: "it-podpora", role: "support" },
  ];

  const results = [];
  for (const u of users) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { username: u.username, role: u.role },
    });
    results.push({ email: u.email, ok: !error, error: error?.message });
  }

  return new Response(JSON.stringify(results), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
