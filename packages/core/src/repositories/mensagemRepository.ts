import type { ClienteSupabase } from '../lib/supabaseAdmin';
import type { AtualizacaoMensagemPronta, MensagemPronta, NovaMensagemPronta } from '../types/mensagem';
import type { Plataforma } from '../types/enums';
import { traduzirErroSupabase } from '../lib/erroSupabase';

const TABELA = 'mensagens_prontas';

export async function listarMensagens(
  db: ClienteSupabase,
  opcoes: { apenasAtivas?: boolean } = {},
): Promise<MensagemPronta[]> {
  let consulta = db.from(TABELA).select('*');
  if (opcoes.apenasAtivas) consulta = consulta.eq('ativo', true);

  const { data, error } = await consulta.order('plataforma').order('titulo');

  if (error) traduzirErroSupabase('mensagemRepository.listarMensagens', error);
  return (data ?? []) as MensagemPronta[];
}

/**
 * Templates dos canais que o lead realmente tem (spec 5.3.2).
 * Se o lead nao tem Instagram, nao faz sentido oferecer template de Instagram.
 */
export async function listarMensagensPorPlataformas(
  db: ClienteSupabase,
  plataformas: Plataforma[],
): Promise<MensagemPronta[]> {
  if (plataformas.length === 0) return [];

  const { data, error } = await db
    .from(TABELA)
    .select('*')
    .eq('ativo', true)
    .in('plataforma', plataformas)
    .order('plataforma')
    .order('titulo');

  if (error) traduzirErroSupabase('mensagemRepository.listarMensagensPorPlataformas', error);
  return (data ?? []) as MensagemPronta[];
}

export async function buscarMensagemPorId(db: ClienteSupabase, id: string): Promise<MensagemPronta | null> {
  const { data, error } = await db.from(TABELA).select('*').eq('id', id).maybeSingle();

  if (error) traduzirErroSupabase('mensagemRepository.buscarMensagemPorId', error);
  return (data as MensagemPronta | null) ?? null;
}

export async function criarMensagem(db: ClienteSupabase, nova: NovaMensagemPronta): Promise<MensagemPronta> {
  const { data, error } = await db.from(TABELA).insert(nova).select('*').single();

  if (error) traduzirErroSupabase('mensagemRepository.criarMensagem', error);
  return data as MensagemPronta;
}

export async function atualizarMensagem(
  db: ClienteSupabase,
  id: string,
  mudancas: AtualizacaoMensagemPronta,
): Promise<MensagemPronta> {
  const { data, error } = await db.from(TABELA).update(mudancas).eq('id', id).select('*').single();

  if (error) traduzirErroSupabase('mensagemRepository.atualizarMensagem', error);
  return data as MensagemPronta;
}

export async function removerMensagem(db: ClienteSupabase, id: string): Promise<void> {
  const { error } = await db.from(TABELA).delete().eq('id', id);

  if (error) traduzirErroSupabase('mensagemRepository.removerMensagem', error);
}
