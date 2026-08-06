'use server';

import { revalidatePath } from 'next/cache';
import {
  enviarEmailParaLead,
  mensagemParaUsuario,
  obterLead,
  obterMensagem,
  prepararDisparo,
  registrarDisparoManual,
  registrarErro,
  type DisparoPreparado,
} from '@atria/core';
import { exigirUsuarioLogado } from '@/lib/sessao';
import { executarAction, type ResultadoAction } from './resultado';

/**
 * Contato rapido a partir da ficha do lead (spec 6.4).
 *
 * Mesma logica do bot, porque as duas chamam o envioService. O que muda e so
 * como o resultado e apresentado: aqui vira link/clipboard no navegador.
 */

export type ResultadoPreparo =
  | { ok: true; disparo: DisparoPreparado }
  | { ok: false; erro: string };

/** Monta o texto interpolado e ja registra o disparo manual no historico. */
export async function prepararDisparoAction(
  leadId: string,
  mensagemId: string,
): Promise<ResultadoPreparo> {
  try {
    const { db, usuario } = await exigirUsuarioLogado();

    const lead = await obterLead(db, leadId);
    const mensagem = await obterMensagem(db, mensagemId);
    const disparo = await prepararDisparo(db, lead, mensagem, lead.responsavel_nome);

    // E-mail nao passa por aqui: tem action propria, com envio de verdade.
    if (disparo.acao === 'envio_automatico') {
      return { ok: false, erro: 'Use o botão de enviar e-mail para esse template.' };
    }

    await registrarDisparoManual(db, {
      lead,
      mensagem,
      usuarioId: usuario.id,
      disparo,
      origem: 'web',
    });

    revalidatePath(`/leads/${leadId}`);
    return { ok: true, disparo };
  } catch (erro) {
    registrarErro('envioActions.prepararDisparo', erro);
    return { ok: false, erro: mensagemParaUsuario(erro) };
  }
}

/**
 * Envio automatico real de e-mail, com um clique (spec 6.4).
 * Sem `mailto:`, sem abrir cliente de e-mail — sai pelo provedor transacional.
 */
export async function enviarEmailAction(leadId: string, mensagemId: string): Promise<ResultadoAction> {
  return executarAction('envioActions.enviarEmail', async () => {
    const { db, usuario } = await exigirUsuarioLogado();

    const lead = await obterLead(db, leadId);
    const mensagem = await obterMensagem(db, mensagemId);

    const resultado = await enviarEmailParaLead(db, {
      lead,
      mensagem,
      usuarioId: usuario.id,
      origem: 'web',
      responsavelNome: lead.responsavel_nome,
    });

    revalidatePath(`/leads/${leadId}`);

    return resultado.sucesso
      ? { ok: true as const, mensagem: resultado.mensagem }
      : { ok: false as const, erro: resultado.mensagem };
  });
}
