/** Resultado normalizado de uma consulta de CNPJ, venha da BrasilAPI ou da Casa dos Dados. */
export interface EmpresaCnpj {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  situacao_cadastral: string | null;
  cnae_principal: string | null;
  cnae_descricao: string | null;
  porte: string | null;
  telefone: string | null;
  email: string | null;
  municipio: string | null;
  uf: string | null;
  logradouro: string | null;
  bairro: string | null;
  cep: string | null;
  data_abertura: string | null;
}

/** Filtros da busca avancada da Casa dos Dados (spec 6.5b). */
export interface FiltroBuscaEmpresas {
  uf?: string;
  municipio?: string;
  /** Codigos CNAE, ex: ['6201501'] */
  cnaes?: string[];
  /** Ex: 'ME', 'EPP', 'DEMAIS' */
  porte?: string[];
  somenteAtivas?: boolean;
  comTelefone?: boolean;
  comEmail?: boolean;
  pagina?: number;
}

export interface ResultadoBuscaEmpresas {
  empresas: EmpresaCnpj[];
  total: number;
  pagina: number;
}
