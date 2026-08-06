import type { Telegraf } from 'telegraf';
import { listarLeadsDoResponsavel, obterLead } from '@atria/core';
import type { ContextoAtria, ContextoAutenticado } from '../contexto';
import { dadosDoBotao } from '../contexto';
import { exigirVinculo } from '../middlewares/exigirVinculo';
import { CB, PREFIXOS, valorDoCallback } from '../keyboards/callbacks';
import { cabecalhoDaPagina, tecladoDeLeads } from '../keyboards/paginacao';
import { formatarLeadCompleto } from '../formatters/leadFormatter';

/** /meusleads — lista paginada dos leads do proprio membro (spec 5.2). */
export function registrarMeusLeads(bot: Telegraf<ContextoAtria>): void {
  bot.command('meusleads', exigirVinculo, async (ctx) => {
    await mostrarPagina(ctx as ContextoAutenticado, 1);
  });

  bot.action(new RegExp(`^${PREFIXOS.paginaMeusLeads}`), async (ctx) => {
    await ctx.answerCbQuery();
    if (!ctx.usuario) return;

    const dados = dadosDoBotao(ctx);
    const pagina = Number(dados ? valorDoCallback(dados, PREFIXOS.paginaMeusLeads) : '1');
    await mostrarPagina(ctx as ContextoAutenticado, Number.isFinite(pagina) ? pagina : 1);
  });

  // Abrir a ficha de um lead a partir de qualquer lista.
  bot.action(new RegExp(`^${PREFIXOS.verLead}`), async (ctx) => {
    await ctx.answerCbQuery();
    if (!ctx.usuario) return;

    const dados = dadosDoBotao(ctx);
    const leadId = dados ? valorDoCallback(dados, PREFIXOS.verLead) : null;
    if (!leadId) return;

    const lead = await obterLead(ctx.db, leadId);
    await ctx.reply(formatarLeadCompleto(lead), { parse_mode: 'HTML' });
  });
}

async function mostrarPagina(ctx: ContextoAutenticado, pagina: number): Promise<void> {
  const resultado = await listarLeadsDoResponsavel(ctx.db, ctx.usuario.id, pagina);

  if (resultado.total === 0) {
    await ctx.reply('Você ainda não tem leads sob sua responsabilidade.\n\nCadastre um com /novolead.');
    return;
  }

  await ctx.reply(cabecalhoDaPagina(resultado, '📇 <b>Seus leads</b>'), {
    parse_mode: 'HTML',
    ...tecladoDeLeads(resultado, CB.verLead, CB.paginaMeusLeads),
  });
}
