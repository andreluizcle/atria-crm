import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requerEnv } from './env';

/**
 * Cliente com a chave `service_role`: ignora RLS.
 *
 * Use SOMENTE no servidor — bot do Telegram e rotas de API. Nunca importe este
 * arquivo de um componente com 'use client'. No painel web, o caminho normal e o
 * cliente de sessao do usuario (apps/web/lib/supabase), que passa pelas policies.
 *
 * O bot precisa disso porque quem fala com ele e um usuario do Telegram, nao uma
 * sessao do Supabase Auth — a autorizacao acontece na aplicacao, resolvendo o
 * telegram_user_id para uma linha ativa em `usuarios`.
 */

let clienteCache: SupabaseClient | null = null;

export function criarClienteAdmin(): SupabaseClient {
  if (clienteCache) return clienteCache;

  clienteCache = createClient(requerEnv('NEXT_PUBLIC_SUPABASE_URL'), requerEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return clienteCache;
}

/** Todo repository recebe um cliente por parametro — assim o mesmo codigo serve
 *  para o bot (service_role) e para o painel (sessao do usuario, com RLS). */
export type ClienteSupabase = SupabaseClient;
