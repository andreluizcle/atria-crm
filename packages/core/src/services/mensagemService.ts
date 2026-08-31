import type { ClienteSupabase } from '../lib/supabaseAdmin';
import type { Lead } from '../types/lead';
import type { AtualizacaoMensagemPronta, MensagemPronta, NovaMensagemPronta } from '../types/mensagem';
import { ErroDeNegocio } from '../lib/erros';
import {
  atualizarMensagem as atualizarNoBanco,
  buscarMensagemPorId,
  criarMensagem as criarNoBanco,
  listarMensagens as listarNoBanco,
  listarMensagensPorPlataformas,
  removerMensagem as removerNoBanco,
} from '../repositories/mensagemRepository';
import { canaisDisponiveis } from '../validacao/leadValidacao';
import { contextoDoLead, interpolar, variaveisInvalidas } from '../validacao/interpolar';

export async function listarMensagens(
  db: ClienteSupabase,
  opcoes: { apenasAtivas?: boolean } = {},
): Promise<MensagemPronta[]> {
  return listarNoBanco(db, opcoes);
}

export async function obterMensagem(db: ClienteSupabase, id: string): Promise<MensagemPronta> {
  const mensagem = await buscarMensagemPorId(db, id);
  if (!mensagem) throw new ErroDeNegocio('Template não encontrado.');
  return mensagem;
}

/**
 * Templates que fazem sentido para este lead (spec 5.3.2).
 * Um lead sem Instagram nao deve ver template de Instagram no menu do bot.
 */
export async function listarMensagensParaLead(
  db: ClienteSupabase,
  lead: Lead,
): Promise<MensagemPronta[]> {
  return listarMensagensPorPlataformas(db, canaisDisponiveis(lead));
}

export async function criarMensagem(db: ClienteSupabase, nova: NovaMensagemPronta): Promise<MensagemPronta> {
  validarTemplate(nova);
  return criarNoBanco(db, nova);
}

export async function atualizarMensagem(
  db: ClienteSupabase,
  id: string,
  mudancas: AtualizacaoMensagemPronta,
): Promise<MensagemPronta> {
  const atual = await obterMensagem(db, id);
  validarTemplate({ ...atual, ...mudancas });

  return atualizarNoBanco(db, id, mudancas);
}

export async function removerMensagem(db: ClienteSupabase, id: string): Promise<void> {
  await obterMensagem(db, id);
  await removerNoBanco(db, id);
}

/** Preview do painel: mostra o template ja interpolado com um lead real (spec 6.3). */
export function previewDaMensagem(
  mensagem: Pick<MensagemPronta, 'conteudo' | 'assunto'>,
  lead: Lead,
  responsavelNome?: string | null,
): { assunto: string | null; conteudo: string } {
  const contexto = contextoDoLead(lead, responsavelNome);

  return {
    assunto: mensagem.assunto ? interpolar(mensagem.assunto, contexto) : null,
    conteudo: interpolar(mensagem.conteudo, contexto),
  };
}

/** Lead ficticio para preview quando ainda nao ha nenhum lead cadastrado. */
export const LEAD_DE_EXEMPLO: Lead = {
  id: '00000000-0000-0000-0000-000000000000',
  nome: 'Padaria do Bairro',
  telefone: '11912345678',
  email: 'contato@padariadobairro.com.br',
  site: 'https://padariadobairro.com.br',
  instagram: 'https://instagram.com/padariadobairro',
  linkedin: null,
  cnpj: null,
  origem_lead: 'indicacao',
  status: 'pendente',
  responsavel_id: '00000000-0000-0000-0000-000000000000',
  observacoes: null,
  criado_por: '00000000-0000-0000-0000-000000000000',
  criado_em: new Date().toISOString(),
  atualizado_em: new Date().toISOString(),
  deletado_em: null,
};

function validarTemplate(template: Partial<NovaMensagemPronta>): void {
  if (!template.titulo?.trim()) {
    throw new ErroDeNegocio('O template precisa de um título.', ['titulo']);
  }

  if (!template.conteudo?.trim()) {
    throw new ErroDeNegocio('O template precisa de um conteúdo.', ['conteudo']);
  }

  if (template.plataforma === 'email' && !template.assunto?.trim()) {
    throw new ErroDeNegocio('Template de e-mail precisa de um assunto.', ['assunto']);
  }

  const invalidas = [
    ...variaveisInvalidas(template.conteudo),
    ...(template.assunto ? variaveisInvalidas(template.assunto) : []),
  ];

  if (invalidas.length > 0) {
    throw new ErroDeNegocio(
      `Estas variáveis não existem: ${invalidas.map((v) => `{{${v}}}`).join(', ')}.`,
      ['conteudo'],
    );
  }
}
