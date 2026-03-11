import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NOTIFY_EMAIL = "tim.bizjak25@gmail.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { support_user_id, ticket_subject, ticket_description } = await req.json();

    if (!support_user_id || !ticket_subject) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", support_user_id)
      .single();

    const appUrl = req.headers.get("origin") || "https://eptp.lovable.app";
    const supportPageUrl = `${appUrl}/podpora`;

    const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background-color:#1e293b;padding:24px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:600;">ePTP Pomočnik</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 16px;color:#1e293b;font-size:20px;font-weight:600;">Nova zahteva na portalu</h2>
          <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Dodeljena osebi: ${profile?.full_name || 'Podporni uporabnik'}</p>
          <p style="margin:0 0 24px;color:#64748b;font-size:14px;">Prejeli ste novo zahtevo za podporo.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:24px;">
            <tr><td style="padding:16px;">
              <p style="margin:0 0 8px;color:#1e293b;font-size:15px;font-weight:600;">${ticket_subject}</p>
              <p style="margin:0;color:#64748b;font-size:13px;line-height:1.5;">${ticket_description || 'Ni opisa'}</p>
            </td></tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${supportPageUrl}" target="_blank" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 32px;border-radius:8px;">Odpri moje zahteve</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">To sporočilo je bilo samodejno poslano iz portala ePTP Pomočnik.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    // Send via Resend API
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "support@notify.eptp.click",
        to: [NOTIFY_EMAIL],
        subject: `Nova zahteva: ${ticket_subject}`,
        html: htmlBody,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend API error:", JSON.stringify(resendData));
      return new Response(
        JSON.stringify({ success: false, email_sent: false, error: resendData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Email sent successfully to ${NOTIFY_EMAIL}`, resendData);

    return new Response(
      JSON.stringify({ success: true, email_sent: true, recipient: NOTIFY_EMAIL, resend_id: resendData.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("notify-support error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
