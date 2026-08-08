import type { EmpresaCnpj } from '../types/cnpj';
import { ErroDeIntegracao, ErroDeNegocio } from './erros';
import { cabecalhosPadrao } from './http';
import { limparCnpj, validarCnpj } from '../validacao/cnpj';

/**
 * Consulta unitaria de CNPJ pela BrasilAPI (gratuita, sem chave).
 * Spec 6.5a. Para busca de varias empresas por regiao/setor, veja casaDosDadosClient.
 *
 * Docs: https://brasilapi.com.br/docs#tag/CNPJ
 */

const BASE_URL = 'https://brasilapi.com.br/api/cnpj/v1';
const TIMEOUT_MS = 10_000;

interface RespostaBrasilApi {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  descricao_situacao_cadastral?: string;
  cnae_fiscal?: number;
  cnae_fiscal_descricao?: string;
  porte?: string;
  ddd_telefone_1?: string;
  email?: string;
  municipio?: string;
  uf?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cep?: string;
  data_inicio_atividade?: string;
}

export async function consultarCnpjNaBrasilApi(cnpjEntrada: string): Promise<EmpresaCnpj> {
  const cnpj = limparCnpj(cnpjEntrada);

  if (!validarCnpj(cnpj)) {
    throw new ErroDeNegocio('CNPJ inválido. Confira os 14 dígitos e tente de novo.', ['cnpj']);
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${BASE_URL}/${cnpj}`, {
      headers: cabecalhosPadrao(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (causa) {
    throw new ErroDeIntegracao('a BrasilAPI', 'A consulta demorou demais ou a rede falhou.', { causa });
  }

  if (resposta.status === 404) {
    throw new ErroDeNegocio('CNPJ não encontrado na base da Receita Federal.', ['cnpj']);
  }

  // O Cloudflare da BrasilAPI bloqueia por User-Agent, nao por CNPJ. Se isso
  // voltar a acontecer, o suspeito e `cabecalhosPadrao()` — nao o dado enviado.
  if (resposta.status === 403) {
    throw new ErroDeIntegracao('a BrasilAPI', 'A consulta foi bloqueada (403). Confira o User-Agent enviado.', {
      status: 403,
    });
  }

  if (resposta.status === 429) {
    throw new ErroDeIntegracao('a BrasilAPI', 'Muitas consultas seguidas. Espere um minuto e tente de novo.', {
      status: 429,
    });
  }

  if (!resposta.ok) {
    throw new ErroDeIntegracao('a BrasilAPI', `Resposta inesperada (HTTP ${resposta.status}).`, {
      status: resposta.status,
    });
  }

  const dados = (await resposta.json()) as RespostaBrasilApi;
  return normalizar(cnpj, dados);
}

function normalizar(cnpj: string, dados: RespostaBrasilApi): EmpresaCnpj {
  const logradouro = [dados.logradouro, dados.numero].filter(Boolean).join(', ');

  return {
    cnpj,
    razao_social: dados.razao_social ?? 'Razão social não informada',
    nome_fantasia: dados.nome_fantasia || null,
    situacao_cadastral: dados.descricao_situacao_cadastral ?? null,
    cnae_principal: dados.cnae_fiscal ? String(dados.cnae_fiscal) : null,
    cnae_descricao: dados.cnae_fiscal_descricao ?? null,
    porte: dados.porte ?? null,
    telefone: dados.ddd_telefone_1 || null,
    email: dados.email || null,
    municipio: dados.municipio ?? null,
    uf: dados.uf ?? null,
    logradouro: logradouro || null,
    bairro: dados.bairro ?? null,
    cep: dados.cep ?? null,
    data_abertura: dados.data_inicio_atividade ?? null,
  };
}
