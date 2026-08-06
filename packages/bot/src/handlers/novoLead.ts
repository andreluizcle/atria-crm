import type { Telegraf } from 'telegraf';
import type { ContextoAtria, ContextoAutenticado } from '../contexto';
import { dadosDoBotao, textoDaMensagem } from '../contexto';
import { exigirVinculo } from '../middlewares/exigirVinculo';
import { CB, PREFIXOS, valorDoCallback } from '../keyboards/callbacks';
import { tecladoEscolherCampo } from '../keyboards/botoes';
import {
  camposEditaveis,
  mostrarResumo,
  perguntarPasso,
  registrarValorEAvancar,
  salvarLead,
  type DadosNovoLead,
} from '../states/maquinaNovoLead';
import { PASSO_CONFIRMACAO, indiceDoCampo, passoPorIndice } from '../states/passosNovoLead';
import { FLUXOS, avancarPasso, dadosDaSessao, encerrarFluxo, fluxoAtivo, iniciarFluxo } from '../states/sessaoStore';

/**
 * /novolead — cadastro passo a passo (spec 5.1).
 *
 * Este arquivo so traduz eventos do Telegram em chamadas do motor
 * (states/maquinaNovoLead.ts). Nada de regra de negocio aqui.
 */
export function registrarNovoLead(bot: Telegraf<ContextoAtria>): void {
  bot.command('novolead', exigirVinculo, async (ctx) => {
    await iniciarFluxo(ctx, FLUXOS.novoLead, '0', { valores: {} });
    await perguntarPasso(ctx as ContextoAutenticado, 0);
  });

  bot.action(CB.PULAR, async (ctx) => {
    await ctx.answerCbQuery();
    if (!fluxoAtivo(ctx, FLUXOS.novoLead) || !ctx.usuario) return;

    const indice = Number(ctx.sessao?.passo);
    const passo = passoPorIndice(indice);
    if (!passo) return;

    if (!passo.opcional) {
      await ctx.reply('Esse campo é obrigatório, não dá para pular.');
      return;
    }

    await registrarValorEAvancar(ctx as ContextoAutenticado, indice, passo.campo, null);
  });

  // Escolha de origem do lead ou de membro responsavel.
  bot.action(new RegExp(`^${PREFIXOS.opcao}`), async (ctx) => {
    await ctx.answerCbQuery();
    if (!fluxoAtivo(ctx, FLUXOS.novoLead) || !ctx.usuario) return;

    const dados = dadosDoBotao(ctx);
    const valor = dados ? valorDoCallback(dados, PREFIXOS.opcao) : null;
    const indice = Number(ctx.sessao?.passo);
    const passo = passoPorIndice(indice);
    if (!valor || !passo) return;

    await registrarValorEAvancar(ctx as ContextoAutenticado, indice, passo.campo, valor);
  });

  bot.action(CB.CONFIRMAR, async (ctx) => {
    await ctx.answerCbQuery();
    if (!fluxoAtivo(ctx, FLUXOS.novoLead) || !ctx.usuario) return;

    await salvarLead(ctx as ContextoAutenticado);
  });

  bot.action(CB.CANCELAR, async (ctx) => {
    await ctx.answerCbQuery('Cancelado');
    await encerrarFluxo(ctx);
    await ctx.reply('❌ Cadastro cancelado. Nada foi salvo.');
  });

  bot.action(`${CB.EDITAR}:voltar`, async (ctx) => {
    await ctx.answerCbQuery();
    if (!fluxoAtivo(ctx, FLUXOS.novoLead) || !ctx.usuario) return;

    await mostrarResumo(ctx as ContextoAutenticado);
  });

  bot.action(CB.EDITAR, async (ctx) => {
    await ctx.answerCbQuery();
    if (!fluxoAtivo(ctx, FLUXOS.novoLead) || !ctx.usuario) return;

    const { valores } = dadosDaSessao<DadosNovoLead>(ctx);
    await ctx.reply('✏️ Qual campo você quer corrigir?', tecladoEscolherCampo(camposEditaveis(valores ?? {})));
  });

  bot.action(new RegExp(`^${PREFIXOS.editarCampo}`), async (ctx) => {
    await ctx.answerCbQuery();
    if (!fluxoAtivo(ctx, FLUXOS.novoLead) || !ctx.usuario) return;

    const dados = dadosDoBotao(ctx);
    const campo = dados ? valorDoCallback(dados, PREFIXOS.editarCampo) : null;
    if (!campo) return;

    const indice = indiceDoCampo(campo);
    if (indice < 0) return;

    // A flag faz o motor voltar ao resumo depois desta resposta, em vez de
    // continuar o cadastro do zero.
    await avancarPasso(ctx, String(indice), { editando: true });
    await perguntarPasso(ctx as ContextoAutenticado, indice);
  });

  // Respostas em texto durante o fluxo.
  bot.on('text', async (ctx, next) => {
    if (!fluxoAtivo(ctx, FLUXOS.novoLead) || !ctx.usuario) return next();

    const passoAtual = ctx.sessao?.passo;
    if (passoAtual === PASSO_CONFIRMACAO) {
      await ctx.reply('Use os botões acima para confirmar, editar ou cancelar.');
      return;
    }

    const indice = Number(passoAtual);
    const passo = passoPorIndice(indice);
    if (!passo) return next();

    const texto = textoDaMensagem(ctx);
    if (texto === null) return;

    if (passo.tipo !== 'texto') {
      await ctx.reply('Escolha uma das opções nos botões acima.');
      return;
    }

    const resultado = passo.validar?.(texto) ?? { ok: true as const, valor: texto.trim() };

    if (!resultado.ok) {
      // Erro de formato nao perde o progresso (spec 5.4): so repete a pergunta.
      await ctx.reply(`⚠️ ${resultado.mensagem}\n\nTente de novo:`);
      return;
    }

    await registrarValorEAvancar(ctx as ContextoAutenticado, indice, passo.campo, resultado.valor);
  });
}
