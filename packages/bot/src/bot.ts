import { Telegraf } from 'telegraf';
import { requerEnv } from '@atria/core';
import type { ContextoAtria } from './contexto';
import { contextoDoBanco } from './middlewares/contextoDoBanco';
import { tratarErros } from './middlewares/tratarErros';
import { registrarInicio } from './handlers/inicio';
import { registrarCancelar } from './handlers/cancelar';
import { registrarNovoLead } from './handlers/novoLead';
import { registrarMeusLeads } from './handlers/meusLeads';
import { registrarBuscarLead } from './handlers/buscarLead';
import { registrarEnviarMensagem } from './handlers/enviarMensagem';

/**
 * Composition root do bot: so monta as pecas.
 *
 * A ORDEM importa:
 *   1. tratarErros      — precisa envolver todo o resto
 *   2. contextoDoBanco  — todo handler depende de ctx.db e ctx.usuario
 *   3. /cancelar        — antes dos fluxos, para funcionar no meio de um cadastro
 *   4. fluxos           — cada um ignora updates que nao sao seus e chama next()
 */
export function criarBot(): Telegraf<ContextoAtria> {
  const bot = new Telegraf<ContextoAtria>(requerEnv('TELEGRAM_BOT_TOKEN'));

  bot.use(tratarErros);
  bot.use(contextoDoBanco);

  registrarInicio(bot);
  registrarCancelar(bot);

  registrarNovoLead(bot);
  registrarBuscarLead(bot);
  registrarEnviarMensagem(bot);
  registrarMeusLeads(bot);

  // Ultimo recurso: texto solto fora de qualquer fluxo.
  bot.on('text', async (ctx) => {
    await ctx.reply('Não entendi. Use /ajuda para ver o que eu sei fazer.');
  });

  return bot;
}

/** Lista de comandos que aparece no menu "/" do Telegram. */
export const COMANDOS = [
  { command: 'novolead', description: 'Cadastrar um lead novo' },
  { command: 'meusleads', description: 'Ver meus leads' },
  { command: 'buscarlead', description: 'Procurar um lead pelo nome' },
  { command: 'enviarmensagem', description: 'Enviar uma mensagem pronta' },
  { command: 'cancelar', description: 'Cancelar o que estiver fazendo' },
  { command: 'ajuda', description: 'Ver os comandos disponíveis' },
];
