import { NextResponse, type NextRequest } from 'next/server';
import { criarBot } from '@atria/bot';
import { registrarErro, requerEnv } from '@atria/core';

/**
 * Webhook do Telegram — e aqui que o bot roda em producao.
 *
 * Optamos por hospedar o bot dentro do proprio app Next na Vercel: um unico
 * deploy, um unico repositorio e nenhum servico extra para a EJ manter. O custo
 * dessa escolha e que nao existe memoria entre requisicoes, e por isso o estado
 * das conversas vive na tabela `bot_sessoes`.
 *
 * Esta rota fica FORA do middleware de autenticacao (ver middleware.ts): quem
 * chama e o Telegram, nao um usuario logado. A autenticacao dela e o header
 * secreto abaixo.
 */

// Precisa do runtime Node: telegraf e o SDK do Supabase nao rodam no edge.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HEADER_SEGREDO = 'x-telegram-bot-api-secret-token';

export async function POST(requisicao: NextRequest) {
  const segredoEsperado = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!segredoEsperado) {
    registrarErro('webhook', 'TELEGRAM_WEBHOOK_SECRET nao configurado — recusando updates.');
    return NextResponse.json({ erro: 'webhook nao configurado' }, { status: 500 });
  }

  // Sem isso, qualquer pessoa que descobrisse a URL poderia injetar updates
  // falsos e cadastrar leads em nome de um membro.
  if (requisicao.headers.get(HEADER_SEGREDO) !== segredoEsperado) {
    return NextResponse.json({ erro: 'nao autorizado' }, { status: 401 });
  }

  try {
    const update = await requisicao.json();
    const bot = criarBot();

    await bot.handleUpdate(update);
  } catch (erro) {
    // Sempre 200 para o Telegram. Devolver erro faz ele reenviar o mesmo update
    // em loop, e um bug de formatacao viraria centenas de mensagens repetidas.
    registrarErro('webhook.handleUpdate', erro);
  }

  return NextResponse.json({ ok: true });
}

/** GET simples para conferir no navegador se a rota subiu. */
export async function GET() {
  try {
    requerEnv('TELEGRAM_BOT_TOKEN');
    return NextResponse.json({ status: 'webhook ativo' });
  } catch {
    return NextResponse.json({ status: 'TELEGRAM_BOT_TOKEN nao configurado' }, { status: 500 });
  }
}
