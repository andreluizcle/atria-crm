import { Markup } from 'telegraf';
import type { InlineKeyboardMarkup } from 'telegraf/types';
import type { LeadComResponsavel, Paginado } from '@atria/core';

/**
 * Paginacao das listas de lead (spec 5.2): nunca despejar 200 leads de uma vez
 * num chat. Cada pagina traz poucos itens e botoes de navegacao.
 */

export function tecladoDeLeads(
  pagina: Paginado<LeadComResponsavel>,
  aoEscolherLead: (leadId: string) => string,
  aoTrocarPagina: (pagina: number) => string,
): Markup.Markup<InlineKeyboardMarkup> {
  const linhas: ReturnType<typeof Markup.button.callback>[][] = pagina.itens.map((lead) => [
    Markup.button.callback(rotuloDoLead(lead), aoEscolherLead(lead.id)),
  ]);

  const navegacao: ReturnType<typeof Markup.button.callback>[] = [];
  if (pagina.pagina > 1) {
    navegacao.push(Markup.button.callback('« Anterior', aoTrocarPagina(pagina.pagina - 1)));
  }
  if (pagina.pagina < pagina.totalPaginas) {
    navegacao.push(Markup.button.callback('Próxima »', aoTrocarPagina(pagina.pagina + 1)));
  }
  if (navegacao.length > 0) linhas.push(navegacao);

  return Markup.inlineKeyboard(linhas);
}

/** Rotulo curto: o Telegram corta textos longos em botao. */
function rotuloDoLead(lead: LeadComResponsavel): string {
  const nome = lead.nome.length > 30 ? `${lead.nome.slice(0, 29)}…` : lead.nome;
  return `${emojiDoStatus(lead.status)} ${nome}`;
}

function emojiDoStatus(status: LeadComResponsavel['status']): string {
  const emojis: Record<LeadComResponsavel['status'], string> = {
    pendente: '🕓',
    qualificacao: '🔎',
    diagnostico: '🩺',
    proposta: '📄',
    negociacao: '🤝',
    fechado: '🎉',
    perdido: '🚫',
  };
  return emojis[status];
}

export function cabecalhoDaPagina(pagina: Paginado<unknown>, titulo: string): string {
  if (pagina.total === 0) return `${titulo}\n\nNenhum resultado.`;

  return `${titulo}\n\n<i>Página ${pagina.pagina} de ${pagina.totalPaginas} — ${pagina.total} lead(s)</i>`;
}
