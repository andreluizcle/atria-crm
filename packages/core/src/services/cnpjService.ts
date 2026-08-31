import type { ClienteSupabase } from '../lib/supabaseAdmin';
import type { EmpresaCnpj, FiltroBuscaEmpresas, ResultadoBuscaEmpresas } from '../types/cnpj';
import type { Lead, NovoLead } from '../types/lead';
import { ErroDeNegocio } from '../lib/erros';
import { consultarCnpjNaBrasilApi } from '../lib/brasilApiClient';
import { pesquisarEmpresas as pesquisarNaCasaDosDados } from '../lib/casaDosDadosClient';
import { buscarCnpjsExistentes, criarLeadsEmLote } from '../repositories/leadRepository';
import { limparCnpj } from '../validacao/cnpj';
import { normalizarCamposDoLead } from '../validacao/leadValidacao';

/**
 * Duas funcionalidades distintas (spec 6.5), com custos bem diferentes:
 *
 *   a) `consultarCnpj`     — BrasilAPI, gratuita, um CNPJ por vez.
 *   b) `buscarEmpresas`    — Casa dos Dados, PAGA por consulta, varias empresas.
 *
 * Nao troque uma pela outra sem pensar: (b) gasta saldo real da EJ.
 */

/** (a) Consulta pontual de um CNPJ conhecido. Gratuita. */
export async function consultarCnpj(cnpj: string): Promise<EmpresaCnpj> {
  return consultarCnpjNaBrasilApi(cnpj);
}

/** (b) Busca avancada por regiao/setor. PAGA — cada chamada consome saldo. */
export async function buscarEmpresas(filtro: FiltroBuscaEmpresas): Promise<ResultadoBuscaEmpresas> {
  return pesquisarNaCasaDosDados(filtro);
}

export interface ResultadoImportacao {
  importados: Lead[];
  /** CNPJs que ja existiam no banco e foram pulados. */
  duplicados: string[];
  /** Empresas sem nenhum canal de contato — nao passam na regra da secao 4. */
  semContato: string[];
}

/**
 * Importa empresas selecionadas como novos leads (spec 6.5b).
 *
 * Tres cuidados:
 *   1. Nao duplicar CNPJ ja cadastrado.
 *   2. Pular empresa sem telefone nem e-mail — ela violaria `contato_obrigatorio`
 *      e derrubaria o lote inteiro.
 *   3. Marcar origem_lead = 'busca_cnpj', para o funil saber de onde veio.
 */
export async function importarEmpresasComoLeads(
  db: ClienteSupabase,
  params: {
    empresas: EmpresaCnpj[];
    responsavelId: string;
    criadoPor: string;
  },
): Promise<ResultadoImportacao> {
  if (params.empresas.length === 0) {
    throw new ErroDeNegocio('Selecione pelo menos uma empresa para importar.');
  }

  const cnpjs = params.empresas.map((e) => limparCnpj(e.cnpj)).filter((c) => c.length === 14);
  const jaExistem = await buscarCnpjsExistentes(db, cnpjs);

  const duplicados: string[] = [];
  const semContato: string[] = [];
  const paraInserir: NovoLead[] = [];

  for (const empresa of params.empresas) {
    const cnpj = limparCnpj(empresa.cnpj);

    if (jaExistem.has(cnpj)) {
      duplicados.push(cnpj);
      continue;
    }

    if (!empresa.telefone && !empresa.email) {
      semContato.push(empresa.razao_social);
      continue;
    }

    paraInserir.push(
      normalizarCamposDoLead({
        nome: empresa.nome_fantasia || empresa.razao_social,
        telefone: empresa.telefone,
        email: empresa.email,
        cnpj,
        origem_lead: 'busca_cnpj',
        status: 'pendente',
        responsavel_id: params.responsavelId,
        criado_por: params.criadoPor,
        observacoes: montarObservacoes(empresa),
      }) as NovoLead,
    );
  }

  const importados = await criarLeadsEmLote(db, paraInserir);

  return { importados, duplicados, semContato };
}

/** Guarda o contexto da Receita como texto livre, para o membro ter na mao ao ligar. */
function montarObservacoes(empresa: EmpresaCnpj): string {
  const linhas = [
    `Importado da busca por CNPJ.`,
    `Razão social: ${empresa.razao_social}`,
    empresa.cnae_descricao ? `Atividade: ${empresa.cnae_descricao}` : null,
    empresa.porte ? `Porte: ${empresa.porte}` : null,
    empresa.situacao_cadastral ? `Situação: ${empresa.situacao_cadastral}` : null,
    empresa.municipio && empresa.uf ? `Local: ${empresa.municipio}/${empresa.uf}` : null,
    empresa.data_abertura ? `Abertura: ${empresa.data_abertura}` : null,
  ];

  return linhas.filter(Boolean).join('\n');
}
