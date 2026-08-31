-- =============================================================================
-- 0005_status_funil.sql — troca os status do lead pelo funil comercial da EJ
-- =============================================================================
-- Os valores originais (novo/contatado/respondeu/descartado/fechado) descreviam
-- o CONTATO. O funil da Atria descreve a VENDA:
--
--   pendente -> qualificacao -> diagnostico -> proposta -> negociacao
--                                                        -> fechado | perdido
--
-- Postgres nao tem `alter type ... drop value`, entao renomear/remover valores
-- exige criar o tipo novo e trocar a coluna. Nada mais depende de status_lead
-- alem de leads.status: nenhuma policy do 0002 menciona status, e nenhuma
-- funcao ou trigger o referencia.
--
-- Todos os leads viram 'pendente'. A reclassificacao e manual, por decisao de
-- quem usa — nao existe mapeamento honesto de "contatado" para uma etapa do
-- funil novo.
-- =============================================================================

create type public.status_lead_novo as enum (
  'pendente',
  'qualificacao',
  'diagnostico',
  'proposta',
  'negociacao',
  'fechado',
  'perdido'
);

-- O default precisa sair antes: ele e um literal do tipo velho e o alter
-- column falharia tentando reinterpreta-lo.
alter table public.leads alter column status drop default;

alter table public.leads
  alter column status type public.status_lead_novo
  using 'pendente'::public.status_lead_novo;

alter table public.leads alter column status set default 'pendente';

drop type public.status_lead;
alter type public.status_lead_novo rename to status_lead;

-- O indice parcial leads_status_idx e reconstruido sozinho pelo alter column
-- type; nao precisa recriar.
