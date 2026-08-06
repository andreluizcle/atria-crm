import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { ClienteSupabase } from '@atria/core';

/**
 * Cliente do Supabase para Server Components e Server Actions.
 *
 * Usa a chave `anon` + a sessao do usuario nos cookies, entao TODA consulta
 * passa pelas policies de RLS (supabase/migrations/0002_rls.sql). E de proposito:
 * o painel nunca deve usar `service_role`, senao a RLS vira decoracao.
 */
export async function criarClienteServidor(): Promise<ClienteSupabase> {
  const armazemDeCookies = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => armazemDeCookies.getAll(),
        setAll: (cookiesParaDefinir: Array<{ name: string; value: string; options: CookieOptions }>) => {
          try {
            for (const { name, value, options } of cookiesParaDefinir) {
              armazemDeCookies.set(name, value, options);
            }
          } catch {
            // Server Component nao pode escrever cookie. O middleware ja cuida
            // de renovar a sessao, entao ignorar aqui e seguro.
          }
        },
      },
    },
  ) as unknown as ClienteSupabase;
}
