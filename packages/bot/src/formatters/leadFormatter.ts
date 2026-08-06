import {
  ROTULO_ORIGEM_LEAD,
  ROTULO_STATUS_LEAD,
  formatarCnpj,
  formatarTelefone,
  type LeadComResponsavel,
  type OrigemLead,
  type StatusLead,
} from '@atria/core';

/**
 * Montagem dos textos de lead enviados no chat.
 *
 * Tudo sai em HTML (parse_mode: 'HTML') e TODO valor vindo do banco passa por
 * `escaparHtml`. Um lead chamado "Bar & Cia <do Zé>" quebraria a mensagem inteira
 * do Telegram sem isso.
 */

export function escaparHtml(valor: string): string {
  return valor.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Resumo antes de confirmar o cadastro (spec 5.1). */
export function formatarResumoCadastro(
  dados: Record<string, unknown>,
  nomeResponsavel: string | null,
): string {
  const linha = (rotulo: string, valor: unknown): string | null => {
    if (valor === null || valor === undefined || valor === '') return null;
    return `<b>${rotulo}:</b> ${escaparHtml(String(valor))}`;
  };

  const telefone = typeof dados.telefone === 'string' ? formatarTelefone(dados.telefone) : null;
  const cnpj = typeof dados.cnpj === 'string' ? formatarCnpj(dados.cnpj) : null;
  const origem = typeof dados.origem_lead === 'string' ? ROTULO_ORIGEM_LEAD[dados.origem_lead as OrigemLead] : null;

  const linhas = [
    linha('Nome', dados.nome),
    linha('Telefone', telefone),
    linha('E-mail', dados.email),
    linha('Instagram', dados.instagram),
    linha('LinkedIn', dados.linkedin),
    linha('Site', dados.site),
    linha('CNPJ', cnpj),
    linha('Origem', origem),
    linha('Responsável', nomeResponsavel),
    linha('Observações', dados.observacoes),
  ].filter(Boolean);

  return `📋 <b>Confira antes de salvar</b>\n\n${linhas.join('\n')}`;
}

/** Ficha completa de um lead ja cadastrado. */
export function formatarLeadCompleto(lead: LeadComResponsavel): string {
  const linhas = [
    `${emojiDoStatus(lead.status)} <b>${escaparHtml(lead.nome)}</b>`,
    '',
    `<b>Status:</b> ${ROTULO_STATUS_LEAD[lead.status]}`,
    `<b>Origem:</b> ${ROTULO_ORIGEM_LEAD[lead.origem_lead]}`,
    `<b>Responsável:</b> ${escaparHtml(lead.responsavel_nome ?? 'não definido')}`,
  ];

  if (lead.telefone) linhas.push(`<b>Telefone:</b> ${escaparHtml(formatarTelefone(lead.telefone))}`);
  if (lead.email) linhas.push(`<b>E-mail:</b> ${escaparHtml(lead.email)}`);
  if (lead.instagram) linhas.push(`<b>Instagram:</b> ${escaparHtml(lead.instagram)}`);
  if (lead.linkedin) linhas.push(`<b>LinkedIn:</b> ${escaparHtml(lead.linkedin)}`);
  if (lead.site) linhas.push(`<b>Site:</b> ${escaparHtml(lead.site)}`);
  if (lead.cnpj) linhas.push(`<b>CNPJ:</b> ${escaparHtml(formatarCnpj(lead.cnpj))}`);

  if (lead.observacoes) {
    linhas.push('', `<b>Observações:</b>\n${escaparHtml(lead.observacoes)}`);
  }

  linhas.push('', `<i>Cadastrado em ${formatarData(lead.criado_em)}</i>`);

  return linhas.join('\n');
}

export function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  });
}

function emojiDoStatus(status: StatusLead): string {
  const emojis: Record<StatusLead, string> = {
    novo: '🆕',
    contatado: '📤',
    respondeu: '💬',
    descartado: '🚫',
    fechado: '🎉',
  };
  return emojis[status];
}
