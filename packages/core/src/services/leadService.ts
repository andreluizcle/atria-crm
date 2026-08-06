import type { ClienteSupabase } from '../lib/supabaseAdmin';
import type { AtualizacaoLead, FiltroLeads, Lead, LeadComResponsavel, NovoLead, Paginado } from '../types/lead';
import { ErroDeNegocio } from '../lib/erros';
import {
  atualizarLead as atualizarNoBanco,
  buscarLeadPorId,
  criarLead as criarNoBanco,
  listarLeads as listarNoBanco,
  removerLead as removerNoBanco,
} from '../repositories/leadRepository';
import { garantirLeadValido, normalizarCamposDoLead, validarAtualizacaoLead } from '../validacao/leadValidacao';

/**
 * Regras de negocio de lead. Bot e painel chamam estas funcoes — nunca o
 * repository direto — para que validacao e normalizacao rodem sempre.
 */

export async function criarLead(db: ClienteSupabase, entrada: NovoLead): Promise<Lead> {
  const normalizado = normalizarCamposDoLead(entrada);
  garantirLeadValido(normalizado);

  return criarNoBanco(db, { status: 'novo', ...normalizado });
}

export async function atualizarLead(
  db: ClienteSupabase,
  id: string,
  mudancas: AtualizacaoLead,
): Promise<Lead> {
  const atual = await buscarLeadPorId(db, id);
  if (!atual) throw new ErroDeNegocio('Lead não encontrado.');

  const normalizado = normalizarCamposDoLead(mudancas);
  const { valido, erros } = validarAtualizacaoLead(atual, normalizado);

  if (!valido) {
    throw new ErroDeNegocio(
      erros.map((e) => e.mensagem).join(' '),
      erros.map((e) => e.campo),
    );
  }

  return atualizarNoBanco(db, id, normalizado);
}

export async function obterLead(db: ClienteSupabase, id: string): Promise<LeadComResponsavel> {
  const lead = await buscarLeadPorId(db, id);
  if (!lead) throw new ErroDeNegocio('Lead não encontrado.');
  return lead;
}

export async function listarLeads(
  db: ClienteSupabase,
  filtro: FiltroLeads = {},
): Promise<Paginado<LeadComResponsavel>> {
  return listarNoBanco(db, filtro);
}

/** Usado pelo /meusleads do bot. */
export async function listarLeadsDoResponsavel(
  db: ClienteSupabase,
  responsavelId: string,
  pagina = 1,
  porPagina = 5,
): Promise<Paginado<LeadComResponsavel>> {
  return listarNoBanco(db, { responsavel_id: responsavelId, pagina, porPagina });
}

export async function buscarLeadsPorNome(
  db: ClienteSupabase,
  termo: string,
  pagina = 1,
  porPagina = 5,
): Promise<Paginado<LeadComResponsavel>> {
  if (termo.trim().length < 2) {
    throw new ErroDeNegocio('Digite pelo menos 2 letras para buscar.');
  }

  return listarNoBanco(db, { busca: termo, pagina, porPagina });
}

/** Soft delete — o historico de contatos do lead continua existindo. */
export async function removerLead(db: ClienteSupabase, id: string): Promise<void> {
  const lead = await buscarLeadPorId(db, id);
  if (!lead) throw new ErroDeNegocio('Lead não encontrado.');

  await removerNoBanco(db, id);
}
