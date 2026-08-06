import type { ClienteSupabase } from '../lib/supabaseAdmin';
import type {
  AtualizacaoLead,
  FiltroLeads,
  Lead,
  LeadComResponsavel,
  NovoLead,
  Paginado,
} from '../types/lead';
import type { StatusLead } from '../types/enums';
import { traduzirErroSupabase } from '../lib/erroSupabase';

/**
 * Unico ponto do sistema que consulta a tabela `leads`.
 * Nenhum handler do bot e nenhuma page do Next devem chamar o Supabase direto (spec 3).
 *
 * O cliente vem por parametro: o bot passa o cliente `service_role`, o painel passa
 * o cliente da sessao do usuario. O mesmo codigo serve para os dois, e a RLS
 * continua valendo no caminho do painel.
 */

const TABELA = 'leads';
const COLUNAS = '*';
const COLUNAS_COM_RESPONSAVEL = '*, responsavel:usuarios!leads_responsavel_id_fkey(nome)';
const POR_PAGINA_PADRAO = 10;

interface LinhaComResponsavel extends Lead {
  responsavel?: { nome: string } | null;
}

export async function buscarLeadPorId(db: ClienteSupabase, id: string): Promise<LeadComResponsavel | null> {
  const { data, error } = await db
    .from(TABELA)
    .select(COLUNAS_COM_RESPONSAVEL)
    .eq('id', id)
    .is('deletado_em', null)
    .maybeSingle();

  if (error) traduzirErroSupabase('leadRepository.buscarLeadPorId', error);
  return data ? achatarResponsavel(data as unknown as LinhaComResponsavel) : null;
}

export async function listarLeads(
  db: ClienteSupabase,
  filtro: FiltroLeads = {},
): Promise<Paginado<LeadComResponsavel>> {
  const pagina = Math.max(1, filtro.pagina ?? 1);
  const porPagina = filtro.porPagina ?? POR_PAGINA_PADRAO;
  const de = (pagina - 1) * porPagina;

  let consulta = db
    .from(TABELA)
    .select(COLUNAS_COM_RESPONSAVEL, { count: 'exact' })
    .is('deletado_em', null);

  if (filtro.status) consulta = consulta.eq('status', filtro.status);
  if (filtro.origem_lead) consulta = consulta.eq('origem_lead', filtro.origem_lead);
  if (filtro.responsavel_id) consulta = consulta.eq('responsavel_id', filtro.responsavel_id);

  if (filtro.busca?.trim()) {
    const termo = `%${filtro.busca.trim()}%`;
    consulta = consulta.or(`nome.ilike.${termo},email.ilike.${termo},cnpj.ilike.${termo}`);
  }

  const { data, error, count } = await consulta.order('criado_em', { ascending: false }).range(de, de + porPagina - 1);

  if (error) traduzirErroSupabase('leadRepository.listarLeads', error);

  const total = count ?? 0;
  return {
    itens: ((data ?? []) as unknown as LinhaComResponsavel[]).map(achatarResponsavel),
    total,
    pagina,
    porPagina,
    totalPaginas: Math.max(1, Math.ceil(total / porPagina)),
  };
}

export async function criarLead(db: ClienteSupabase, novo: NovoLead): Promise<Lead> {
  const { data, error } = await db.from(TABELA).insert(novo).select(COLUNAS).single();

  if (error) traduzirErroSupabase('leadRepository.criarLead', error);
  return data as unknown as Lead;
}

/** Insercao em lote da importacao da Casa dos Dados. Devolve os que entraram. */
export async function criarLeadsEmLote(db: ClienteSupabase, novos: NovoLead[]): Promise<Lead[]> {
  if (novos.length === 0) return [];

  const { data, error } = await db.from(TABELA).insert(novos).select(COLUNAS);

  if (error) traduzirErroSupabase('leadRepository.criarLeadsEmLote', error);
  return (data ?? []) as unknown as Lead[];
}

export async function atualizarLead(
  db: ClienteSupabase,
  id: string,
  mudancas: AtualizacaoLead,
): Promise<Lead> {
  const { data, error } = await db
    .from(TABELA)
    .update(mudancas)
    .eq('id', id)
    .is('deletado_em', null)
    .select(COLUNAS)
    .single();

  if (error) traduzirErroSupabase('leadRepository.atualizarLead', error);
  return data as unknown as Lead;
}

/** Soft delete: preserva o historico_contatos do lead (spec 6.2). */
export async function removerLead(db: ClienteSupabase, id: string): Promise<void> {
  const { error } = await db
    .from(TABELA)
    .update({ deletado_em: new Date().toISOString() })
    .eq('id', id)
    .is('deletado_em', null);

  if (error) traduzirErroSupabase('leadRepository.removerLead', error);
}

/** Quais destes CNPJs ja estao no banco — usado para nao duplicar na importacao (spec 6.5b). */
export async function buscarCnpjsExistentes(db: ClienteSupabase, cnpjs: string[]): Promise<Set<string>> {
  if (cnpjs.length === 0) return new Set();

  const { data, error } = await db.from(TABELA).select('cnpj').in('cnpj', cnpjs).is('deletado_em', null);

  if (error) traduzirErroSupabase('leadRepository.buscarCnpjsExistentes', error);
  return new Set(((data ?? []) as Array<{ cnpj: string | null }>).flatMap((l) => (l.cnpj ? [l.cnpj] : [])));
}

export async function contarLeadsPorStatus(db: ClienteSupabase): Promise<Record<StatusLead, number>> {
  const { data, error } = await db.from(TABELA).select('status').is('deletado_em', null);

  if (error) traduzirErroSupabase('leadRepository.contarLeadsPorStatus', error);

  const contagem = {} as Record<StatusLead, number>;
  for (const linha of (data ?? []) as Array<{ status: StatusLead }>) {
    contagem[linha.status] = (contagem[linha.status] ?? 0) + 1;
  }
  return contagem;
}

export async function contarLeadsPorResponsavel(
  db: ClienteSupabase,
): Promise<Array<{ responsavel_id: string; responsavel_nome: string; total: number }>> {
  const { data, error } = await db
    .from(TABELA)
    .select('responsavel_id, responsavel:usuarios!leads_responsavel_id_fkey(nome)')
    .is('deletado_em', null);

  if (error) traduzirErroSupabase('leadRepository.contarLeadsPorResponsavel', error);

  const porMembro = new Map<string, { responsavel_id: string; responsavel_nome: string; total: number }>();

  for (const linha of (data ?? []) as unknown as LinhaComResponsavel[]) {
    const atual = porMembro.get(linha.responsavel_id);
    if (atual) {
      atual.total += 1;
    } else {
      porMembro.set(linha.responsavel_id, {
        responsavel_id: linha.responsavel_id,
        responsavel_nome: linha.responsavel?.nome ?? 'Sem responsável',
        total: 1,
      });
    }
  }

  return [...porMembro.values()].sort((a, b) => b.total - a.total);
}

/** O join do Supabase devolve um objeto aninhado; a UI so quer o nome. */
function achatarResponsavel(linha: LinhaComResponsavel): LeadComResponsavel {
  const { responsavel, ...resto } = linha;
  return { ...resto, responsavel_nome: responsavel?.nome ?? null };
}
