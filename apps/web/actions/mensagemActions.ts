'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  atualizarMensagem,
  criarMensagem,
  removerMensagem,
  type NovaMensagemPronta,
  type Plataforma,
} from '@atria/core';
import { exigirUsuarioLogado } from '@/lib/sessao';
import { executarAction, texto, textoObrigatorio, type ResultadoAction } from './resultado';

/** CRUD dos templates de mensagem (spec 6.3). */

export async function criarMensagemAction(
  _anterior: unknown,
  formulario: FormData,
): Promise<ResultadoAction> {
  const resultado = await executarAction('mensagemActions.criar', async () => {
    const { db } = await exigirUsuarioLogado();

    await criarMensagem(db, camposDoFormulario(formulario));
    revalidatePath('/mensagens');
  });

  if (resultado.ok) redirect('/mensagens');
  return resultado;
}

export async function atualizarMensagemAction(
  id: string,
  _anterior: unknown,
  formulario: FormData,
): Promise<ResultadoAction> {
  const resultado = await executarAction('mensagemActions.atualizar', async () => {
    const { db } = await exigirUsuarioLogado();

    await atualizarMensagem(db, id, camposDoFormulario(formulario));
    revalidatePath('/mensagens');
  });

  if (resultado.ok) redirect('/mensagens');
  return resultado;
}

export async function removerMensagemAction(id: string): Promise<ResultadoAction> {
  return executarAction('mensagemActions.remover', async () => {
    const { db } = await exigirUsuarioLogado();

    await removerMensagem(db, id);
    revalidatePath('/mensagens');
  });
}

/** Desativar em vez de apagar preserva o historico que aponta para o template. */
export async function alternarAtivoAction(id: string, ativo: boolean): Promise<ResultadoAction> {
  return executarAction('mensagemActions.alternarAtivo', async () => {
    const { db } = await exigirUsuarioLogado();

    await atualizarMensagem(db, id, { ativo });
    revalidatePath('/mensagens');
  });
}

function camposDoFormulario(formulario: FormData): NovaMensagemPronta {
  return {
    titulo: textoObrigatorio(formulario, 'titulo'),
    plataforma: textoObrigatorio(formulario, 'plataforma') as Plataforma,
    assunto: texto(formulario, 'assunto'),
    conteudo: textoObrigatorio(formulario, 'conteudo'),
    ativo: formulario.get('ativo') === 'on',
  };
}
