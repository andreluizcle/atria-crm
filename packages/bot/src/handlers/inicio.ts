import type { Telegraf } from 'telegraf';
import { buscarUsuarioPorId, mensagemParaUsuario, validarTokenVinculo, vincularTelegram } from '@atria/core';
import type { ContextoAtria } from '../contexto';
import { idDoTelegram, textoDaMensagem } from '../contexto';

/**
 * /start e /ajuda — as unicas rotas que funcionam sem vinculo, porque sao elas
 * que explicam como se vincular.
 *
 * `/start <token>` vem do deep link gerado no painel web. O token e assinado com
 * HMAC (ver core/lib/vinculoTelegram.ts): so quem esta logado no painel consegue
 * gerar um valido, entao ninguem se passa por outro membro.
 */
export function registrarInicio(bot: Telegraf<ContextoAtria>): void {
  bot.start(async (ctx) => {
    const token = textoDaMensagem(ctx)?.split(' ')[1]?.trim();

    if (token) {
      await processarVinculo(ctx, token);
      return;
    }

    if (ctx.usuario) {
      await ctx.reply(`Olá de novo, ${ctx.usuario.nome}! 👋\n\n${TEXTO_AJUDA}`, { parse_mode: 'HTML' });
      return;
    }

    await ctx.reply(
      '👋 Oi! Sou o bot de prospecção da Atria.\n\n' +
        'Antes de começar, preciso saber quem é você. Entre no painel web, ' +
        'abra <b>Meu perfil</b> e clique em <b>Vincular Telegram</b>.',
      { parse_mode: 'HTML' },
    );
  });

  bot.command('ajuda', async (ctx) => {
    await ctx.reply(TEXTO_AJUDA, { parse_mode: 'HTML' });
  });
}

async function processarVinculo(ctx: ContextoAtria, token: string): Promise<void> {
  const telegramId = idDoTelegram(ctx);
  if (!telegramId) return;

  try {
    const { usuarioId } = validarTokenVinculo(token);

    const usuario = await buscarUsuarioPorId(ctx.db, usuarioId);
    if (!usuario || !usuario.ativo) {
      await ctx.reply('⚠️ Esse membro não está ativo no sistema. Fale com quem administra a EJ.');
      return;
    }

    await vincularTelegram(ctx.db, usuarioId, telegramId);

    await ctx.reply(
      `✅ Pronto, ${usuario.nome}! Sua conta do Telegram está vinculada.\n\n${TEXTO_AJUDA}`,
      { parse_mode: 'HTML' },
    );
  } catch (erro) {
    await ctx.reply(`⚠️ ${mensagemParaUsuario(erro)}`);
  }
}

const TEXTO_AJUDA = [
  '<b>O que eu sei fazer:</b>',
  '',
  '/novolead — cadastrar um lead novo, passo a passo',
  '/meusleads — ver os leads sob sua responsabilidade',
  '/buscarlead — procurar um lead pelo nome',
  '/enviarmensagem — disparar uma mensagem pronta para um lead',
  '/cancelar — abandonar o que estiver fazendo',
  '/ajuda — mostrar esta lista',
].join('\n');
