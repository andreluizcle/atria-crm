# Atria CRM — Prospecção Ativa

Sistema interno de prospecção da **Atria Empresa Júnior**. São duas frentes que
compartilham o mesmo banco Supabase:

| Frente | Para quê |
|---|---|
| **Bot do Telegram** | Cadastrar e consultar leads pelo celular, disparar mensagens prontas |
| **Painel web** | Gestão completa: CRUD, templates, busca por CNPJ, dashboard do funil |

> A especificação original que originou este projeto está em [`docs/especificacao.md`](docs/especificacao.md).

---

## Como está organizado

```
atria-crm/
├─ packages/core/     # regra de negócio compartilhada (tipos, validações, services)
├─ packages/bot/      # fluxos do Telegram (lógica pura, sem servidor próprio)
├─ apps/web/          # painel Next.js — e também o host do webhook do bot
└─ supabase/migrations/
```

**A regra estrutural que não se quebra:** `handler/page → service → repository → Supabase`.
Nenhum handler do bot e nenhuma página do Next fala com o Supabase diretamente. Se
você precisar de uma consulta nova, ela nasce num repository.

Por que **um repositório só**: bot e painel compartilham tipos, validações e
services. Em repositórios separados, o schema sairia de sincronia na primeira
troca de semestre.

Por que **o bot roda dentro do app web**: um único deploy na Vercel, sem serviço
extra para a EJ manter. O preço dessa escolha é que não existe memória entre
requisições — por isso o estado das conversas vive na tabela `bot_sessoes`, e não
em variável de módulo.

---

## Rodando localmente

### 1. Pré-requisitos

- Node.js 20 ou superior
- Uma conta no [Supabase](https://supabase.com) (grátis)
- Um bot criado no [@BotFather](https://t.me/BotFather)

### 2. Instalar

```bash
git clone https://github.com/andreluizcle/atria-crm.git
cd atria-crm
npm install
```

### 3. Criar o banco

No painel do Supabase, vá em **SQL Editor** e rode os quatro arquivos **nesta ordem**:

1. `supabase/migrations/0001_schema.sql` — tabelas, enums, índices e triggers
2. `supabase/migrations/0002_rls.sql` — Row Level Security
3. `supabase/migrations/0003_seed.sql` — 4 templates de exemplo (um por canal)
4. `supabase/migrations/0004_grants.sql` — fecha o `EXECUTE` de `eh_membro_ativo()` para o papel `anon`

> O projeto **CRMAtria** já está com as quatro aplicadas. Esta lista serve para
> montar um banco novo do zero (um projeto de teste, por exemplo).

### 4. Configurar as variáveis

```bash
cp .env.example .env.local
```

| Variável | Onde conseguir | Obrigatória |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | idem | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | idem — **nunca** exponha no navegador | ✅ |
| `TELEGRAM_BOT_TOKEN` | @BotFather | ✅ para o bot |
| `TELEGRAM_WEBHOOK_SECRET` | invente: `openssl rand -hex 32` | ✅ para o bot |
| `TELEGRAM_BOT_USERNAME` | o @ do bot, sem a arroba | ✅ para o bot |
| `RESEND_API_KEY` | [resend.com/api-keys](https://resend.com/api-keys) | ✅ para enviar e-mail |
| `EMAIL_REMETENTE` | endereço de domínio verificado no Resend | ✅ para enviar e-mail |
| `CASA_DOS_DADOS_API_KEY` | Casa dos Dados (API paga) | ❌ opcional |

Sem `CASA_DOS_DADOS_API_KEY`, tudo funciona — só a busca por região/setor mostra
um aviso de "integração não configurada".

### 5. Criar o primeiro membro

O painel não tem tela de cadastro (é sistema interno). Crie os membros pelo
Supabase: **Authentication → Users → Add user**, com e-mail e senha.

A linha correspondente em `usuarios` aparece sozinha, criada pelo trigger
`on_auth_user_created`.

### 6. Subir

```bash
npm run dev        # painel em http://localhost:3000
npm run dev:bot    # bot em long polling, em outro terminal
```

> ⚠️ Não rode `dev:bot` enquanto houver webhook registrado no **mesmo** bot: o
> Telegram entrega cada update para um só destino, e o bot vai parecer mudo.
> Para desenvolver, crie um segundo bot de teste no @BotFather.

### 7. Vincular sua conta do Telegram

Entre no painel → **Meu perfil** → **Vincular Telegram**. Isso gera um link
assinado, válido por 15 minutos, que abre o bot já vinculado a você.

O vínculo é feito assim (e não digitando o próprio e-mail no bot) porque o bot é
público: qualquer pessoa pode mandar mensagem para ele. Só quem já passou pelo
login do painel consegue gerar um token válido.

---

## Comandos do bot

| Comando | O que faz |
|---|---|
| `/novolead` | Cadastro passo a passo, com "Pular" nos opcionais e resumo antes de salvar |
| `/meusleads` | Seus leads, paginados |
| `/buscarlead [termo]` | Procura por nome, e-mail ou CNPJ |
| `/enviarmensagem [termo]` | Escolhe lead → escolhe template → dispara |
| `/cancelar` | Abandona o que estiver em andamento |
| `/ajuda` | Lista os comandos |

---

## Como cada canal se comporta

Essa é a parte da spec que mais gera confusão, então vale explicitar:

| Canal | O que o sistema faz | Quem clica em "enviar" |
|---|---|---|
| **WhatsApp** | Gera link `wa.me` com o texto já preenchido | 👤 a pessoa |
| **Instagram** | Copia a mensagem e abre o perfil | 👤 a pessoa |
| **LinkedIn** | Copia a mensagem e abre o perfil | 👤 a pessoa |
| **E-mail** | **Envia de verdade**, via Resend, com um clique | 🤖 o sistema |

Instagram e LinkedIn **não têm** API pública legítima para DM automatizada, e
nenhuma dessas plataformas aceita pré-preenchimento de mensagem por link.
Simular o app violaria os termos de uso e arriscaria o banimento da conta da EJ.
Por isso o sistema prepara, e a pessoa envia.

E-mail é a exceção deliberada: é o canal de menor risco para leads individuais,
e por isso o envio é automático de fato.

Isso aparece no histórico: disparos manuais ficam como `preparado`, e-mails
efetivamente entregues ficam como `enviado`. Marcar tudo como "enviado" daria
uma falsa sensação de follow-up feito.

---

## Deploy na Vercel

> 📋 O passo a passo completo — incluindo pré-requisitos, variáveis de ambiente e
> um checklist de verificação fim a fim — está em [`DEPLOY.md`](DEPLOY.md).
> O resumo abaixo cobre só a parte da Vercel.

1. **Importar o repositório** na Vercel. Configure:
   - Root Directory: `apps/web`
   - Build Command: `cd ../.. && npm run build`
   - Install Command: `cd ../.. && npm install`
2. **Copiar todas as variáveis** do `.env.local` para Settings → Environment Variables.
3. **Registrar o webhook** do Telegram, depois do primeiro deploy:

```bash
curl -X POST "https://api.telegram.org/bot<SEU_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://SEU-APP.vercel.app/api/telegram/webhook",
    "secret_token": "<O_MESMO_TELEGRAM_WEBHOOK_SECRET>"
  }'
```

Confira com `https://api.telegram.org/bot<SEU_TOKEN>/getWebhookInfo` — o campo
`pending_update_count` deve ficar em 0 e `last_error_message` vazio.

4. **Registrar o menu de comandos** — a listinha que aparece ao digitar `/`:

```bash
TELEGRAM_BOT_TOKEN=<token de produção> npm run bot:comandos
```

Rode uma vez por bot. É seguro fazer com o webhook ativo: `setMyCommands` é uma
chamada de configuração, não consome updates, e o script nunca sobe polling.
O `npm run dev:bot` também registra os comandos, mas só no bot que você usa em
desenvolvimento — em produção quem faz isso é o comando acima.

---

## Verificando que está tudo certo

```bash
npm test         # 33 testes das regras compartilhadas (validação, interpolação)
npm run typecheck
npm run build
```

Checagens manuais que valem a pena:

- Tente salvar um lead **sem nenhum contato** — tem que ser recusado nos três
  níveis: formulário, service e `CHECK` do banco.
- Cadastre um lead com telefone e confirme que o botão do WhatsApp abre com o
  texto já escrito.
- No editor de template, confirme que o preview muda ao digitar.

---

## Segurança — o que já está no lugar

- **RLS ligada em todas as tabelas** desde a primeira migration. `bot_sessoes`
  não tem policy nenhuma de propósito: só `service_role` alcança.
- O painel usa a chave `anon` + sessão do usuário, então **passa pelas policies**.
  A `service_role` só é usada pelo bot, no servidor.
- O webhook valida o header `X-Telegram-Bot-Api-Secret-Token` antes de processar
  qualquer update.
- O vínculo Telegram↔membro usa token HMAC com validade de 15 minutos.
- `@atria/core/cliente` é o único entry point que componentes `'use client'`
  podem importar — impede que código de servidor vá parar no bundle do navegador.

---

## Próximos passos (depois do MVP)

Coisas conscientemente **fora** deste escopo, para a próxima gestão avaliar:

1. **WhatsApp Business API oficial** para campanhas em escala. Exige templates
   aprovados pela Meta e conta comercial verificada. O ponto exato onde essa
   integração entraria está marcado com um comentário em
   `packages/core/src/services/envioService.ts`.
2. **Sequências de follow-up por e-mail** — hoje cada disparo é manual. Um cron
   da Vercel + uma tabela de cadência resolveria.
3. **Importação por planilha** (CSV/XLSX), útil para listas de eventos.
4. **Permissões por papel** — hoje todo membro ativo vê e edita tudo. Se a EJ
   crescer, vale separar diretoria de trainee nas policies.
5. **Relatórios de conversão por origem** — o dado já está em `leads.origem_lead`
   e em `historico_contatos`; falta a tela.
6. **Notificação de follow-up** — avisar no Telegram quando um lead está parado
   em `contatado` há mais de N dias.
7. **Testes de integração** dos fluxos do bot, com um banco Supabase de teste.

---

## Decisões que podem parecer estranhas (e por quê)

- **`bot_sessoes` no Postgres, não em memória** — webhook serverless não tem
  memória entre invocações. Guardar em variável funcionaria em `dev:bot` e
  quebraria em produção de um jeito difícil de descobrir.
- **`npm workspaces` e não `pnpm`** — menos ferramenta para o próximo time
  instalar. O `npm` já vem com o Node.
- **Soft delete nos leads** — excluir de verdade apagaria o histórico de contatos
  junto, e o histórico é o que dá memória à prospecção entre semestres.
- **Validação em três lugares** (formulário, service, `CHECK` do banco) — não é
  redundância inútil: o formulário dá feedback rápido, o service protege o bot e
  a API, e o banco é a última barreira contra um bug futuro.
