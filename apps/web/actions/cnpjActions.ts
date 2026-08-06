'use server';

import { revalidatePath } from 'next/cache';
import {
  buscarEmpresas,
  consultarCnpj,
  importarEmpresasComoLeads,
  mensagemParaUsuario,
  registrarErro,
  type EmpresaCnpj,
  type FiltroBuscaEmpresas,
  type ResultadoBuscaEmpresas,
} from '@atria/core';
import { exigirUsuarioLogado } from '@/lib/sessao';
import { executarAction, type ResultadoAction } from './resultado';

/**
 * Consulta e enriquecimento por CNPJ (spec 6.5).
 *
 * Lembrete de custo: `consultarCnpjAction` e gratuita (BrasilAPI);
 * `buscarEmpresasAction` gasta saldo pago da Casa dos Dados a cada chamada.
 */

export type ResultadoConsulta = { ok: true; empresa: EmpresaCnpj } | { ok: false; erro: string };

export async function consultarCnpjAction(cnpj: string): Promise<ResultadoConsulta> {
  try {
    await exigirUsuarioLogado();
    return { ok: true, empresa: await consultarCnpj(cnpj) };
  } catch (erro) {
    registrarErro('cnpjActions.consultar', erro);
    return { ok: false, erro: mensagemParaUsuario(erro) };
  }
}

export type ResultadoBusca = { ok: true; dados: ResultadoBuscaEmpresas } | { ok: false; erro: string };

export async function buscarEmpresasAction(filtro: FiltroBuscaEmpresas): Promise<ResultadoBusca> {
  try {
    await exigirUsuarioLogado();
    return { ok: true, dados: await buscarEmpresas(filtro) };
  } catch (erro) {
    registrarErro('cnpjActions.buscarEmpresas', erro);
    return { ok: false, erro: mensagemParaUsuario(erro) };
  }
}

/** Importa as empresas selecionadas como leads, sem duplicar CNPJ (spec 6.5b). */
export async function importarEmpresasAction(
  empresas: EmpresaCnpj[],
  responsavelId: string,
): Promise<ResultadoAction> {
  return executarAction('cnpjActions.importar', async () => {
    const { db, usuario } = await exigirUsuarioLogado();

    const resultado = await importarEmpresasComoLeads(db, {
      empresas,
      responsavelId: responsavelId || usuario.id,
      criadoPor: usuario.id,
    });

    revalidatePath('/leads');
    revalidatePath('/dashboard');

    const partes = [`${resultado.importados.length} lead(s) importado(s).`];
    if (resultado.duplicados.length > 0) {
      partes.push(`${resultado.duplicados.length} já existia(m) e foi(ram) pulado(s).`);
    }
    if (resultado.semContato.length > 0) {
      partes.push(`${resultado.semContato.length} sem telefone nem e-mail, não pôde(ram) entrar.`);
    }

    return { ok: true as const, mensagem: partes.join(' ') };
  });
}
