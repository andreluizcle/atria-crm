-- =============================================================================
-- 0001_schema.sql — tabelas, enums, indices e triggers do CRM de prospecao
-- =============================================================================
-- Como aplicar manualmente: Supabase Dashboard > SQL Editor > cole e rode.
-- A ordem dos arquivos importa: 0001 -> 0002 -> 0003.
-- =============================================================================

create extension if not exists pgcrypto;  -- gen_random_uuid()
create extension if not exists pg_trgm;   -- busca de leads por nome parcial

-- -----------------------------------------------------------------------------
-- Enums do dominio
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.origem_lead as enum ('indicacao', 'linkedin', 'evento', 'busca_cnpj', 'outro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.status_lead as enum ('novo', 'contatado', 'respondeu', 'descartado', 'fechado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.plataforma as enum ('whatsapp', 'instagram', 'linkedin', 'email');
exception when duplicate_object then null; end $$;

-- 'preparado' = o sistema montou a mensagem e o membro precisa colar/enviar (wa.me, IG, LinkedIn).
-- 'enviado'   = saiu de fato pelo provedor transacional (hoje, apenas e-mail).
-- 'falhou'    = tentamos enviar e o provedor recusou; o motivo fica em `erro`.
do $$ begin
  create type public.status_envio as enum ('preparado', 'enviado', 'falhou');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- Trigger compartilhado: mantem `atualizado_em` sempre correto
-- -----------------------------------------------------------------------------
create or replace function public.set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- usuarios — membros da EJ, espelhando o Supabase Auth
-- -----------------------------------------------------------------------------
create table if not exists public.usuarios (
  id                uuid primary key references auth.users (id) on delete cascade,
  nome              text not null,
  email             text not null unique,
  -- Preenchido pelo membro via /vincular no bot. Liga quem fala no Telegram
  -- a um responsavel valido no banco.
  telegram_user_id  text unique,
  ativo             boolean not null default true,
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now()
);

create index if not exists usuarios_telegram_idx on public.usuarios (telegram_user_id)
  where telegram_user_id is not null;

drop trigger if exists usuarios_set_atualizado_em on public.usuarios;
create trigger usuarios_set_atualizado_em
  before update on public.usuarios
  for each row execute function public.set_atualizado_em();

-- Ao cadastrar um membro no Supabase Auth, cria automaticamente a linha em `usuarios`.
-- Sem isso, todo convite exigiria um INSERT manual e o membro nao conseguiria logar direito.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, nome, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- leads
-- -----------------------------------------------------------------------------
create table if not exists public.leads (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null check (length(btrim(nome)) > 0),
  telefone        text,
  email           text,
  site            text,
  instagram       text,
  linkedin        text,
  cnpj            text check (cnpj is null or cnpj ~ '^[0-9]{14}$'),
  origem_lead     public.origem_lead not null default 'outro',
  status          public.status_lead not null default 'novo',
  responsavel_id  uuid not null references public.usuarios (id) on delete restrict,
  observacoes     text,
  criado_por      uuid not null references public.usuarios (id) on delete restrict,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  -- Soft delete: preserva o historico_contatos do lead (spec 6.2)
  deletado_em     timestamptz,

  -- Regra de negocio da spec secao 4: nome, status e responsavel sao obrigatorios
  -- E pelo menos um canal de contato precisa existir. Validado tambem no
  -- packages/core/src/validacao/leadValidacao.ts — nunca so no front-end.
  constraint contato_obrigatorio check (
    telefone is not null
    or email is not null
    or instagram is not null
    or linkedin is not null
  )
);

create index if not exists leads_status_idx on public.leads (status) where deletado_em is null;
create index if not exists leads_responsavel_idx on public.leads (responsavel_id) where deletado_em is null;
create index if not exists leads_origem_idx on public.leads (origem_lead) where deletado_em is null;
create index if not exists leads_criado_em_idx on public.leads (criado_em desc);
create index if not exists leads_cnpj_idx on public.leads (cnpj) where cnpj is not null;
create index if not exists leads_nome_trgm_idx on public.leads using gin (nome gin_trgm_ops);

-- Impede importar duas vezes o mesmo CNPJ da Casa dos Dados (spec 6.5b).
-- Leads soft-deletados sao ignorados, entao da para reimportar um lead descartado.
create unique index if not exists leads_cnpj_unico_idx on public.leads (cnpj)
  where cnpj is not null and deletado_em is null;

drop trigger if exists leads_set_atualizado_em on public.leads;
create trigger leads_set_atualizado_em
  before update on public.leads
  for each row execute function public.set_atualizado_em();

-- -----------------------------------------------------------------------------
-- mensagens_prontas — templates gerenciados pelo painel web
-- -----------------------------------------------------------------------------
create table if not exists public.mensagens_prontas (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null check (length(btrim(titulo)) > 0),
  plataforma     public.plataforma not null,
  -- Usado somente quando plataforma = 'email'. Tambem aceita variaveis {{...}}.
  assunto        text,
  -- Suporta interpolacao: {{nome}}, {{origem_lead}}, {{status}}, {{responsavel}}...
  conteudo       text not null check (length(btrim(conteudo)) > 0),
  ativo          boolean not null default true,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),

  -- Um e-mail sem assunto seria recusado pelo provedor transacional.
  constraint assunto_obrigatorio_para_email check (
    plataforma <> 'email' or (assunto is not null and length(btrim(assunto)) > 0)
  )
);

create index if not exists mensagens_prontas_plataforma_idx
  on public.mensagens_prontas (plataforma) where ativo;

-- Titulo unico: e o rotulo que aparece no menu do bot, dois iguais confundem.
create unique index if not exists mensagens_prontas_titulo_idx
  on public.mensagens_prontas (titulo);

drop trigger if exists mensagens_set_atualizado_em on public.mensagens_prontas;
create trigger mensagens_set_atualizado_em
  before update on public.mensagens_prontas
  for each row execute function public.set_atualizado_em();

-- -----------------------------------------------------------------------------
-- historico_contatos — append-only, um registro por disparo
-- -----------------------------------------------------------------------------
create table if not exists public.historico_contatos (
  id                uuid primary key default gen_random_uuid(),
  lead_id           uuid not null references public.leads (id) on delete cascade,
  -- Fica null se o template for apagado depois; o texto real continua em conteudo_enviado.
  mensagem_id       uuid references public.mensagens_prontas (id) on delete set null,
  plataforma        public.plataforma not null,
  usuario_id        uuid not null references public.usuarios (id) on delete restrict,
  status_envio      public.status_envio not null default 'preparado',
  -- Snapshot do texto ja interpolado, para o historico nao mudar se o template mudar.
  conteudo_enviado  text,
  erro              text,
  origem            text not null default 'web' check (origem in ('web', 'telegram')),
  enviado_em        timestamptz not null default now()
);

create index if not exists historico_lead_idx
  on public.historico_contatos (lead_id, enviado_em desc);
create index if not exists historico_usuario_idx
  on public.historico_contatos (usuario_id, enviado_em desc);

-- -----------------------------------------------------------------------------
-- bot_sessoes — maquina de estados das conversas do Telegram
-- -----------------------------------------------------------------------------
-- O bot roda como webhook serverless na Vercel: nao existe memoria entre
-- invocacoes, entao o progresso de um /novolead precisa viver no banco.
create table if not exists public.bot_sessoes (
  telegram_user_id  text primary key,
  chat_id           bigint not null,
  fluxo             text not null,
  passo             text not null,
  dados             jsonb not null default '{}'::jsonb,
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now(),
  -- Conversas obsoletas expiram sozinhas (spec 5.4)
  expira_em         timestamptz not null default now() + interval '30 minutes'
);

create index if not exists bot_sessoes_expira_idx on public.bot_sessoes (expira_em);

drop trigger if exists bot_sessoes_set_atualizado_em on public.bot_sessoes;
create trigger bot_sessoes_set_atualizado_em
  before update on public.bot_sessoes
  for each row execute function public.set_atualizado_em();
