import type { OrigemLead, Plataforma, StatusLead } from './enums';

/** Uma linha da tabela `leads`, como sai do banco. */
export interface Lead {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  site: string | null;
  instagram: string | null;
  linkedin: string | null;
  cnpj: string | null;
  origem_lead: OrigemLead;
  status: StatusLead;
  responsavel_id: string;
  observacoes: string | null;
  criado_por: string;
  criado_em: string;
  atualizado_em: string;
  deletado_em: string | null;
}

/** Lead com os nomes dos membros ja resolvidos, para exibicao. */
export interface LeadComResponsavel extends Lead {
  responsavel_nome: string | null;
}

/** Campos aceitos na criacao. O banco preenche id, datas e defaults. */
export interface NovoLead {
  nome: string;
  telefone?: string | null;
  email?: string | null;
  site?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  cnpj?: string | null;
  origem_lead: OrigemLead;
  status?: StatusLead;
  responsavel_id: string;
  observacoes?: string | null;
  criado_por: string;
}

/** Tudo opcional: so o que veio e alterado. */
export type AtualizacaoLead = Partial<Omit<NovoLead, 'criado_por'>>;

export interface FiltroLeads {
  busca?: string;
  status?: StatusLead;
  origem_lead?: OrigemLead;
  responsavel_id?: string;
  /** Pagina baseada em 1. */
  pagina?: number;
  porPagina?: number;
}

export interface Paginado<T> {
  itens: T[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
}

/** Canais que este lead realmente permite contatar, derivado dos campos preenchidos. */
export type CanaisDisponiveis = Plataforma[];
