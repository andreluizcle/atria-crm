import type { EmpresaCnpj, FiltroBuscaEmpresas, ResultadoBuscaEmpresas } from '../types/cnpj';
import { envOpcional } from './env';
import { ErroDeIntegracao, ErroDeNegocio } from './erros';
import { cabecalhosPadrao } from './http';

/**
 * Busca avancada de empresas por regiao/setor — API oficial da Casa dos Dados (spec 6.5b).
 *
 * ATENCAO: e uma API PAGA, cobrada por consulta. Cada chamada aqui gasta saldo da EJ.
 * Docs: https://docs.casadosdados.com.br/pesquisa-avancada-de-empresas-16579062e0
 *
 * A chave e opcional de proposito: sem CASA_DOS_DADOS_API_KEY o resto do sistema
 * funciona normalmente e a tela de busca mostra um aviso. Ver `casaDosDadosConfigurada()`.
 */

const URL_PESQUISA = 'https://api.casadosdados.com.br/v5/cnpj/pesquisa';
const TIMEOUT_MS = 20_000;
const LIMITE_POR_PAGINA = 20;

interface CorpoPesquisa {
  uf?: string[];
  municipio?: string[];
  codigo_atividade_principal?: string[];
  situacao_cadastral?: string[];
  porte_empresa?: { codigos: string[] };
  mais_filtros?: { com_email?: boolean; com_telefone?: boolean };
  limite: number;
  pagina: number;
}

/** A resposta traz muito mais campos; declaramos so o que usamos. */
interface EmpresaBruta {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string | null;
  situacao_cadastral?: { situacao_cadastral?: string } | string | null;
  atividade_principal?: { codigo?: string; descricao?: string } | null;
  porte_empresa?: { descricao?: string } | null;
  email?: string | null;
  telefone?: string | null;
  contato_telefonico?: Array<{ ddd?: string; numero?: string }> | null;
  data_abertura?: string | null;
  endereco?: {
    cep?: string | null;
    tipo_logradouro?: string | null;
    logradouro?: string | null;
    numero?: string | null;
    bairro?: string | null;
    uf?: string | null;
    municipio?: string | null;
  } | null;
}

interface RespostaPesquisa {
  total?: number;
  cnpjs?: EmpresaBruta[];
}

export async function pesquisarEmpresas(filtro: FiltroBuscaEmpresas): Promise<ResultadoBuscaEmpresas> {
  const apiKey = envOpcional('CASA_DOS_DADOS_API_KEY');
  if (!apiKey) {
    throw new ErroDeNegocio(
      'A busca por região/setor não está configurada. Defina CASA_DOS_DADOS_API_KEY para habilitá-la.',
    );
  }

  const pagina = Math.max(1, filtro.pagina ?? 1);
  const corpo = montarCorpo(filtro, pagina);

  let resposta: Response;
  try {
    resposta = await fetch(`${URL_PESQUISA}?tipo_resultado=completo`, {
      method: 'POST',
      headers: cabecalhosPadrao({
        'api-key': apiKey,
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (causa) {
    throw new ErroDeIntegracao('a Casa dos Dados', 'A consulta demorou demais ou a rede falhou.', { causa });
  }

  await validarResposta(resposta);

  const dados = (await resposta.json()) as RespostaPesquisa;
  return {
    empresas: (dados.cnpjs ?? []).map(normalizar),
    total: dados.total ?? 0,
    pagina,
  };
}

function montarCorpo(filtro: FiltroBuscaEmpresas, pagina: number): CorpoPesquisa {
  const corpo: CorpoPesquisa = {
    limite: LIMITE_POR_PAGINA,
    pagina,
  };

  if (filtro.uf) corpo.uf = [filtro.uf.toLowerCase()];
  if (filtro.municipio) corpo.municipio = [filtro.municipio.toLowerCase()];
  if (filtro.cnaes?.length) corpo.codigo_atividade_principal = filtro.cnaes;
  if (filtro.porte?.length) corpo.porte_empresa = { codigos: filtro.porte };

  // Padrao: so empresas ativas. Prospectar empresa baixada e desperdicio de saldo.
  if (filtro.somenteAtivas !== false) corpo.situacao_cadastral = ['ATIVA'];

  if (filtro.comEmail || filtro.comTelefone) {
    corpo.mais_filtros = {
      ...(filtro.comEmail ? { com_email: true } : {}),
      ...(filtro.comTelefone ? { com_telefone: true } : {}),
    };
  }

  return corpo;
}

/** Traduz os erros da API para mensagens que o membro da EJ entende (spec 6.5). */
async function validarResposta(resposta: Response): Promise<void> {
  if (resposta.ok) return;

  const detalhe = await resposta.text().catch(() => '');

  if (resposta.status === 401) {
    throw new ErroDeIntegracao('a Casa dos Dados', 'A chave de API foi recusada. Confira CASA_DOS_DADOS_API_KEY.', {
      status: 401,
    });
  }

  if (resposta.status === 403) {
    throw new ErroDeNegocio(
      'Saldo insuficiente na Casa dos Dados. Recarregue os créditos da conta da EJ para continuar buscando.',
    );
  }

  if (resposta.status === 429) {
    throw new ErroDeNegocio('Muitas buscas seguidas na Casa dos Dados. Espere um pouco e tente de novo.');
  }

  if (resposta.status === 400) {
    throw new ErroDeNegocio('Algum filtro da busca está inválido. Revise UF, município e CNAE.');
  }

  throw new ErroDeIntegracao('a Casa dos Dados', `Resposta inesperada (HTTP ${resposta.status}). ${detalhe}`.trim(), {
    status: resposta.status,
  });
}

function normalizar(bruta: EmpresaBruta): EmpresaCnpj {
  const endereco = bruta.endereco ?? {};
  const logradouro = [endereco.tipo_logradouro, endereco.logradouro, endereco.numero].filter(Boolean).join(' ');

  return {
    cnpj: (bruta.cnpj ?? '').replace(/\D/g, ''),
    razao_social: bruta.razao_social ?? 'Razão social não informada',
    nome_fantasia: bruta.nome_fantasia || null,
    situacao_cadastral: extrairSituacao(bruta.situacao_cadastral),
    cnae_principal: bruta.atividade_principal?.codigo ?? null,
    cnae_descricao: bruta.atividade_principal?.descricao ?? null,
    porte: bruta.porte_empresa?.descricao ?? null,
    telefone: extrairTelefone(bruta),
    email: bruta.email || null,
    municipio: endereco.municipio ?? null,
    uf: endereco.uf ?? null,
    logradouro: logradouro || null,
    bairro: endereco.bairro ?? null,
    cep: endereco.cep ?? null,
    data_abertura: bruta.data_abertura ?? null,
  };
}

function extrairSituacao(valor: EmpresaBruta['situacao_cadastral']): string | null {
  if (!valor) return null;
  if (typeof valor === 'string') return valor;
  return valor.situacao_cadastral ?? null;
}

function extrairTelefone(bruta: EmpresaBruta): string | null {
  if (bruta.telefone) return bruta.telefone;

  const primeiro = bruta.contato_telefonico?.[0];
  if (!primeiro?.numero) return null;

  return `${primeiro.ddd ?? ''}${primeiro.numero}`;
}
