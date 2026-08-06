-- =============================================================================
-- 0002_rls.sql — Row Level Security
-- =============================================================================
-- Modelo de acesso:
--   * Painel web  -> chave `anon` + sessao do Supabase Auth. Passa por estas policies.
--   * Bot Telegram-> chave `service_role` (server-side). Ignora RLS por design; a
--                    autorizacao acontece na aplicacao, resolvendo o
--                    telegram_user_id para uma linha ativa em `usuarios`.
--
-- Toda tabela abaixo tem RLS habilitada. Tabela sem policy = ninguem alcanca
-- via `anon`, que e exatamente o que queremos para `bot_sessoes`.
-- =============================================================================

alter table public.usuarios            enable row level security;
alter table public.leads               enable row level security;
alter table public.mensagens_prontas   enable row level security;
alter table public.historico_contatos  enable row level security;
alter table public.bot_sessoes         enable row level security;

-- -----------------------------------------------------------------------------
-- Helper: o usuario logado e um membro ativo da EJ?
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER para poder ler `usuarios` sem cair na propria policy de
-- `usuarios` (evita recursao infinita de RLS).
create or replace function public.eh_membro_ativo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.usuarios u
    where u.id = auth.uid() and u.ativo
  );
$$;

revoke execute on function public.eh_membro_ativo() from public;
grant execute on function public.eh_membro_ativo() to authenticated;

-- -----------------------------------------------------------------------------
-- usuarios
-- -----------------------------------------------------------------------------
-- Todo membro ativo enxerga os colegas (precisa disso para escolher responsavel).
drop policy if exists usuarios_select on public.usuarios;
create policy usuarios_select on public.usuarios
  for select to authenticated
  using (public.eh_membro_ativo());

-- Cada um edita apenas o proprio cadastro (nome, telegram_user_id).
drop policy if exists usuarios_update_proprio on public.usuarios;
create policy usuarios_update_proprio on public.usuarios
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Nao ha policy de INSERT/DELETE: linhas nascem do trigger on_auth_user_created
-- e desativar um membro e feito com `ativo = false`, nao com DELETE.

-- -----------------------------------------------------------------------------
-- leads
-- -----------------------------------------------------------------------------
drop policy if exists leads_select on public.leads;
create policy leads_select on public.leads
  for select to authenticated
  using (public.eh_membro_ativo());

drop policy if exists leads_insert on public.leads;
create policy leads_insert on public.leads
  for insert to authenticated
  with check (public.eh_membro_ativo() and criado_por = auth.uid());

drop policy if exists leads_update on public.leads;
create policy leads_update on public.leads
  for update to authenticated
  using (public.eh_membro_ativo())
  with check (public.eh_membro_ativo());

-- Sem policy de DELETE de proposito: exclusao e sempre soft delete
-- (UPDATE em `deletado_em`), para nao perder o historico de contatos.

-- -----------------------------------------------------------------------------
-- mensagens_prontas
-- -----------------------------------------------------------------------------
drop policy if exists mensagens_select on public.mensagens_prontas;
create policy mensagens_select on public.mensagens_prontas
  for select to authenticated
  using (public.eh_membro_ativo());

drop policy if exists mensagens_insert on public.mensagens_prontas;
create policy mensagens_insert on public.mensagens_prontas
  for insert to authenticated
  with check (public.eh_membro_ativo());

drop policy if exists mensagens_update on public.mensagens_prontas;
create policy mensagens_update on public.mensagens_prontas
  for update to authenticated
  using (public.eh_membro_ativo())
  with check (public.eh_membro_ativo());

drop policy if exists mensagens_delete on public.mensagens_prontas;
create policy mensagens_delete on public.mensagens_prontas
  for delete to authenticated
  using (public.eh_membro_ativo());

-- -----------------------------------------------------------------------------
-- historico_contatos — append-only
-- -----------------------------------------------------------------------------
drop policy if exists historico_select on public.historico_contatos;
create policy historico_select on public.historico_contatos
  for select to authenticated
  using (public.eh_membro_ativo());

drop policy if exists historico_insert on public.historico_contatos;
create policy historico_insert on public.historico_contatos
  for insert to authenticated
  with check (public.eh_membro_ativo() and usuario_id = auth.uid());

-- Sem UPDATE e sem DELETE: historico nao se reescreve.

-- -----------------------------------------------------------------------------
-- bot_sessoes — nenhuma policy, de proposito.
-- -----------------------------------------------------------------------------
-- Estado interno do bot. Somente `service_role` (que ignora RLS) toca aqui.
