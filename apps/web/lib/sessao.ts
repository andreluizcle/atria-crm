import { redirect } from 'next/navigation';
import { buscarUsuarioPorId, type ClienteSupabase, type Usuario } from '@atria/core';
import { criarClienteServidor } from './supabase/servidor';

/**
 * Quem esta logado, resolvido a partir da sessao do Supabase Auth.
 *
 * Toda page e action protegida comeca por aqui. Devolve o cliente junto para
 * a page nao precisar criar outro.
 */
export async function exigirUsuarioLogado(): Promise<{ db: ClienteSupabase; usuario: Usuario }> {
  const db = await criarClienteServidor();

  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) redirect('/login');

  const usuario = await buscarUsuarioPorId(db, user.id);

  // O trigger on_auth_user_created cria a linha em `usuarios`. Se nao existe,
  // algo saiu do lugar no setup — melhor devolver ao login do que quebrar depois.
  if (!usuario) redirect('/login?erro=sem-cadastro');
  if (!usuario.ativo) redirect('/login?erro=inativo');

  return { db, usuario };
}
