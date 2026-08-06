import { config } from 'dotenv';
import { COMANDOS, criarBot } from './bot';

/**
 * Registra o menu de comandos — a listinha que aparece ao digitar "/" no chat.
 *
 * Por que existe: `setMyCommands` so era chamado pelo dev.ts, que e o runner de
 * long polling local. Em producao o bot roda como webhook e ninguem chamava
 * isso, entao o menu ficava vazio: os comandos funcionavam, mas so para quem ja
 * sabia de cor que existiam.
 *
 * Rode uma vez depois do deploy:
 *   TELEGRAM_BOT_TOKEN=<token de producao> npm run bot:comandos
 *
 * E seguro rodar com o webhook ativo. `setMyCommands` e uma chamada de
 * configuracao, nao consome updates — e, diferente do dev.ts, este script
 * nunca chama bot.launch(), entao nao disputa mensagens com o webhook.
 */

// O dotenv nao sobrescreve variavel que ja esta no ambiente, entao da para
// apontar para producao com um prefixo na linha de comando sem tocar no
// .env.local usado no dia a dia.
config({ path: new URL('../../../.env.local', import.meta.url).pathname });

async function principal(): Promise<void> {
  const bot = criarBot();

  // Confirma em qual bot estamos mexendo antes de escrever — evita registrar os
  // comandos no bot de teste achando que era o de producao, e vice-versa.
  const eu = await bot.telegram.getMe();
  await bot.telegram.setMyCommands(COMANDOS);

  console.log(`[atria-crm] ${COMANDOS.length} comandos registrados em @${eu.username}:`);
  for (const { command, description } of COMANDOS) {
    console.log(`  /${command} — ${description}`);
  }
}

principal().catch((erro) => {
  console.error('[atria-crm] falha ao registrar os comandos:', erro);
  process.exit(1);
});
