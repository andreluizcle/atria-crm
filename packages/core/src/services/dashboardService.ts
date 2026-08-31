import type { ClienteSupabase } from '../lib/supabaseAdmin';
import type { StatusLead } from '../types/enums';
import { STATUS_LEAD } from '../types/enums';
import { contarLeadsPorResponsavel, contarLeadsPorStatus } from '../repositories/leadRepository';

/** Resumo do funil (spec 6.6). Simples de proposito: numeros e um grafico de barras. */

export interface ResumoDashboard {
  total: number;
  porStatus: Array<{ status: StatusLead; total: number }>;
  porResponsavel: Array<{ responsavel_id: string; responsavel_nome: string; total: number }>;
  /** Leads nas etapas do meio do funil: qualificacao, diagnostico, proposta e negociacao. */
  emAndamento: number;
  /** Leads fechados sobre o total. */
  taxaDeFechamento: number;
}

/** As etapas entre o comeco e o desfecho — nem 'pendente', nem 'fechado'/'perdido'. */
const ETAPAS_EM_ANDAMENTO = ['qualificacao', 'diagnostico', 'proposta', 'negociacao'] as const;

export async function obterResumoDashboard(db: ClienteSupabase): Promise<ResumoDashboard> {
  const [contagemStatus, porResponsavel] = await Promise.all([
    contarLeadsPorStatus(db),
    contarLeadsPorResponsavel(db),
  ]);

  // Percorre STATUS_LEAD (e nao as chaves do resultado) para status sem nenhum
  // lead aparecerem como zero, em vez de sumirem do grafico.
  const porStatus = STATUS_LEAD.map((status) => ({
    status,
    total: contagemStatus[status] ?? 0,
  }));

  const total = porStatus.reduce((soma, item) => soma + item.total, 0);
  const emAndamento = ETAPAS_EM_ANDAMENTO.reduce(
    (soma, etapa) => soma + (contagemStatus[etapa] ?? 0),
    0,
  );
  const fechados = contagemStatus.fechado ?? 0;

  return {
    total,
    porStatus,
    porResponsavel,
    emAndamento,
    taxaDeFechamento: total === 0 ? 0 : Math.round((fechados / total) * 100),
  };
}
