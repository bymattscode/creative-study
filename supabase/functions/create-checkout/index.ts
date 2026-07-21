import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error("Não autorizado");
    }

    const { plan } = await req.json();

    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
    if (!MP_ACCESS_TOKEN) {
      throw new Error("Mercado Pago Access Token is not set");
    }

    const preference = {
      items: [
        {
          title: "Creative Study Pro - Acesso Vitalício",
          description: "Desbloqueio de todos os recursos da plataforma",
          quantity: 1,
          currency_id: "BRL",
          unit_price: 97.00, // Ajuste o valor conforme necessário
        },
      ],
      payer: {
        email: user.email,
      },
      back_urls: {
        success: `${req.headers.get("origin")}/app?payment=success`,
        failure: `${req.headers.get("origin")}/app/upgrade?payment=failure`,
        pending: `${req.headers.get("origin")}/app/upgrade?payment=pending`,
      },
      auto_return: "approved",
      external_reference: user.id, // Fundamental para sabermos quem pagou
      statement_descriptor: "CREATIVE STUDY",
    };

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });

    const mpData = await response.json();

    if (!response.ok) {
      console.error("Erro MP:", mpData);
      throw new Error("Falha ao criar preferência de pagamento");
    }

    // Retorna a URL de checkout (init_point = producao, sandbox_init_point = testes)
    return new Response(JSON.stringify({ init_point: mpData.init_point }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
