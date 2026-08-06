import type { ClienteSupabase } from '../lib/supabaseAdmin';
import type { Usuario } from '../types/usuario';
import { traduzirErroSupabase } from '../lib/erroSupabase';

const TABELA = 'usuarios';

export async function buscarUsuarioPorId(db: ClienteSupabase, id: string): Promise<Usuario | null> {
  const { data, error } = await db.from(TABELA).select('*').eq('id', id).maybeSingle();

  if (error) traduzirErroSupabase('usuarioRepository.buscarUsuarioPorId', error);
  return (data as Usuario | null) ?? null;
}

/**
 * Ponte entre o Telegram e o banco: e assim que o bot descobre quem esta falando
 * com ele. Sem uma linha aqui, o membro precisa rodar /vincular antes de cadastrar.
 */
export async function buscarUsuarioPorTelegramId(
  db: ClienteSupabase,
  telegramUserId: string,
): Promise<Usuario | null> {
  const { data, error } = await db
    .from(TABELA)
    .select('*')
    .eq('telegram_user_id', telegramUserId)
    .eq('ativo', true)
    .maybeSingle();

  if (error) traduzirErroSupabase('usuarioRepository.buscarUsuarioPorTelegramId', error);
  return (data as Usuario | null) ?? null;
}

export async function buscarUsuarioPorEmail(db: ClienteSupabase, email: string): Promise<Usuario | null> {
  const { data, error } = await db
    .from(TABELA)
    .select('*')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  if (error) traduzirErroSupabase('usuarioRepository.buscarUsuarioPorEmail', error);
  return (data as Usuario | null) ?? null;
}

export async function listarUsuariosAtivos(db: ClienteSupabase): Promise<Usuario[]> {
  const { data, error } = await db.from(TABELA).select('*').eq('ativo', true).order('nome');

  if (error) traduzirErroSupabase('usuarioRepository.listarUsuariosAtivos', error);
  return (data ?? []) as Usuario[];
}

export async function vincularTelegram(
  db: ClienteSupabase,
  usuarioId: string,
  telegramUserId: string,
): Promise<Usuario> {
  const { data, error } = await db
    .from(TABELA)
    .update({ telegram_user_id: telegramUserId })
    .eq('id', usuarioId)
    .select('*')
    .single();

  if (error) traduzirErroSupabase('usuarioRepository.vincularTelegram', error);
  return data as Usuario;
}

export async function desvincularTelegram(db: ClienteSupabase, usuarioId: string): Promise<void> {
  const { error } = await db.from(TABELA).update({ telegram_user_id: null }).eq('id', usuarioId);

  if (error) traduzirErroSupabase('usuarioRepository.desvincularTelegram', error);
}
