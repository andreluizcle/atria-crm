/**
 * Espelha os enums criados em supabase/migrations/0001_schema.sql.
 * Se mudar um valor aqui, mude tambem na migration (e vice-versa).
 */

export const ORIGENS_LEAD = ['indicacao', 'linkedin', 'evento', 'busca_cnpj', 'outro'] as const;
export type OrigemLead = (typeof ORIGENS_LEAD)[number];

export const STATUS_LEAD = ['novo', 'contatado', 'respondeu', 'descartado', 'fechado'] as const;
export type StatusLead = (typeof STATUS_LEAD)[number];

export const PLATAFORMAS = ['whatsapp', 'instagram', 'linkedin', 'email'] as const;
export type Plataforma = (typeof PLATAFORMAS)[number];

export const STATUS_ENVIO = ['preparado', 'enviado', 'falhou'] as const;
export type StatusEnvio = (typeof STATUS_ENVIO)[number];

export const ORIGENS_DISPARO = ['web', 'telegram'] as const;
export type OrigemDisparo = (typeof ORIGENS_DISPARO)[number];

/** Rotulos legiveis, usados tanto nos botoes do bot quanto nas telas do painel. */
export const ROTULO_ORIGEM_LEAD: Record<OrigemLead, string> = {
  indicacao: 'Indicação',
  linkedin: 'LinkedIn',
  evento: 'Evento',
  busca_cnpj: 'Busca por CNPJ',
  outro: 'Outro',
};

export const ROTULO_STATUS_LEAD: Record<StatusLead, string> = {
  novo: 'Novo',
  contatado: 'Contatado',
  respondeu: 'Respondeu',
  descartado: 'Descartado',
  fechado: 'Fechado',
};

export const ROTULO_PLATAFORMA: Record<Plataforma, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  email: 'E-mail',
};

export const EMOJI_PLATAFORMA: Record<Plataforma, string> = {
  whatsapp: '💬',
  instagram: '📷',
  linkedin: '💼',
  email: '✉️',
};

export function ehOrigemLead(valor: unknown): valor is OrigemLead {
  return typeof valor === 'string' && (ORIGENS_LEAD as readonly string[]).includes(valor);
}

export function ehStatusLead(valor: unknown): valor is StatusLead {
  return typeof valor === 'string' && (STATUS_LEAD as readonly string[]).includes(valor);
}

export function ehPlataforma(valor: unknown): valor is Plataforma {
  return typeof valor === 'string' && (PLATAFORMAS as readonly string[]).includes(valor);
}
