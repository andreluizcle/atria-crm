import type { MiddlewareFn } from 'telegraf';
import { mensagemParaUsuario, registrarErro } from '@atria/core';
import type { ContextoAtria } from '../contexto';

/**
 * Rede de seguranca: qualquer excecao nao tratada vira uma resposta no chat.
 *
 * A spec (secao 3) e explicita: o bot nunca deve travar em silencio. Sem isso,
 * uma falha do Supabase deixaria o membro olhando para a tela sem saber se a
 * mensagem chegou.
 */
export const tratarErros: MiddlewareFn<ContextoAtria> = async (ctx, next) => {
  try {
    await next();
  } catch (erro) {
    registrarErro(`bot.update:${ctx.updateType}`, erro);

    // Se veio de um botao inline, o Telegram mostra um "relogio" ate responder.
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery('Deu erro.').catch(() => undefined);
    }

    await ctx
      .reply(`⚠️ ${mensagemParaUsuario(erro)}\n\nSe continuar, use /cancelar e comece de novo.`)
      .catch((falhaAoResponder) => {
        // Chat bloqueado ou Telegram fora do ar: so registra, nao ha o que fazer.
        registrarErro('bot.tratarErros.reply', falhaAoResponder);
      });
  }
};
