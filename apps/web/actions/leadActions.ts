'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  atualizarLead,
  criarLead,
  removerLead,
  type AtualizacaoLead,
  type NovoLead,
  type OrigemLead,
  type StatusLead,
} from '@atria/core';
import { exigirUsuarioLogado } from '@/lib/sessao';
import { executarAction, texto, textoObrigatorio, type ResultadoAction } from './resultado';

/**
 * CRUD de leads.
 *
 * A validacao roda no leadService (packages/core), o mesmo que o bot usa —
 * o front nao e a fonte da verdade (spec 4). O `required` do HTML e conveniencia
 * de UX, nao garantia.
 *
 * ATENCAO: `redirect()` sinaliza o desvio lancando uma excecao interna do Next.
 * Por isso ele fica SEMPRE fora do executarAction — chamado la dentro, viraria
 * "algo deu errado" e o usuario nunca sairia da tela.
 */

export async function criarLeadAction(_anterior: unknown, formulario: FormData): Promise<ResultadoAction> {
  const resultado = await executarAction('leadActions.criar', async () => {
    const { db, usuario } = await exigirUsuarioLogado();

    await criarLead(db, {
      ...camposDoFormulario(formulario),
      criado_por: usuario.id,
    } as NovoLead);

    revalidatePath('/leads');
    revalidatePath('/dashboard');
  });

  if (resultado.ok) redirect('/leads');
  return resultado;
}

export async function atualizarLeadAction(
  id: string,
  _anterior: unknown,
  formulario: FormData,
): Promise<ResultadoAction> {
  const resultado = await executarAction('leadActions.atualizar', async () => {
    const { db } = await exigirUsuarioLogado();

    await atualizarLead(db, id, camposDoFormulario(formulario) as AtualizacaoLead);

    revalidatePath('/leads');
    revalidatePath(`/leads/${id}`);
    revalidatePath('/dashboard');
  });

  if (resultado.ok) redirect(`/leads/${id}`);
  return resultado;
}

/** Soft delete: o historico de contatos do lead continua no banco. */
export async function removerLeadAction(id: string): Promise<ResultadoAction> {
  const resultado = await executarAction('leadActions.remover', async () => {
    const { db } = await exigirUsuarioLogado();

    await removerLead(db, id);

    revalidatePath('/leads');
    revalidatePath('/dashboard');
  });

  if (resultado.ok) redirect('/leads');
  return resultado;
}

/** Atalho da lista e da ficha: mudar status sem abrir a tela de edicao. */
export async function mudarStatusAction(id: string, status: StatusLead): Promise<ResultadoAction> {
  return executarAction('leadActions.mudarStatus', async () => {
    const { db } = await exigirUsuarioLogado();

    await atualizarLead(db, id, { status });

    revalidatePath('/leads');
    revalidatePath(`/leads/${id}`);
    revalidatePath('/dashboard');
  });
}

function camposDoFormulario(formulario: FormData) {
  return {
    nome: textoObrigatorio(formulario, 'nome'),
    telefone: texto(formulario, 'telefone'),
    email: texto(formulario, 'email'),
    site: texto(formulario, 'site'),
    instagram: texto(formulario, 'instagram'),
    linkedin: texto(formulario, 'linkedin'),
    cnpj: texto(formulario, 'cnpj'),
    origem_lead: textoObrigatorio(formulario, 'origem_lead') as OrigemLead,
    status: textoObrigatorio(formulario, 'status') as StatusLead,
    responsavel_id: textoObrigatorio(formulario, 'responsavel_id'),
    observacoes: texto(formulario, 'observacoes'),
  };
}
