import type { MiddlewareFn } from 'telegraf';
import { buscarSessao, buscarUsuarioPorTelegramId, criarClienteAdmin } from '@atria/core';
import type { ContextoAtria } from '../contexto';
import { idDoTelegram } from '../contexto';

/**
 * Injeta `db`, `usuario` e `sessao` no contexto, uma vez por update.
 *
 * O bot usa o cliente `service_role` porque quem fala com ele e uma conta do
 * Telegram, nao uma sessao do Supabase Auth. A autorizacao acontece aqui: sem
 * uma linha ativa em `usuarios` com este telegram_user_id, `ctx.usuario` fica
 * indefinido e o middleware de autenticacao barra o resto.
 */
export const contextoDoBanco: MiddlewareFn<ContextoAtria> = async (ctx, next) => {
  ctx.db = criarClienteAdmin();

  const telegramId = idDoTelegram(ctx);
  if (!telegramId) return next();

  ctx.usuario = (await buscarUsuarioPorTelegramId(ctx.db, telegramId)) ?? undefined;
  ctx.sessao = await buscarSessao(ctx.db, telegramId);

  return next();
};
