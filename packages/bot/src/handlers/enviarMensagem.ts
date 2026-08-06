import { Markup, type Telegraf } from 'telegraf';
import {
  ROTULO_PLATAFORMA,
  buscarLeadsPorNome,
  buscarUltimoContato,
  enviarEmailParaLead,
  listarMensagensParaLead,
  obterLead,
  obterMensagem,
  prepararDisparo,
  registrarDisparoManual,
  type MensagemPronta,
  type Plataforma,
} from '@atria/core';
import type { ContextoAtria, ContextoAutenticado } from '../contexto';
import { dadosDoBotao, textoDaMensagem } from '../contexto';
import { exigirVinculo } from '../middlewares/exigirVinculo';
import { CB, PREFIXOS, valorDoCallback } from '../keyboards/callbacks';
import { tecladoConfirmarEmail, tecladoLinkExterno } from '../keyboards/botoes';
import { cabecalhoDaPagina, tecladoDeLeads } from '../keyboards/paginacao';
import { formatarDisparo, rotuloDoTemplate } from '../formatters/mensagemFormatter';
import { formatarData } from '../formatters/leadFormatter';
import { FLUXOS, avancarPasso, dadosDaSessao, encerrarFluxo, fluxoAtivo, iniciarFluxo } from '../states/sessaoStore';

/**
 * /enviarmensagem — escolher lead, escolher template, disparar (spec 5.3).
 *
 * O comportamento muda por canal, e a diferenca vem pronta do envioService:
 *   - WhatsApp          -> botao que abre o wa.me com o texto ja escrito
 *   - Instagram/LinkedIn-> texto copiavel + botao "Abrir perfil" (o envio e humano)
 *   - E-mail            -> preview + botao que envia de verdade, com um clique
 */

interface DadosEnvio extends Record<string, unknown> {
  termo?: string;
  leadId?: string;
  mensagemId?: string;
}

export function registrarEnviarMensagem(bot: Telegraf<ContextoAtria>): void {
  bot.command('enviarmensagem', exigirVinculo, async (ctx) => {
    const termo = textoDaMensagem(ctx)?.split(' ').slice(1).join(' ').trim();

    if (termo) {
      await iniciarFluxo(ctx, FLUXOS.enviarMensagem, 'escolhendo_lead', { termo });
      await listarLeads(ctx as ContextoAutenticado, termo);
      return;
    }

    await iniciarFluxo(ctx, FLUXOS.enviarMensagem, 'aguardando_termo');
    await ctx.reply('📨 Para qual lead? Digite parte do nome.');
  });

  bot.on('text', async (ctx, next) => {
    if (!fluxoAtivo(ctx, FLUXOS.enviarMensagem) || ctx.sessao?.passo !== 'aguardando_termo' || !ctx.usuario) {
      return next();
    }

    const termo = textoDaMensagem(ctx)?.trim();
    if (!termo) return;

    await avancarPasso(ctx, 'escolhendo_lead', { termo });
    await listarLeads(ctx as ContextoAutenticado, termo);
  });

  bot.action(new RegExp(`^${PREFIXOS.paginaEnvio}`), async (ctx) => {
    await ctx.answerCbQuery();
    if (!fluxoAtivo(ctx, FLUXOS.enviarMensagem) || !ctx.usuario) return;

    const { termo } = dadosDaSessao<DadosEnvio>(ctx);
    if (!termo) {
      await ctx.reply('A conversa expirou. Comece de novo com /enviarmensagem.');
      return;
    }

    const dados = dadosDoBotao(ctx);
    const pagina = Number(dados ? valorDoCallback(dados, PREFIXOS.paginaEnvio) : '1');
    await listarLeads(ctx as ContextoAutenticado, termo, Number.isFinite(pagina) ? pagina : 1);
  });

  bot.action(new RegExp(`^${PREFIXOS.escolherLead}`), async (ctx) => {
    await ctx.answerCbQuery();
    if (!fluxoAtivo(ctx, FLUXOS.enviarMensagem) || !ctx.usuario) return;

    const dados = dadosDoBotao(ctx);
    const leadId = dados ? valorDoCallback(dados, PREFIXOS.escolherLead) : null;
    if (!leadId) return;

    await avancarPasso(ctx, 'escolhendo_template', { leadId });
    await listarTemplates(ctx as ContextoAutenticado, leadId);
  });

  bot.action(new RegExp(`^${PREFIXOS.escolherTemplate}`), async (ctx) => {
    await ctx.answerCbQuery();
    if (!fluxoAtivo(ctx, FLUXOS.enviarMensagem) || !ctx.usuario) return;

    const dados = dadosDoBotao(ctx);
    const mensagemId = dados ? valorDoCallback(dados, PREFIXOS.escolherTemplate) : null;
    const { leadId } = dadosDaSessao<DadosEnvio>(ctx);
    if (!mensagemId || !leadId) return;

    await processarEscolhaDeTemplate(ctx as ContextoAutenticado, leadId, mensagemId);
  });

  bot.action(CB.confirmarEmail, async (ctx) => {
    await ctx.answerCbQuery('Enviando...');
    if (!fluxoAtivo(ctx, FLUXOS.enviarMensagem) || !ctx.usuario) return;

    const { leadId, mensagemId } = dadosDaSessao<DadosEnvio>(ctx);
    if (!leadId || !mensagemId) {
      await ctx.reply('A conversa expirou. Comece de novo com /enviarmensagem.');
      return;
    }

    const autenticado = ctx as ContextoAutenticado;
    const lead = await obterLead(autenticado.db, leadId);
    const mensagem = await obterMensagem(autenticado.db, mensagemId);

    const resultado = await enviarEmailParaLead(autenticado.db, {
      lead,
      mensagem,
      usuarioId: autenticado.usuario.id,
      origem: 'telegram',
      responsavelNome: lead.responsavel_nome,
    });

    await encerrarFluxo(ctx);
    await ctx.reply(resultado.sucesso ? `✅ ${resultado.mensagem}` : `⚠️ ${resultado.mensagem}`);
  });

  bot.action(CB.cancelarEnvio, async (ctx) => {
    await ctx.answerCbQuery('Cancelado');
    await encerrarFluxo(ctx);
    await ctx.reply('❌ Envio cancelado. Nada foi enviado.');
  });
}

async function listarLeads(ctx: ContextoAutenticado, termo: string, pagina = 1): Promise<void> {
  const resultado = await buscarLeadsPorNome(ctx.db, termo, pagina);

  if (resultado.total === 0) {
    await ctx.reply(`Nenhum lead encontrado para "${termo}".`);
    await encerrarFluxo(ctx);
    return;
  }

  await ctx.reply(cabecalhoDaPagina(resultado, '📨 <b>Escolha o lead</b>'), {
    parse_mode: 'HTML',
    ...tecladoDeLeads(resultado, CB.escolherLead, CB.paginaEnvio),
  });
}

async function listarTemplates(ctx: ContextoAutenticado, leadId: string): Promise<void> {
  const lead = await obterLead(ctx.db, leadId);
  const mensagens = await listarMensagensParaLead(ctx.db, lead);

  if (mensagens.length === 0) {
    await encerrarFluxo(ctx);
    await ctx.reply(
      `Não há template ativo para os canais que <b>${lead.nome}</b> tem cadastrados.\n\n` +
        'Cadastre um template no painel web, em <b>Mensagens</b>.',
      { parse_mode: 'HTML' },
    );
    return;
  }

  const botoes = mensagens.map((m) => [Markup.button.callback(rotuloDoTemplate(m), CB.escolherTemplate(m.id))]);
  botoes.push([Markup.button.callback('❌ Cancelar', CB.cancelarEnvio)]);

  await ctx.reply(`Qual mensagem enviar para <b>${lead.nome}</b>?`, {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard(botoes),
  });
}

async function processarEscolhaDeTemplate(
  ctx: ContextoAutenticado,
  leadId: string,
  mensagemId: string,
): Promise<void> {
  const lead = await obterLead(ctx.db, leadId);
  const mensagem = await obterMensagem(ctx.db, mensagemId);

  await avisarSeJaEnviou(ctx, leadId, mensagem);

  const disparo = await prepararDisparo(ctx.db, lead, mensagem, lead.responsavel_nome);

  // E-mail sai de verdade: pede confirmacao explicita antes de disparar.
  if (disparo.acao === 'envio_automatico') {
    await avancarPasso(ctx, 'confirmando_email', { mensagemId });
    await ctx.reply(formatarDisparo(disparo, lead.nome), {
      parse_mode: 'HTML',
      ...tecladoConfirmarEmail(),
    });
    return;
  }

  // Demais canais: o sistema so prepara; o clique de enviar e sempre humano.
  await ctx.reply(formatarDisparo(disparo, lead.nome), {
    parse_mode: 'HTML',
    ...(disparo.url ? tecladoLinkExterno(rotuloDoBotao(disparo.plataforma), disparo.url) : {}),
  });

  await registrarDisparoManual(ctx.db, {
    lead,
    mensagem,
    usuarioId: ctx.usuario.id,
    disparo,
    origem: 'telegram',
  });

  await encerrarFluxo(ctx);
}

/** Evita follow-up repetido sem perceber (spec 4). Avisa, mas nao impede. */
async function avisarSeJaEnviou(
  ctx: ContextoAutenticado,
  leadId: string,
  mensagem: MensagemPronta,
): Promise<void> {
  const ultimo = await buscarUltimoContato(ctx.db, leadId, mensagem.id);
  if (!ultimo) return;

  await ctx.reply(
    `ℹ️ Essa mensagem já foi usada com este lead em ${formatarData(ultimo.enviado_em)}. ` +
      'Se for follow-up, tudo bem — só não repita o primeiro contato.',
  );
}

function rotuloDoBotao(plataforma: Plataforma): string {
  if (plataforma === 'whatsapp') return '💬 Abrir WhatsApp';
  return `🔗 Abrir perfil no ${ROTULO_PLATAFORMA[plataforma]}`;
}
