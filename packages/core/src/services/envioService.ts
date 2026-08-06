import type { ClienteSupabase } from '../lib/supabaseAdmin';
import type { Lead } from '../types/lead';
import type { MensagemPronta } from '../types/mensagem';
import type { OrigemDisparo, Plataforma } from '../types/enums';
import { ErroDeNegocio, mensagemParaUsuario, registrarErro } from '../lib/erros';
import { obterProvedorDeEmail } from '../lib/emailProvider';
import { registrarContato } from '../repositories/historicoRepository';
import { buscarUsuarioPorId } from '../repositories/usuarioRepository';
import { contextoDoLead, interpolar } from '../validacao/interpolar';
import { paraFormatoWhatsApp } from '../validacao/telefone';

/**
 * Disparo de mensagens prontas — o mesmo comportamento no bot e no painel.
 *
 * A spec (secao 7) separa os canais em dois grupos e essa distincao esta em
 * `acao` abaixo:
 *
 *   - WhatsApp / Instagram / LinkedIn -> o sistema PREPARA o texto e abre o link.
 *     O clique de enviar e sempre humano. Nao existe API legitima de cold DM nessas
 *     plataformas e simular o app viola os termos de uso.
 *   - E-mail -> envio automatico real, com um clique, via provedor transacional.
 *     E a excecao deliberada da spec, por ser o canal de menor risco.
 */

export type AcaoDeDisparo =
  /** Abrir a URL: o texto ja vai junto (so o wa.me permite isso). */
  | 'abrir_link'
  /** Copiar o texto e abrir o perfil: Instagram e LinkedIn nao aceitam pre-preenchimento. */
  | 'copiar_e_abrir'
  /** Sai de verdade pelo provedor transacional, sem intervencao humana. */
  | 'envio_automatico';

export interface DisparoPreparado {
  plataforma: Plataforma;
  acao: AcaoDeDisparo;
  assunto: string | null;
  conteudo: string;
  /** wa.me com texto, ou URL do perfil no Instagram/LinkedIn. Null para e-mail. */
  url: string | null;
  /** Frase curta explicando ao membro o que fazer agora. */
  instrucao: string;
}

/**
 * Interpola o template e monta o que o membro precisa para agir.
 * NAO grava historico e NAO envia nada — so prepara.
 */
export async function prepararDisparo(
  db: ClienteSupabase,
  lead: Lead,
  mensagem: MensagemPronta,
  responsavelNome?: string | null,
): Promise<DisparoPreparado> {
  const nome = responsavelNome ?? (await nomeDoResponsavel(db, lead.responsavel_id));
  const contexto = contextoDoLead(lead, nome);

  const conteudo = interpolar(mensagem.conteudo, contexto);
  const assunto = mensagem.assunto ? interpolar(mensagem.assunto, contexto) : null;

  switch (mensagem.plataforma) {
    case 'whatsapp': {
      if (!lead.telefone) {
        throw new ErroDeNegocio('Este lead não tem telefone cadastrado.', ['telefone']);
      }
      // Link oficial do WhatsApp. Nada de biblioteca nao-oficial que simula o
      // WhatsApp Web (spec 7).
      //
      // FUTURO: para campanhas em maior escala, a integracao com a WhatsApp
      // Business API oficial (templates aprovados pela Meta) entraria aqui,
      // substituindo o link por uma chamada ao endpoint /messages da Cloud API.
      // Isso e uma decisao separada — nao faz parte do MVP.
      return {
        plataforma: 'whatsapp',
        acao: 'abrir_link',
        assunto: null,
        conteudo,
        url: `https://wa.me/${paraFormatoWhatsApp(lead.telefone)}?text=${encodeURIComponent(conteudo)}`,
        instrucao: 'O WhatsApp vai abrir com a mensagem já escrita. É só revisar e enviar.',
      };
    }

    case 'instagram': {
      if (!lead.instagram) {
        throw new ErroDeNegocio('Este lead não tem Instagram cadastrado.', ['instagram']);
      }
      return {
        plataforma: 'instagram',
        acao: 'copiar_e_abrir',
        assunto: null,
        conteudo,
        url: lead.instagram,
        instrucao: 'Copie a mensagem acima e cole na conversa que vai abrir no Instagram.',
      };
    }

    case 'linkedin': {
      if (!lead.linkedin) {
        throw new ErroDeNegocio('Este lead não tem LinkedIn cadastrado.', ['linkedin']);
      }
      return {
        plataforma: 'linkedin',
        acao: 'copiar_e_abrir',
        assunto: null,
        conteudo,
        url: lead.linkedin,
        instrucao: 'Copie a mensagem acima e cole na conversa que vai abrir no LinkedIn.',
      };
    }

    case 'email': {
      if (!lead.email) {
        throw new ErroDeNegocio('Este lead não tem e-mail cadastrado.', ['email']);
      }
      if (!assunto) {
        throw new ErroDeNegocio('Este template de e-mail está sem assunto.', ['assunto']);
      }
      return {
        plataforma: 'email',
        acao: 'envio_automatico',
        assunto,
        conteudo,
        url: null,
        instrucao: `O e-mail será enviado de verdade para ${lead.email} assim que você confirmar.`,
      };
    }
  }
}

/**
 * Registra que a mensagem foi entregue ao membro para envio manual
 * (WhatsApp, Instagram, LinkedIn). Status fica `preparado`, nunca `enviado` —
 * o sistema nao tem como saber se o humano clicou em enviar.
 */
export async function registrarDisparoManual(
  db: ClienteSupabase,
  params: {
    lead: Lead;
    mensagem: MensagemPronta;
    usuarioId: string;
    disparo: DisparoPreparado;
    origem: OrigemDisparo;
  },
): Promise<void> {
  await registrarContato(db, {
    lead_id: params.lead.id,
    mensagem_id: params.mensagem.id,
    plataforma: params.disparo.plataforma,
    usuario_id: params.usuarioId,
    status_envio: 'preparado',
    conteudo_enviado: params.disparo.conteudo,
    origem: params.origem,
  });
}

export interface ResultadoEnvioEmail {
  sucesso: boolean;
  mensagem: string;
}

/**
 * Envio automatico real de e-mail (spec 5.3 e 6.4).
 *
 * Grava no historico nos dois desfechos: `enviado` com o id do provedor, ou
 * `falhou` com o motivo. Um envio que falha e some do historico e pior do que
 * nao ter historico nenhum.
 */
export async function enviarEmailParaLead(
  db: ClienteSupabase,
  params: {
    lead: Lead;
    mensagem: MensagemPronta;
    usuarioId: string;
    origem: OrigemDisparo;
    responsavelNome?: string | null;
  },
): Promise<ResultadoEnvioEmail> {
  const disparo = await prepararDisparo(db, params.lead, params.mensagem, params.responsavelNome);

  if (disparo.acao !== 'envio_automatico' || !params.lead.email || !disparo.assunto) {
    throw new ErroDeNegocio('Este template não é de e-mail.');
  }

  const remetenteResponde = await emailDoUsuario(db, params.usuarioId);

  try {
    await obterProvedorDeEmail().enviar({
      para: params.lead.email,
      assunto: disparo.assunto,
      conteudo: disparo.conteudo,
      // Resposta do cliente cai na caixa de quem disparou, nao num endereco generico.
      ...(remetenteResponde ? { responderPara: remetenteResponde } : {}),
    });

    await registrarContato(db, {
      lead_id: params.lead.id,
      mensagem_id: params.mensagem.id,
      plataforma: 'email',
      usuario_id: params.usuarioId,
      status_envio: 'enviado',
      conteudo_enviado: disparo.conteudo,
      origem: params.origem,
    });

    return { sucesso: true, mensagem: `E-mail enviado para ${params.lead.email}.` };
  } catch (erro) {
    registrarErro('envioService.enviarEmailParaLead', erro);

    await registrarContato(db, {
      lead_id: params.lead.id,
      mensagem_id: params.mensagem.id,
      plataforma: 'email',
      usuario_id: params.usuarioId,
      status_envio: 'falhou',
      conteudo_enviado: disparo.conteudo,
      erro: erro instanceof Error ? erro.message : String(erro),
      origem: params.origem,
    }).catch((falhaAoRegistrar) => {
      // O envio ja falhou; nao deixar o log do historico esconder o erro original.
      registrarErro('envioService.registrarFalha', falhaAoRegistrar);
    });

    return { sucesso: false, mensagem: mensagemParaUsuario(erro) };
  }
}

async function nomeDoResponsavel(db: ClienteSupabase, usuarioId: string): Promise<string | null> {
  const usuario = await buscarUsuarioPorId(db, usuarioId);
  return usuario?.nome ?? null;
}

async function emailDoUsuario(db: ClienteSupabase, usuarioId: string): Promise<string | null> {
  const usuario = await buscarUsuarioPorId(db, usuarioId);
  return usuario?.email ?? null;
}
