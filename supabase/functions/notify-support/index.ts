import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { support_user_id, ticket_subject, ticket_description } = await req.json();

    if (!support_user_id || !ticket_subject) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get support user's email
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", support_user_id)
      .single();

    if (!profile?.email) {
      return new Response(JSON.stringify({ error: "Support user email not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appUrl = req.headers.get("origin") || "https://id-preview--4f177b1a-10a9-43e9-9bda-4d3890b9b170.lovable.app";
    const supportPageUrl = `${appUrl}/podpora`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color:#1e293b;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:600;">ePTP Pomočnik</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;color:#1e293b;font-size:20px;font-weight:600;">Nova zahteva na portalu</h2>
              <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Pozdravljeni ${profile.full_name || ''},</p>
              <p style="margin:0 0 24px;color:#64748b;font-size:14px;">Prejeli ste novo zahtevo za podporo.</p>
              
              <!-- Ticket info card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0 0 8px;color:#1e293b;font-size:15px;font-weight:600;">${ticket_subject}</p>
                    <p style="margin:0;color:#64748b;font-size:13px;line-height:1.5;">${ticket_description || 'Ni opisa'}</p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${supportPageUrl}" target="_blank" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 32px;border-radius:8px;letter-spacing:0.3px;">
                      Odpri moje zahteve
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">To sporočilo je bilo samodejno poslano iz portala ePTP Pomočnik.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Send via pgmq transactional email queue
    let emailSent = false;

    try {
      const { error: queueError } = await supabase.rpc("enqueue_email" as any, {
        queue_name: "transactional_emails",
        payload: {
          to: profile.email,
          subject: `Nova zahteva: ${ticket_subject}`,
          html: htmlBody,
        },
      });
      if (!queueError) {
        emailSent = true;
        console.log(`Email queued for ${profile.email}`);
      } else {
        console.error("enqueue_email error:", queueError);
      }
    } catch (e) {
      console.error("Queue send failed:", e);
    }
    } catch (e) {
      console.error("Queue send failed:", e);
    }

    if (!emailSent) {
      console.log(`Email could not be queued for ${profile.email}`);
    }

    return new Response(
      JSON.stringify({ success: true, email_sent: emailSent, recipient: profile.email }),
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
