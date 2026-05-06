import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://zyuavhkjetaaeooiaaie.supabase.co').trim();
// Limpeza agressiva: remove barras finais e sufixos de API comuns
const supabaseUrl = rawUrl
  .replace(/\/$/, "")
  .replace(/\/rest\/v1$/, "")
  .replace(/\/auth\/v1$/, "");

const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_RkXB2mbYtO9eHOZ8kgFe_Q_emtzTIqT').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in environment variables.");
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// Teste de conexão silencioso para depuração
async function testConnection() {
  try {
    const { error } = await supabase.from('settings').select('key').limit(1);
    if (error) {
      if (error.message.includes('Invalid path') || error.message.includes('failed to fetch')) {
        console.error("⛔ [Supabase] Erro de Conexão: Verifique se a URL e a KEY estão corretas nas configurações.");
      } else if (error.message.includes('security policy')) {
        console.warn("⚠️ [Supabase] Aviso de Segurança: RLS está ativado. Lembre-se de rodar o comando SQL 'DISABLE ROW LEVEL SECURITY' para permitir edições.");
      }
    } else {
      console.log("✅ [Supabase] Conectado e operando com sucesso!");
    }
  } catch (e) {
    console.error("❌ [Supabase] Falha Crítica na Conexão.");
  }
}

testConnection();
