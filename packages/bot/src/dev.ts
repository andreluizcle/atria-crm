import { config } from 'dotenv';
import { limparSessoesExpiradas, criarClienteAdmin } from '@atria/core';
import { COMANDOS, criarBot } from './bot';

/**
 * Modo de desenvolvimento: long polling, sem webhook e sem tunel.
 *
 * Em producao o bot roda como webhook dentro do app Next.js na Vercel
 * (apps/web/app/api/telegram/webhook). Aqui usamos polling porque e o jeito mais
 * rapido de testar uma mudanca: `npm run dev:bot` e mandar mensagem no Telegram.
 *
 * IMPORTANTE: nao rode este script ao mesmo tempo que um webhook registrado no
 * mesmo bot — o Telegram entrega o update para um so, e voce vai achar que o bot
 * ficou mudo. Use um segundo bot de teste do @BotFather para desenvolver.
 */

config({ path: new URL('../../../.env.local', import.meta.url).pathname });

async function principal(): Promise<void> {
  const bot = criarBot();

  await bot.telegram.setMyCommands(COMANDOS);
  await limparSessoesExpiradas(criarClienteAdmin());

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));

  console.log('[atria-crm] bot em long polling. Ctrl+C para parar.');
  await bot.launch();
}

principal().catch((erro) => {
  console.error('[atria-crm] falha ao iniciar o bot:', erro);
  process.exit(1);
});
