import type { Plataforma } from './enums';

export interface MensagemPronta {
  id: string;
  titulo: string;
  plataforma: Plataforma;
  /** Obrigatorio apenas quando plataforma = 'email'. */
  assunto: string | null;
  conteudo: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface NovaMensagemPronta {
  titulo: string;
  plataforma: Plataforma;
  assunto?: string | null;
  conteudo: string;
  ativo?: boolean;
}

export type AtualizacaoMensagemPronta = Partial<NovaMensagemPronta>;
