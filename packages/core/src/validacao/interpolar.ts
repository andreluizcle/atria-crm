import type { Lead } from '../types/lead';
import { ROTULO_ORIGEM_LEAD, ROTULO_STATUS_LEAD } from '../types/enums';
import { formatarCnpj } from './cnpj';
import { formatarTelefone } from './telefone';

/**
 * Interpolacao das variaveis {{...}} dos templates de mensagem.
 *
 * Usada pelo bot e pelo painel — o texto precisa sair identico nos dois,
 * senao o historico de contatos vira ficcao.
 */

export const VARIAVEIS_DISPONIVEIS = [
  'nome',
  'telefone',
  'email',
  'site',
  'instagram',
  'linkedin',
  'cnpj',
  'origem_lead',
  'status',
  'responsavel',
] as const;

export type VariavelTemplate = (typeof VARIAVEIS_DISPONIVEIS)[number];

export type ContextoInterpolacao = Partial<Record<VariavelTemplate, string | null>>;

/** Monta o contexto a partir de um lead, ja com os valores formatados para leitura. */
export function contextoDoLead(lead: Lead, responsavelNome?: string | null): ContextoInterpolacao {
  return {
    nome: lead.nome,
    telefone: lead.telefone ? formatarTelefone(lead.telefone) : null,
    email: lead.email,
    site: lead.site,
    instagram: lead.instagram,
    linkedin: lead.linkedin,
    cnpj: lead.cnpj ? formatarCnpj(lead.cnpj) : null,
    origem_lead: ROTULO_ORIGEM_LEAD[lead.origem_lead],
    status: ROTULO_STATUS_LEAD[lead.status],
    responsavel: responsavelNome ?? null,
  };
}

/**
 * Substitui {{variavel}} pelo valor do contexto.
 *
 * Variavel desconhecida ou sem valor vira string vazia, de proposito: e melhor a
 * mensagem sair com uma frase incompleta do que chegar no cliente com um
 * "{{nome}}" literal no meio do texto.
 */
export function interpolar(template: string, contexto: ContextoInterpolacao): string {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_original, chave: string) => {
    const valor = contexto[chave.toLowerCase() as VariavelTemplate];
    return valor ?? '';
  });
}

/** Lista as variaveis usadas num template — o painel usa para avisar de nome invalido. */
export function variaveisUsadas(template: string): string[] {
  const encontradas = template.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/gi);
  return [...new Set([...encontradas].map((m) => (m[1] ?? '').toLowerCase()))];
}

export function variaveisInvalidas(template: string): string[] {
  return variaveisUsadas(template).filter(
    (v) => !(VARIAVEIS_DISPONIVEIS as readonly string[]).includes(v),
  );
}
