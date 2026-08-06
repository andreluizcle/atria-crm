import type { Telegraf } from 'telegraf';
import type { ContextoAtria } from '../contexto';
import { encerrarFluxo } from '../states/sessaoStore';

/**
 * /cancelar — saida de emergencia de qualquer fluxo.
 *
 * Registrado ANTES dos handlers de texto no bot.ts, para funcionar mesmo no meio
 * de um cadastro. Sem isso, o membro que se perdesse ficaria preso ate a sessao
 * expirar (30 minutos).
 */
export function registrarCancelar(bot: Telegraf<ContextoAtria>): void {
  bot.command('cancelar', async (ctx) => {
    const tinhaFluxo = Boolean(ctx.sessao);
    await encerrarFluxo(ctx);

    await ctx.reply(
      tinhaFluxo
        ? '❌ Cancelado. Nada foi salvo.\n\nUse /ajuda para ver o que dá pra fazer.'
        : 'Não tinha nada em andamento por aqui. Use /ajuda para ver os comandos.',
    );
  });
}
