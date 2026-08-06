import type { ClienteSupabase } from '../lib/supabaseAdmin';
import { traduzirErroSupabase } from '../lib/erroSupabase';

/**
 * Estado das conversas do Telegram.
 *
 * Mora no banco porque o bot roda como webhook serverless: cada mensagem chega
 * numa invocacao nova, sem memoria da anterior. Guardar em variavel de modulo
 * funcionaria em desenvolvimento e quebraria em producao de forma silenciosa.
 *
 * So o cliente `service_role` alcanca esta tabela (sem policies de RLS).
 */

const TABELA = 'bot_sessoes';
const MINUTOS_ATE_EXPIRAR = 30;

export interface SessaoBot {
  telegram_user_id: string;
  chat_id: number;
  fluxo: string;
  passo: string;
  dados: Record<string, unknown>;
  criado_em: string;
  atualizado_em: string;
  expira_em: string;
}

export async function buscarSessao(db: ClienteSupabase, telegramUserId: string): Promise<SessaoBot | null> {
  const { data, error } = await db
    .from(TABELA)
    .select('*')
    .eq('telegram_user_id', telegramUserId)
    .maybeSingle();

  if (error) traduzirErroSupabase('sessaoRepository.buscarSessao', error);
  if (!data) return null;

  const sessao = data as SessaoBot;

  // Conversa obsoleta (spec 5.4): apaga e trata como se nao existisse.
  if (new Date(sessao.expira_em) < new Date()) {
    await encerrarSessao(db, telegramUserId);
    return null;
  }

  return sessao;
}

export async function salvarSessao(
  db: ClienteSupabase,
  sessao: Pick<SessaoBot, 'telegram_user_id' | 'chat_id' | 'fluxo' | 'passo' | 'dados'>,
): Promise<void> {
  const expiraEm = new Date(Date.now() + MINUTOS_ATE_EXPIRAR * 60_000).toISOString();

  const { error } = await db
    .from(TABELA)
    .upsert({ ...sessao, expira_em: expiraEm }, { onConflict: 'telegram_user_id' });

  if (error) traduzirErroSupabase('sessaoRepository.salvarSessao', error);
}

export async function encerrarSessao(db: ClienteSupabase, telegramUserId: string): Promise<void> {
  const { error } = await db.from(TABELA).delete().eq('telegram_user_id', telegramUserId);

  if (error) traduzirErroSupabase('sessaoRepository.encerrarSessao', error);
}

/** Faxina das sessoes vencidas. Chamada de vez em quando pelo webhook — nao precisa de cron. */
export async function limparSessoesExpiradas(db: ClienteSupabase): Promise<void> {
  const { error } = await db.from(TABELA).delete().lt('expira_em', new Date().toISOString());

  if (error) traduzirErroSupabase('sessaoRepository.limparSessoesExpiradas', error);
}
