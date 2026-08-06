import type { Telegraf } from 'telegraf';
import { buscarLeadsPorNome } from '@atria/core';
import type { ContextoAtria, ContextoAutenticado } from '../contexto';
import { dadosDoBotao, textoDaMensagem } from '../contexto';
import { exigirVinculo } from '../middlewares/exigirVinculo';
import { CB, PREFIXOS, valorDoCallback } from '../keyboards/callbacks';
import { cabecalhoDaPagina, tecladoDeLeads } from '../keyboards/paginacao';
import { FLUXOS, avancarPasso, dadosDaSessao, fluxoAtivo, iniciarFluxo } from '../states/sessaoStore';

/** /buscarlead — procura por nome, e-mail ou CNPJ, com resultado paginado (spec 5.2). */

interface DadosBusca extends Record<string, unknown> {
  termo?: string;
}

export function registrarBuscarLead(bot: Telegraf<ContextoAtria>): void {
  bot.command('buscarlead', exigirVinculo, async (ctx) => {
    // Aceita "/buscarlead padaria" direto, sem a pergunta intermediaria.
    const termo = textoDaMensagem(ctx)?.split(' ').slice(1).join(' ').trim();

    if (termo) {
      await iniciarFluxo(ctx, FLUXOS.buscarLead, 'resultados', { termo });
      await mostrarResultados(ctx as ContextoAutenticado, termo, 1);
      return;
    }

    await iniciarFluxo(ctx, FLUXOS.buscarLead, 'aguardando_termo');
    await ctx.reply('🔎 O que você quer procurar? (nome, e-mail ou CNPJ)');
  });

  bot.action(new RegExp(`^${PREFIXOS.paginaBusca}`), async (ctx) => {
    await ctx.answerCbQuery();
    if (!ctx.usuario) return;

    const { termo } = dadosDaSessao<DadosBusca>(ctx);
    if (!termo) {
      await ctx.reply('A busca expirou. Use /buscarlead de novo.');
      return;
    }

    const dados = dadosDoBotao(ctx);
    const pagina = Number(dados ? valorDoCallback(dados, PREFIXOS.paginaBusca) : '1');
    await mostrarResultados(ctx as ContextoAutenticado, termo, Number.isFinite(pagina) ? pagina : 1);
  });

  bot.on('text', async (ctx, next) => {
    if (!fluxoAtivo(ctx, FLUXOS.buscarLead) || ctx.sessao?.passo !== 'aguardando_termo' || !ctx.usuario) {
      return next();
    }

    const termo = textoDaMensagem(ctx)?.trim();
    if (!termo) return;

    await avancarPasso(ctx, 'resultados', { termo });
    await mostrarResultados(ctx as ContextoAutenticado, termo, 1);
  });
}

async function mostrarResultados(ctx: ContextoAutenticado, termo: string, pagina: number): Promise<void> {
  const resultado = await buscarLeadsPorNome(ctx.db, termo, pagina);

  if (resultado.total === 0) {
    await ctx.reply(`Nenhum lead encontrado para "${termo}".\n\nTente outro termo ou cadastre com /novolead.`);
    return;
  }

  await ctx.reply(cabecalhoDaPagina(resultado, `🔎 <b>Resultados para "${escapar(termo)}"</b>`), {
    parse_mode: 'HTML',
    ...tecladoDeLeads(resultado, CB.verLead, CB.paginaBusca),
  });
}

function escapar(valor: string): string {
  return valor.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
