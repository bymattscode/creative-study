import { supabase } from "./supabase";

/**
 * Rastreia um evento do usuário na tabela `user_events`.
 * Operação fire-and-forget para não bloquear a UI.
 */
export const trackEvent = async (eventName: string, properties: Record<string, any> = {}) => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;

    if (!userId) {
      // Se não há usuário autenticado, podemos logar apenas no console ou ignorar dependendo da regra
      if (import.meta.env.DEV) {
        console.log(`[Analytics - Anônimo] ${eventName}`, properties);
      }
      return;
    }

    if (import.meta.env.DEV) {
      console.log(`[Analytics] ${eventName}`, properties);
    }

    // Fire and forget
    supabase
      .from("user_events")
      .insert({
        user_id: userId,
        event_name: eventName,
        properties,
      })
      .then(({ error }) => {
        if (error && import.meta.env.DEV) {
          console.error(`[Analytics Error] Falha ao registrar evento ${eventName}:`, error.message);
        }
      });
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error(`[Analytics Error] Falha inesperada no evento ${eventName}:`, err);
    }
  }
};
