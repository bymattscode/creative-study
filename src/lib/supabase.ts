import { createClient } from "@supabase/supabase-js";

// Pegando variáveis de ambiente (Vite)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://tipsquvjupliyofkwjih.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpcHNxdXZqdXBsaXlvZmt3amloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MDM1MTYsImV4cCI6MjEwMDA3OTUxNn0.SHGtKqN1jWKKCzLtxZTN1WhkwQlaGXrrrNs5lKtwoUg";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️ Supabase URL ou Anon Key não encontradas nas variáveis de ambiente. Verifique seu .env.local",
  );
}

// Cria o cliente global do Supabase
export const supabase = createClient(
  supabaseUrl || "https://placeholder-url.supabase.co",
  supabaseAnonKey || "placeholder-key",
);
