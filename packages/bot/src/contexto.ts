import type { Context } from 'telegraf';
import type { ClienteSupabase, SessaoBot, Usuario } from '@atria/core';

/**
 * Contexto do telegraf estendido com o que todo handler precisa.
 *
 * `db` e `usuario` sao preenchidos por middlewares (ver src/middlewares/), entao
 * nenhum handler precisa criar cliente Supabase nem descobrir quem esta falando.
 */
export interface ContextoAtria extends Context {
  db: ClienteSupabase;
  /** Membro da EJ vinculado a esta conta do Telegram. Ausente = ainda nao vinculou. */
  usuario?: Usuario;
  /** Conversa em andamento, se houver. */
  sessao?: SessaoBot | null;
}

/** Handlers que exigem membro vinculado recebem este tipo, ja sem `undefined`. */
export interface ContextoAutenticado extends ContextoAtria {
  usuario: Usuario;
}

export function idDoTelegram(ctx: ContextoAtria): string | null {
  return ctx.from?.id !== undefined ? String(ctx.from.id) : null;
}

export function idDoChat(ctx: ContextoAtria): number | null {
  return ctx.chat?.id ?? null;
}

/** Texto da mensagem atual, quando for uma mensagem de texto. */
export function textoDaMensagem(ctx: ContextoAtria): string | null {
  const mensagem = ctx.message;
  if (mensagem && 'text' in mensagem) return mensagem.text;
  return null;
}

/** Dados do botao inline clicado (`callback_data`). */
export function dadosDoBotao(ctx: ContextoAtria): string | null {
  const query = ctx.callbackQuery;
  if (query && 'data' in query) return query.data;
  return null;
}
