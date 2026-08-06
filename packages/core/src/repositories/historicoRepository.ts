import type { ClienteSupabase } from '../lib/supabaseAdmin';
import type { HistoricoComDetalhes, HistoricoContato, NovoHistoricoContato } from '../types/historico';
import { traduzirErroSupabase } from '../lib/erroSupabase';

/** Tabela append-only: so INSERT e SELECT, por design (ver 0002_rls.sql). */

const TABELA = 'historico_contatos';
const COLUNAS_DETALHADAS = '*, usuario:usuarios(nome), mensagem:mensagens_prontas(titulo)';

interface LinhaDetalhada extends HistoricoContato {
  usuario?: { nome: string } | null;
  mensagem?: { titulo: string } | null;
}

export async function registrarContato(
  db: ClienteSupabase,
  novo: NovoHistoricoContato,
): Promise<HistoricoContato> {
  const { data, error } = await db.from(TABELA).insert(novo).select('*').single();

  if (error) traduzirErroSupabase('historicoRepository.registrarContato', error);
  return data as HistoricoContato;
}

export async function listarHistoricoDoLead(
  db: ClienteSupabase,
  leadId: string,
  limite = 50,
): Promise<HistoricoComDetalhes[]> {
  const { data, error } = await db
    .from(TABELA)
    .select(COLUNAS_DETALHADAS)
    .eq('lead_id', leadId)
    .order('enviado_em', { ascending: false })
    .limit(limite);

  if (error) traduzirErroSupabase('historicoRepository.listarHistoricoDoLead', error);
  return ((data ?? []) as unknown as LinhaDetalhada[]).map(achatar);
}

/**
 * Ultimo disparo por lead+template. O bot usa para avisar "você já mandou essa
 * mensagem para este lead há X dias" e evitar follow-up repetido (spec 4).
 */
export async function buscarUltimoContato(
  db: ClienteSupabase,
  leadId: string,
  mensagemId: string,
): Promise<HistoricoContato | null> {
  const { data, error } = await db
    .from(TABELA)
    .select('*')
    .eq('lead_id', leadId)
    .eq('mensagem_id', mensagemId)
    .order('enviado_em', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) traduzirErroSupabase('historicoRepository.buscarUltimoContato', error);
  return (data as HistoricoContato | null) ?? null;
}

function achatar(linha: LinhaDetalhada): HistoricoComDetalhes {
  const { usuario, mensagem, ...resto } = linha;
  return {
    ...resto,
    usuario_nome: usuario?.nome ?? null,
    mensagem_titulo: mensagem?.titulo ?? null,
  };
}
