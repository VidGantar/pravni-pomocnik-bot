import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { message, conversation_id, history } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch documents and FAQ from database for context
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const [docsRes, faqRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/documents?select=title,content,category&limit=20`, {
        headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey },
      }),
      fetch(`${supabaseUrl}/rest/v1/faq_entries?select=question,answer,category&limit=50`, {
        headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey },
      }),
    ]);

    const docs = await docsRes.json();
    const faqs = await faqRes.json();

    const docsContext = Array.isArray(docs) && docs.length > 0
      ? docs.map((d: any) => `[Dokument: ${d.title}] (Kategorija: ${d.category})\n${d.content}`).join('\n\n---\n\n')
      : '';

    const faqContext = Array.isArray(faqs) && faqs.length > 0
      ? faqs.map((f: any) => `V: ${f.question}\nO: ${f.answer}`).join('\n\n')
      : '';

    const systemPrompt = `Si interni pomočnik Državnega odvetništva Republike Slovenije (DOdv). Tvoje ime je "DOdv Pomočnik".

Tvoja naloga je pomagati zaposlenim pri:
- IT podpori (računalniki, sistemi, prijave, dostopi)
- dokumentarnem sistemu (IS Feniks)
- kadrovskih zadevah (dopusti, dovolilnice, pari)
- splošnih organizacijskih vprašanjih

PRAVILA:
1. VEDNO odgovarjaj v slovenščini
2. Odgovore podajaj na podlagi priloženih dokumentov in pogostih vprašanj
3. Ko podaš odgovor, VEDNO navedi vir (naslov dokumenta)
4. Če v dokumentih NI odgovora, jasno povej da odgovora nisi našel in predlagaj kontaktiranje podpore
5. Bodi prijazen, strokoven in jedrnat
6. Postavljaj podvprašanja za boljše razumevanje problema
7. Pri tehničnih navodilih podaj korake po korakih

DOKUMENTI IN NAVODILA:
${docsContext}

POGOSTA VPRAŠANJA IN ODGOVORI:
${faqContext}

Ko odgovarjaš, vrni JSON v naslednji obliki:
{
  "reply": "tvoj odgovor tukaj",
  "sources": [{"title": "naslov dokumenta", "excerpt": "kratek izvleček"}] ali null če ni virov,
  "can_answer": true/false (false če nisi našel odgovora v gradivih),
  "suggested_department": "IT podpora" ali "Splošna podpora" ali "Kadrovska služba" ali "Urad generalnega državnega odvetnika" ali null
}

Za suggested_department: Vedno določi, katera služba bi bila najbolj primerna za to vprašanje. Uporabi "IT podpora" za tehnične/računalniške težave, "Kadrovska služba" za kadrovske zadeve, "Urad generalnega državnega odvetnika" za pravna vprašanja, "Splošna podpora" za vse ostalo.

POMEMBNO: Odgovori SAMO z veljavnim JSON objektom, brez dodatnega besedila.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).slice(-10),
      { role: "user", content: message },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Preveč zahtev, poskusite znova čez nekaj sekund." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Presežena kvota, kontaktirajte administratorja." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '';

    // Try to parse JSON from response
    let parsed;
    try {
      // Strip markdown code fences if present
      const cleaned = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // If not valid JSON, return as plain text
      parsed = {
        reply: rawContent,
        sources: null,
        can_answer: true,
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ 
      error: e instanceof Error ? e.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
