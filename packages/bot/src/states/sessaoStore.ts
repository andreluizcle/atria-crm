import { encerrarSessao, salvarSessao } from '@atria/core';
import type { ContextoAtria } from '../contexto';
import { idDoChat, idDoTelegram } from '../contexto';

/**
 * Camada fina sobre `bot_sessoes`: os handlers falam em "fluxo" e "passo",
 * sem saber que isso mora numa tabela do Postgres.
 */

export const FLUXOS = {
  novoLead: 'novo_lead',
  buscarLead: 'buscar_lead',
  enviarMensagem: 'enviar_mensagem',
} as const;

export type Fluxo = (typeof FLUXOS)[keyof typeof FLUXOS];

export async function iniciarFluxo(
  ctx: ContextoAtria,
  fluxo: Fluxo,
  passo: string,
  dados: Record<string, unknown> = {},
): Promise<void> {
  const telegramId = idDoTelegram(ctx);
  const chatId = idDoChat(ctx);
  if (!telegramId || chatId === null) return;

  await salvarSessao(ctx.db, { telegram_user_id: telegramId, chat_id: chatId, fluxo, passo, dados });
  ctx.sessao = {
    telegram_user_id: telegramId,
    chat_id: chatId,
    fluxo,
    passo,
    dados,
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
    expira_em: new Date(Date.now() + 30 * 60_000).toISOString(),
  };
}

/** Avanca o passo mantendo os dados ja coletados. */
export async function avancarPasso(
  ctx: ContextoAtria,
  passo: string,
  novosDados: Record<string, unknown> = {},
): Promise<void> {
  if (!ctx.sessao) return;

  const dados = { ...ctx.sessao.dados, ...novosDados };
  await salvarSessao(ctx.db, {
    telegram_user_id: ctx.sessao.telegram_user_id,
    chat_id: ctx.sessao.chat_id,
    fluxo: ctx.sessao.fluxo,
    passo,
    dados,
  });

  ctx.sessao = { ...ctx.sessao, passo, dados };
}

export async function encerrarFluxo(ctx: ContextoAtria): Promise<void> {
  const telegramId = idDoTelegram(ctx);
  if (!telegramId) return;

  await encerrarSessao(ctx.db, telegramId);
  ctx.sessao = null;
}

export function dadosDaSessao<T extends Record<string, unknown>>(ctx: ContextoAtria): T {
  return (ctx.sessao?.dados ?? {}) as T;
}

export function fluxoAtivo(ctx: ContextoAtria, fluxo: Fluxo): boolean {
  return ctx.sessao?.fluxo === fluxo;
}
