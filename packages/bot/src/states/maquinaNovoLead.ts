import { criarLead, type NovoLead } from '@atria/core';
import type { ContextoAutenticado } from '../contexto';
import { tecladoConfirmacao, tecladoDeOpcoes, tecladoObrigatorio, tecladoPular } from '../keyboards/botoes';
import { formatarResumoCadastro } from '../formatters/leadFormatter';
import { PASSOS_NOVO_LEAD, PASSO_CONFIRMACAO, passoPorIndice } from './passosNovoLead';
import { avancarPasso, dadosDaSessao, encerrarFluxo } from './sessaoStore';

/**
 * Motor do cadastro conversacional.
 *
 * Percorre PASSOS_NOVO_LEAD um a um. O handler (handlers/novoLead.ts) so traduz
 * eventos do Telegram em chamadas daqui — toda a decisao de "qual o próximo
 * passo" mora neste arquivo.
 */

export interface DadosNovoLead extends Record<string, unknown> {
  valores: Record<string, string>;
  /** true quando o membro voltou para corrigir um campo pelo botao Editar. */
  editando?: boolean;
}

/** Pergunta o passo de indice N, com o teclado adequado ao tipo do passo. */
export async function perguntarPasso(ctx: ContextoAutenticado, indice: number): Promise<void> {
  const passo = passoPorIndice(indice);
  if (!passo) return mostrarResumo(ctx);

  await avancarPasso(ctx, String(indice));

  if (passo.tipo === 'escolha') {
    await ctx.reply(passo.pergunta, {
      parse_mode: 'HTML',
      ...tecladoDeOpcoes(passo.opcoes ?? []),
    });
    return;
  }

  const dica = passo.opcional ? '\n\n<i>Opcional — toque em Pular se não tiver.</i>' : '';
  await ctx.reply(passo.pergunta + dica, {
    parse_mode: 'HTML',
    ...(passo.opcional ? tecladoPular() : tecladoObrigatorio()),
  });
}

/**
 * Guarda o valor e decide o proximo passo.
 * Se o membro veio do botao Editar, volta direto para o resumo — nao refaz o
 * cadastro inteiro so porque corrigiu o telefone.
 */
export async function registrarValorEAvancar(
  ctx: ContextoAutenticado,
  indice: number,
  campo: string,
  valor: string | null,
): Promise<void> {
  const dados = dadosDaSessao<DadosNovoLead>(ctx);
  const valores = { ...(dados.valores ?? {}) };

  if (valor === null) {
    delete valores[campo];
  } else {
    valores[campo] = valor;
  }

  if (dados.editando) {
    await avancarPasso(ctx, PASSO_CONFIRMACAO, { valores, editando: false });
    return mostrarResumo(ctx);
  }

  await avancarPasso(ctx, String(indice + 1), { valores });
  return perguntarPasso(ctx, indice + 1);
}

/** Resumo com Confirmar / Editar / Cancelar (spec 5.1). */
export async function mostrarResumo(ctx: ContextoAutenticado): Promise<void> {
  const { valores } = dadosDaSessao<DadosNovoLead>(ctx);
  await avancarPasso(ctx, PASSO_CONFIRMACAO);

  // O responsavel e sempre quem esta cadastrando — o bot nao pergunta mais. Ainda
  // aparece no resumo para a atribuicao ficar visivel antes de confirmar.
  await ctx.reply(formatarResumoCadastro(valores ?? {}, ctx.usuario.nome), {
    parse_mode: 'HTML',
    ...tecladoConfirmacao(),
  });
}

/** Grava no banco. A validacao final e do leadService — o bot nao duplica regra. */
export async function salvarLead(ctx: ContextoAutenticado): Promise<void> {
  const { valores } = dadosDaSessao<DadosNovoLead>(ctx);

  // Quem cadastra fica como responsavel. O bot deixou de perguntar isso: qualquer
  // membro cadastra lead, mesmo fora do comercial, e nao cabe a ele distribuir.
  // A troca de responsavel, quando precisa, e feita no painel.
  const lead = await criarLead(ctx.db, {
    ...valores,
    responsavel_id: ctx.usuario.id,
    criado_por: ctx.usuario.id,
  } as unknown as NovoLead);

  await encerrarFluxo(ctx);

  await ctx.reply(
    `✅ Lead <b>${lead.nome.replace(/</g, '&lt;')}</b> cadastrado!\n\n` +
      'Use /enviarmensagem para disparar um primeiro contato.',
    { parse_mode: 'HTML' },
  );
}

/** Campos ja preenchidos, para o menu do botao Editar. */
export function camposEditaveis(valores: Record<string, string>): Array<{ rotulo: string; campo: string }> {
  return PASSOS_NOVO_LEAD.map((passo) => {
    const preenchido = valores[passo.campo];
    const marca = preenchido ? '✅' : '➖';
    return { rotulo: `${marca} ${rotuloDoCampo(passo.campo)}`, campo: passo.campo };
  });
}

function rotuloDoCampo(campo: string): string {
  const rotulos: Record<string, string> = {
    nome: 'Nome',
    telefone: 'Telefone',
    email: 'E-mail',
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
    site: 'Site',
    cnpj: 'CNPJ',
    origem_lead: 'Origem',
    observacoes: 'Observações',
  };
  return rotulos[campo] ?? campo;
}
