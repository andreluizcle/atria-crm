# Colocar o Atria CRM no ar

Passo a passo do que precisa ser feito **à mão** — nada disso dá para automatizar
a partir do repositório. O `README.md` explica o sistema; este arquivo explica
como ligá-lo.

> **É um deploy só.** `packages/bot` não tem servidor: é biblioteca pura. Quem
> serve o webhook do Telegram é o próprio app Next.js, em
> `apps/web/app/api/telegram/webhook/route.ts`. Subir o painel sobe o bot junto.

Estado atual do banco: o projeto Supabase é o **CRM Project**
(`tqtrvxhqlirlvjniawgn`), na org **Atria Jr. Org**, região `sa-east-1` (São
Paulo). As 4 migrations estão aplicadas e o schema validado. O projeto anterior
(`CRMAtria`, `aagvvuwkhodfbxafcody`, org pessoal, `us-west-2`) foi substituído.
Falta tudo que é externo ao repositório.

> ⚠️ **O banco vai para a conta da Atria, em São Paulo.** O `CRMAtria` original
> nasceu na org pessoal `andreluizcle's Org` e em `us-west-2`. Como transferir
> projeto entre orgs **não muda a região**, e os dados do banco antigo eram
> descartáveis, a decisão foi **recriar** na conta institucional em `sa-east-1`.
>
> O schema inteiro está nas 4 migrations, que são idempotentes — rodar
> `0001` → `0002` → `0003` → `0004` num projeto vazio reproduz tabelas, índices,
> tipos, triggers, funções, RLS, grants e os 4 templates do seed. O `0003` não
> depende de nenhum usuário existir antes.
>
> **Ordem, por causa do limite do plano Free** (2 projetos ativos, contados entre
> todos os membros Owner/Admin da org): a conta da Atria **cria o projeto
> primeiro**, e só **depois** convida os mantenedores como Owner/Admin. Invertido,
> a org herda a cota já estourada de quem entrou e não deixa criar.
>
> Fora das migrations, no painel do projeto novo:
>
> - criar o primeiro usuário (passo 0.1 abaixo);
> - Authentication → URL Configuration → **Site URL** = `https://crm.atriajr.com.br`;
> - ligar a proteção contra senha vazada (nasce desligada).
>
> O `ref` novo troca **três** variáveis — `NEXT_PUBLIC_SUPABASE_URL`,
> `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` — nos dois
> lugares (`.env.local` e Vercel), com redeploy. Telegram e Resend não mudam.
>
> **Só apague o projeto antigo depois** que o painel estiver logando pelo banco
> novo em produção: até lá ele é o rollback.

---

## Fase 0 — Pré-requisitos

Sem estes quatro itens nada funciona.

- [ ] **0.1 — Criar o primeiro membro.**
      Supabase Dashboard → **Authentication** → **Users** → **Add user**.
      E-mail + senha. O trigger `on_auth_user_created` cria a linha em `usuarios`
      sozinho.
      ⚠️ **Sem este passo o painel é inacessível** — `auth.users` está com 0 linhas,
      então todo acesso cai em `/login` e o bot recusa qualquer comando.

- [ ] **0.2 — Criar o bot.** Telegram → `@BotFather` → `/newbot`.
      Guardar o **token** e o **username** (sem o `@`).

- [ ] **0.3 — Gerar o segredo do webhook.**
      ```bash
      openssl rand -hex 32
      ```
      ⚠️ Esse mesmo valor assina os tokens HMAC de vínculo do Telegram
      (`packages/core/src/lib/vinculoTelegram.ts`). Trocar depois invalida todos
      os links de vínculo pendentes.

- [ ] **0.4 — Conta no Resend** (resend.com) → pegar a API key.
      ⚠️ Plano gratuito: **100 e-mails por dia**, 3.000 por mês, até 3 domínios.
      O teto diário é o que trava uma prospecção em lote primeiro.

### Sobre o remetente de e-mail

Começando com `onboarding@resend.dev`, que funciona na hora e sem domínio. **Em
modo de teste o Resend só entrega para o e-mail dono da conta** — no seu caso,
`andreluizcle@gmail.com`. Isso afeta o teste do § 5 abaixo: o lead de teste
precisa ter esse endereço.

Para prospectar de verdade, depois: verificar um domínio da Atria no Resend
(registros DNS SPF/DKIM) e trocar **só o valor** de `EMAIL_REMETENTE`. Nenhuma
mudança de código.

📄 O passo a passo completo — incluindo um pedido pronto para mandar a quem tem
acesso ao DNS — está em [`docs/Configurar-envio-de-email.md`](docs/Configurar-envio-de-email.md).

---

## Fase 1 — Deploy na Vercel

Vercel → **New Project** → importar `andreluizcle/atria-crm`.

São **duas seções diferentes** da tela, e confundi-las é o erro mais comum aqui.

**1) Root Directory** — campo próprio, com um botão **Edit** ao lado. Fica
sozinho, **fora** de "Build and Output Settings". Depois que o projeto existe,
ele está em Settings → **Build and Deployment** → **Root Directory**.

| Campo | Valor |
|---|---|
| Root Directory | `apps/web` |

**2) Build and Output Settings** — a seção logo abaixo. Cada campo precisa que
você ligue o **Override** para poder editar.

| Campo | Valor |
|---|---|
| Framework Preset | Next.js (detecta sozinho) |
| Install Command | `cd ../.. && npm install` |
| Build Command | `cd ../.. && npm run build` |
| Output Directory | **não mexa** — deixe o Override desligado |
| Node.js Version | 20.x |

> ⚠️ **O Output Directory é a armadilha.** Ele fica nessa segunda seção, perto do
> Build Command, e é fácil confundir com o Root Directory. Deixe no padrão: o
> Next.js gera em `.next` e a Vercel detecta sozinha.
>
> Se você preencher `apps/web` aqui, o build **passa** e o deploy falha depois
> com `The Next.js output directory apps/web was not found` — porque esse caminho
> é relativo ao Root Directory, e a Vercel acaba procurando em `apps/web/apps/web`.

Os dois `cd ../..` existem porque isto é um monorepo npm workspaces: instalação e
build precisam rodar da raiz para resolver `@atria/core` e `@atria/bot`, que são
consumidos como TypeScript cru via `transpilePackages`
(`apps/web/next.config.mjs`).

> A documentação da Vercel afirma que, com o Root Directory definido, "you cannot
> use `..` to move up a level". Na prática o build deste projeto passa com os
> `cd ../..` — o erro citado acima só aparece na etapa seguinte, depois de o
> build ter terminado com sucesso. Se algum dia isso mudar, o sintoma será uma
> falha durante o `npm install`, não depois dele.

### Variáveis de ambiente

Settings → Environment Variables. Marcar **Production** e **Preview**.

| Variável | Onde achar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://tqtrvxhqlirlvjniawgn.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `TELEGRAM_BOT_TOKEN` | passo 0.2 |
| `TELEGRAM_WEBHOOK_SECRET` | passo 0.3 |
| `TELEGRAM_BOT_USERNAME` | passo 0.2, sem o `@` |
| `RESEND_API_KEY` | passo 0.4 |
| `EMAIL_REMETENTE` | `Atria EJ <onboarding@resend.dev>` |
| `CASA_DOS_DADOS_API_KEY` | *(opcional)* |

⚠️ `SUPABASE_SERVICE_ROLE_KEY` **nunca** com prefixo `NEXT_PUBLIC_` — essa chave
ignora RLS por completo.

Sem `CASA_DOS_DADOS_API_KEY` a busca avançada por região/setor some da tela com
um aviso de "integração não configurada" e o resto segue normal. É proposital.

**Não** cadastrar `NEXT_PUBLIC_APP_URL`: nenhum código lê.

### Mudou alguma configuração? Precisa redeployar

Vale tanto para as variáveis de ambiente quanto para os campos de build: a
Vercel só aplica no **próximo** deploy. Corrigir e recarregar a página não
reprocessa o deploy que já falhou.

Deployments → nos `...` do último deploy → **Redeploy**.

### Domínio próprio — `crm.atriajr.com.br`

A URL `*.vercel.app` continua funcionando depois disso; o domínio próprio só
acrescenta um endereço estável e apresentável. O DNS de `atriajr.com.br` está na
GoDaddy (`ns81`/`ns82.domaincontrol.com`) — é lá que o registro é criado.

> ⚠️ **Duas posses diferentes, com pesos diferentes.** O **repositório** é o
> produto — precisa ser institucional. O **projeto da Vercel** é configuração
> recriável em ~20 minutos com as tabelas desta Fase 1.
>
> **O repositório vai para a org da Atria agora.** Repo → Settings → *Danger
> Zone* → **Transfer** → *Select one of my organizations*. Leva commits, issues,
> PRs, e os links antigos redirecionam. Org GitHub Free tem repos privados
> ilimitados. **Não forkar** — fork copia em vez de mover, e a doc do GitHub diz
> que um fork de upstream privado *não pode* ser transferido depois. Depois:
>
> ```bash
> git remote set-url origin https://github.com/<org-da-atria>/atria-crm.git
> ```
>
> **O projeto da Vercel é o caso complicado.** Da doc de colaboração:
>
> > "The Hobby Plan does not support collaboration for private repositories."
> > "To deploy commits under a Hobby team, the commit author must be the owner of
> > the Hobby team containing the Vercel project connected to the Git repository."
>
> Logo, pôr o projeto num time **Hobby institucional** e continuar dando push com
> a identidade pessoal **quebra o deploy automático** — o build simplesmente não
> roda. E a transferência de projeto entre times também não serve: exige ser
> *member* do time destino, e adicionar membro é recurso Pro.
>
> | Configuração | Custo | O que quebra |
> |---|---|---|
> | Time **Pro** da Atria | US$ 20/mês por seat dev (*Viewer* grátis) | nada — é o desenho certo |
> | **Hobby** da Atria + repo **público** | grátis | nada no deploy; o código fica aberto |
> | **Hobby** da Atria + repo **privado** | grátis | **o deploy automático** |
>
> **Enquanto o Pro não for aprovado:** transferir só o repositório e deixar o
> projeto da Vercel na conta pessoal de quem mantém — o deploy funciona porque
> essa pessoa é dona do time *e* autora dos commits. Na passagem de bastão, a
> próxima pessoa importa o repo (já da Atria) na conta dela e refaz esta Fase 1.
>
> **Consequência para o `crm`:** nesse arranjo o domínio fica registrado no
> escopo Vercel pessoal. O CNAME mora na GoDaddy (institucional), então trocar
> depois é editar um valor — mas quem quiser evitar isso adia o `crm` e usa a URL
> `.vercel.app` até a Atria ter conta própria.

**1) Na Vercel:** projeto → Settings → **Domains** → **Add Domain** → digitar
`crm.atriajr.com.br`. Por ser **subdomínio**, a Vercel pede um **CNAME**.

> ⚠️ **Copie o valor que a tela mostrar, não um valor decorado.** Hoje cada
> projeto tem um CNAME próprio, no formato `<hash>.vercel-dns-0XX.com`. O antigo
> `cname.vercel-dns.com` não serve para todo projeto.

**2) Na GoDaddy:** DNS → **Add New Record**:

| Tipo | Name | Value | TTL |
|---|---|---|---|
| `CNAME` | `crm` | o que a Vercel mostrou | 600 / padrão |

Só `crm` no campo Name — a GoDaddy anexa o `.atriajr.com.br` sozinha.

**O que isso não afeta** (conferido por consulta de DNS ao domínio):

| O que já existe hoje | Continua intacto |
|---|---|
| `A` do raiz → `173.201.179.76` (o site atual da EJ) | sim |
| `CNAME www` → raiz | sim |
| Os cinco `MX` do Google Workspace | sim |
| O `SPF` do raiz | sim |

Um CNAME em `crm` só responde por `crm.atriajr.com.br`. Nenhum dos registros
acima precisa ser tocado — e nenhum deles deve ser.

**3) Voltar na Vercel** e esperar o status virar **Valid Configuration**. O
certificado HTTPS é emitido sozinho.

**4) Repontar o webhook do Telegram** para o endereço novo: refazer o passo 2.2
trocando `SEU-APP.vercel.app` por `crm.atriajr.com.br`. Não é obrigatório — a URL
da Vercel continua de pé — mas tira o webhook da dependência de um endereço que
pode mudar.

---

## Fase 2 — Ligar o Telegram

Só dá para fazer depois do primeiro build, porque precisa da URL da Vercel.

- [ ] **2.1 — Sanidade do endpoint.** Abrir no navegador:
      `https://SEU-APP.vercel.app/api/telegram/webhook`
      Esperado: `{"status":"webhook ativo"}`.
      Se vier `{"status":"TELEGRAM_BOT_TOKEN nao configurado"}`, a variável não subiu.

- [ ] **2.2 — Registrar o webhook:**
      ```bash
      curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
        -H "Content-Type: application/json" \
        -d '{"url":"https://SEU-APP.vercel.app/api/telegram/webhook",
             "secret_token":"<MESMO_TELEGRAM_WEBHOOK_SECRET>"}'
      ```
      O `secret_token` volta no header `X-Telegram-Bot-Api-Secret-Token` e a rota
      compara antes de processar qualquer coisa — é a única autenticação do webhook.

- [ ] **2.3 — Conferir:** `https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
      → `pending_update_count: 0` e `last_error_message` ausente.

- [ ] **2.4 — Registrar o menu de comandos:**
      ```bash
      TELEGRAM_BOT_TOKEN=<token de produção> npm run bot:comandos
      ```
      O script imprime em qual bot escreveu, para você confirmar que não foi no
      bot de teste. Seguro rodar com o webhook ativo.

> **Regra de ouro:** nunca rode `npm run dev:bot` (long polling) enquanto houver
> webhook registrado no **mesmo** token. O Telegram entrega cada update a um só
> consumidor, e o bot vai parecer mudo. Para desenvolver, crie um segundo bot no
> @BotFather.

---

## Fase 3 — Checklist fim a fim

Nenhum destes caminhos tem teste automatizado. Os testes do `npm test` param na
camada de função pura (validação, interpolação) — não tocam banco, rede, Telegram
nem Resend. O que segue exercita o caminho real: mensagem de verdade no Telegram
→ webhook na Vercel → handler → Postgres com RLS → resposta de volta.

Executar **na ordem**; cada bloco depende do anterior.

### 1. Acesso e vínculo
- [ ] Abrir a URL da Vercel → redireciona para `/login`
- [ ] Logar com o membro do passo 0.1 → cai em `/dashboard` vazio
- [ ] `/perfil` → **Vincular Telegram** → abre o deep link
- [ ] No Telegram, o `/start <token>` responde "✅ Vinculado"
      ```sql
      select nome, telegram_user_id from usuarios;  -- deve estar preenchido
      ```
- [ ] `/novolead` de uma conta **não** vinculada → responde com o 🔒
- [ ] Link de vínculo com mais de 15 min → "Link expirou"

### 2. Cadastro pelo bot (`/novolead`)
- [ ] Percorrer os 10 passos até o fim
- [ ] "Pular" num campo obrigatório → "Esse campo é obrigatório"
- [ ] Telefone `11abc` → erro **sem perder o progresso**
- [ ] CNPJ com dígito verificador errado → recusado
- [ ] Digitar texto na etapa de botões (origem) → "Escolha uma das opções"
- [ ] No resumo: **✏️ Editar** → trocar um campo → volta direto ao resumo
- [ ] **✅ Confirmar** → lead aparece em `/leads` no painel
- [ ] Novo `/novolead` pulando **todos** os canais de contato → recusado no confirmar
- [ ] `/cancelar` no meio do fluxo → "Nada foi salvo"

### 3. Consulta pelo bot
- [ ] `/meusleads` → paginação de 5 em 5; tocar num lead mostra a ficha
- [ ] `/buscarlead` sem argumento pergunta o termo; `/buscarlead pad` busca direto
- [ ] `/buscarlead a` (1 letra) → "Digite pelo menos 2 letras"
- [ ] Deixar uma conversa parada **mais de 30 min** e tocar em "Próxima" →
      "A busca expirou". *Este é o teste que prova que o estado em `bot_sessoes`
      funciona — é a razão de a tabela existir.*

### 4. Painel
- [ ] `/leads/novo` sem nenhum canal de contato → recusado
- [ ] Filtros de status/origem/responsável e busca por nome
- [ ] Buscar `33.000.167/0001-01` (formatado) e depois só os dígitos → **os dois
      acham o mesmo lead**
- [ ] Buscar nome com número ("Padaria 24h") → continua achando pelo nome
- [ ] Trocar o status pelo seletor na ficha e conferir que nada mais mudou:
      ```sql
      select nome, telefone, email, status, atualizado_em from leads where id = '<id>';
      ```
- [ ] Template com `{{nome}}` e `{{variavel_inexistente}}` → o preview ao vivo
      avisa da variável desconhecida
- [ ] `/buscar-cnpj` → consulta única pela BrasilAPI (gratuita) → "Cadastrar como lead"
- [ ] Sem `CASA_DOS_DADOS_API_KEY`: a busca avançada aparece como "não
      configurada" em vez de quebrar

### 5. Disparos — o núcleo do produto
- [ ] `/enviarmensagem` num lead com telefone → botão **Abrir WhatsApp** com o
      texto já interpolado na URL; histórico grava `preparado`
- [ ] Instagram/LinkedIn → mensagem em bloco de código para copiar
- [ ] Repetir o **mesmo template no mesmo lead** → aviso "ℹ️ Essa mensagem já foi
      usada com este lead em DD/MM/AAAA" (avisa, não bloqueia)
- [ ] **E-mail** para um lead com `andreluizcle@gmail.com` → preview →
      **📨 Enviar agora** → o e-mail chega de verdade
      ```sql
      select plataforma, status_envio, erro, origem from historico_contatos
      order by enviado_em desc limit 5;   -- espera 'enviado', erro null
      ```
- [ ] E-mail para um endereço **diferente** → grava `falhou` com o motivo do
      Resend em `erro`. *Falhar bem faz parte do requisito.*
- [ ] A mesma trilha aparece na ficha do lead, com plataforma, template, autor,
      data e via painel/bot

### 6. Segurança
- [ ] Webhook sem o header do segredo devolve `401`:
      ```bash
      curl -i -X POST https://SEU-APP.vercel.app/api/telegram/webhook -d '{}'
      ```
- [ ] Membro desativado perde tudo:
      ```sql
      update usuarios set ativo = false where email = '<email>';
      ```
      → painel expulsa para `/login?erro=inativo` e o bot para de responder.
      Reverter com `ativo = true`.

---

## Pendências conhecidas

Registradas para não virarem surpresa:

- **Sessões expiradas nunca são limpas em produção.** `limparSessoesExpiradas`
  só é chamada pelo `dev.ts`, apesar de `sessaoRepository.ts` dizer que o webhook
  chamaria. **Não é bug de correção** — `buscarSessao` já checa `expira_em` na
  leitura — é só lixo acumulando em `bot_sessoes`. Não afeta o MVP.
- **Termos de busca com vírgula ou parêntese** quebram a sintaxe do filtro `or()`
  do PostgREST. Buscar `Silva, Souza` se comporta mal. Pré-existente.
- **Sem permissões por papel:** todo membro ativo vê e edita tudo.
- O segredo do webhook é comparado com `!==` e não com comparação timing-safe.
  Risco baixo num segredo de 32 bytes.

Os próximos passos de produto (WhatsApp Business API, cadências de follow-up,
importação de planilha, permissões por papel, relatórios de conversão, testes de
integração com banco de teste) estão no fim do `README.md`.
