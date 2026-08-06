import { createBrowserClient } from '@supabase/ssr';

/**
 * Cliente para componentes 'use client'. Usado apenas no login/logout —
 * leitura e escrita de dados acontecem em Server Actions, onde a chave
 * `service_role` nunca chega perto do navegador.
 */
export function criarClienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
