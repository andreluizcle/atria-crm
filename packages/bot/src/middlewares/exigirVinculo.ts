import type { MiddlewareFn } from 'telegraf';
import type { ContextoAtria } from '../contexto';

/**
 * Barra quem ainda nao vinculou a conta do Telegram a um membro da EJ.
 *
 * Aplicado por comando (nao globalmente), porque /start e /ajuda precisam
 * funcionar justamente para explicar como fazer o vinculo.
 */
export const exigirVinculo: MiddlewareFn<ContextoAtria> = async (ctx, next) => {
  if (ctx.usuario) return next();

  await ctx.reply(
    '🔒 Sua conta do Telegram ainda não está vinculada a um membro da EJ.\n\n' +
      'Entre no painel web, abra <b>Meu perfil</b> e clique em <b>Vincular Telegram</b>. ' +
      'O painel gera um link que já te traz de volta pra cá vinculado.',
    { parse_mode: 'HTML' },
  );
};
