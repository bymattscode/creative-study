import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    // O Mercado Pago envia id de pagamento via query string em alguns webhooks
    // ou via body. Vamos tratar os dois cenários para garantir.
    const id = url.searchParams.get("data.id") || url.searchParams.get("id");
    const type = url.searchParams.get("type") || url.searchParams.get("topic");

    if (type !== "payment" || !id) {
      // Se não vier via URL, tentamos ler do corpo da requisição
      const bodyText = await req.text();
      let body;
      try {
        body = JSON.parse(bodyText);
      } catch (e) {
        return new Response("Not a JSON body", { status: 200 });
      }

      if (body.type !== "payment" || !body.data?.id) {
        return new Response("Not a payment event", { status: 200 });
      }

      var paymentId = body.data.id;
    } else {
      var paymentId = id;
    }

    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
    
    // Obter detalhes do pagamento direto do MP por segurança
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
    });
    
    const paymentData = await paymentResponse.json();

    if (paymentData.status === "approved") {
      const userId = paymentData.external_reference;
      
      if (!userId) {
         return new Response("Missing external_reference", { status: 400 });
      }

      // Atualizar o banco de dados usando Service Role Key
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const { error } = await supabaseAdmin
        .from("user_profiles")
        .update({ subscription_tier: "pro" })
        .eq("user_id", userId);

      if (error) {
         console.error("Erro ao atualizar profile:", error);
         throw error;
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
});
