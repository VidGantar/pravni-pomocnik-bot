import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const results: string[] = [];

  // Create splosna-podpora user
  const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
    email: "splosna-podpora@dodv.gov.si",
    password: "geslo",
    email_confirm: true,
    user_metadata: { username: "Splošna podpora", role: "support" },
  });
  if (createErr) {
    results.push(`splosna-podpora: ${createErr.message}`);
  } else {
    results.push(`splosna-podpora created: ${newUser.user.id}`);
    // Update department
    await supabase.from("profiles").update({ department: "Splošna podpora", full_name: "Splošna podpora" }).eq("user_id", newUser.user.id);
  }

  // Update IT support department
  const { data: itProfile } = await supabase.from("profiles").select("user_id").eq("email", "it-podpora@dodv.gov.si").single();
  if (itProfile) {
    await supabase.from("profiles").update({ department: "IT podpora", full_name: "IT podpora" }).eq("user_id", itProfile.user_id);
    results.push("IT support department updated");
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
