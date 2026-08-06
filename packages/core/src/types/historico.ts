import type { OrigemDisparo, Plataforma, StatusEnvio } from './enums';

export interface HistoricoContato {
  id: string;
  lead_id: string;
  mensagem_id: string | null;
  plataforma: Plataforma;
  usuario_id: string;
  status_envio: StatusEnvio;
  /** Snapshot do texto interpolado, para o historico nao mudar se o template mudar. */
  conteudo_enviado: string | null;
  erro: string | null;
  origem: OrigemDisparo;
  enviado_em: string;
}

export interface HistoricoComDetalhes extends HistoricoContato {
  usuario_nome: string | null;
  mensagem_titulo: string | null;
}

export interface NovoHistoricoContato {
  lead_id: string;
  mensagem_id?: string | null;
  plataforma: Plataforma;
  usuario_id: string;
  status_envio?: StatusEnvio;
  conteudo_enviado?: string | null;
  erro?: string | null;
  origem: OrigemDisparo;
}
