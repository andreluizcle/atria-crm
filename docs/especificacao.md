# Prompt para Claude Code — Sistema de Prospecção Ativa para Empresa Júnior.

---

## 1. Contexto

Você vai atuar como um(a) engenheiro(a) de software sênior ajudando uma **empresa júnior (EJ)** universitária brasileira a construir um sistema interno de **prospecção ativa de clientes (CRM leve)**. A equipe é pequena, sem DevOps dedicado, então o sistema precisa ser **simples de rodar, entender e manter** por estudantes que vão trocar a cada semestre.

Este projeto terá duas partes que se comunicam pelo mesmo banco de dados:

1. **Bot do Telegram** — qualquer membro da EJ cadastra e consulta leads, e dispara mensagens prontas.
2. **Sistema Web** — painel de gestão completo (CRUD), templates de mensagem, busca de empresas por CNPJ/região.

Ambos compartilham o mesmo banco **Supabase (Postgres)**.

---

## 2. Stack tecnológico sugerido

- **Banco de dados / Auth**: Supabase (Postgres + Supabase Auth + Row Level Security)
- **Bot do Telegram**: Node.js + TypeScript, usando `telegraf` (ou `grammy`, se preferir — justifique a escolha)
- **Sistema Web**: Next.js (App Router) + TypeScript + Tailwind CSS, hospedável na Vercel
- **Hospedagem do bot**: pode ser um Supabase Edge Function (webhook) ou um serviço separado (Railway/Fly.io) — decida e documente o motivo
- **Gerenciador de pacotes**: pnpm ou npm (escolha um e seja consistente)

Se você (Claude Code) tiver uma sugestão de stack melhor para os objetivos abaixo, pode propor — mas explique o trade-off antes de trocar.

---

## 3. Princípios de engenharia de software (OBRIGATÓRIO seguir)

Este é um requisito tão importante quanto as funcionalidades:

- **Nunca centralize lógica em arquivos gigantes.** Nada de `index.ts` ou `bot.ts` com milhares de linhas. Separe por responsabilidade.
- Organize em camadas claras, por exemplo:
  - `bot/handlers/` (um arquivo por fluxo de conversa: `cadastrarLead.ts`, `buscarLead.ts`, `enviarMensagem.ts`)
  - `bot/states/` (máquina de estados da conversa, se aplicável)
  - `services/` (regras de negócio, ex: `leadService.ts`, `cnpjService.ts`, `mensagemService.ts`)
  - `repositories/` (acesso ao Supabase, ex: `leadRepository.ts`) — **nenhum handler deve chamar o Supabase diretamente**, sempre via repository
  - `web/app/(rotas)` (páginas do Next.js, curtas, delegando lógica para `services/`)
  - `web/components/` (componentes de UI reutilizáveis, pequenos e coesos)
  - `types/` (tipos/interfaces compartilhados entre bot e web, ex: `Lead`, `MensagemPronta`)
  - `lib/` (integrações externas: cliente Supabase, cliente Casa dos Dados, cliente da API de CNPJ)
- Cada arquivo deve ter **uma responsabilidade clara** — se um arquivo passar de ~200-300 linhas, é sinal de que deveria ser dividido.
- Use **nomes descritivos em português ou inglês, mas seja consistente** (não misture `getLead` com `buscarLead` no mesmo projeto).
- Escreva um **README.md** explicando: como rodar localmente, variáveis de ambiente necessárias, como criar as tabelas no Supabase (inclua o SQL), como configurar o webhook do bot.
- Use **variáveis de ambiente** (`.env`) para todos os segredos (token do bot, chaves de API, credenciais do Supabase). Nunca hardcode.
- Adicione **tratamento de erros** em toda chamada externa (Supabase, API de CNPJ, API do Telegram) — o bot nunca deve travar silenciosamente; sempre avise o usuário que algo deu errado.
- Implemente **Row Level Security (RLS)** no Supabase desde o início, mesmo que simples (ex: usuário autenticado pode ler/editar tudo, mas ações passam por policies explícitas).
- Ao final de cada etapa grande, apresente um **resumo do que foi feito e o que falta**, não só o código.

**Antes de escrever qualquer código**, monte e mostre:
1. A árvore de pastas proposta.
2. O schema SQL completo das tabelas.
3. Só então comece a implementação, etapa por etapa (primeiro banco → depois bot → depois web), pedindo confirmação entre etapas grandes se algo estiver ambíguo.

---

## 4. Modelagem de dados (Supabase)

### Tabela `leads`

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| `id` | uuid (PK) | auto | |
| `nome` | text | **sim** | Ex: "Empresa X, contato desconhecido" quando não souber |
| `telefone` | text | não* | |
| `email` | text | não* | |
| `site` | text | não* | |
| `instagram` | text | não* | |
| `linkedin` | text | não* | |
| `cnpj` | text | não | preenchido se vier de busca por CNPJ |
| `origem_lead` | enum/text | sim | `indicacao`, `linkedin`, `evento`, `busca_cnpj`, `outro` |
| `status` | enum/text | sim, default `novo` | `novo`, `contatado`, `respondeu`, `descartado`, `fechado` |
| `responsavel_id` | uuid (FK → usuarios) | sim | quem da EJ está cuidando |
| `observacoes` | text | não | texto livre |
| `criado_por` (telegram_user_id ou usuario_id) | text/uuid | sim | quem cadastrou o lead |
| `criado_em` | timestamptz | auto | |
| `atualizado_em` | timestamptz | auto | |

**Regra de validação de negócio**: `nome`, `status` e `responsavel_id` são obrigatórios, **e pelo menos um dos campos de contato** (`telefone`, `email`, `instagram`, `linkedin`) deve estar preenchido. Implemente essa validação tanto no bot quanto no backend do sistema web (não confie só no front-end).

### Tabela `usuarios` (membros da EJ)
Vincule ao Supabase Auth para o sistema web. Guarde também o `telegram_user_id` de cada membro para linkar quem cadastra pelo bot a um responsável válido (ou permita selecionar o responsável manualmente na conversa, caso o membro não esteja pré-cadastrado).

### Tabela `mensagens_prontas`
| Campo | Tipo | Observação |
|---|---|---|
| `id` | uuid | |
| `titulo` | text | nome curto pra identificar no menu do bot |
| `plataforma` | enum | `whatsapp`, `instagram`, `linkedin`, `email` (o texto pode variar por canal) |
| `conteudo` | text | suporta variáveis tipo `{{nome}}`, `{{origem_lead}}` para interpolação |
| `ativo` | boolean | permite desativar sem apagar |
| `criado_em` | timestamptz | |

### Tabela `historico_contatos` (opcional, mas recomendado)
Registra cada vez que uma mensagem pronta foi disparada para um lead (lead_id, mensagem_id, plataforma, usuario_id, data). Isso dá histórico de follow-up e evita mandar a mesma mensagem duas vezes sem perceber.

Gere o SQL de criação de todas as tabelas, incluindo índices úteis (ex: índice em `status`, `responsavel_id`, `cnpj`) e as policies de RLS.

---

## 5. Bot do Telegram — requisitos funcionais

### 5.1 Cadastro de novo lead (fluxo conversacional)
- Qualquer membro pode iniciar com um comando (ex: `/novolead`).
- O bot pergunta os campos em etapas (não tudo de uma vez), permitindo pular campos opcionais (ex: digitar "pular" ou usar um botão inline "Pular").
- Ao final, o bot **mostra um resumo de tudo que foi digitado e pede confirmação explícita** (botões "Confirmar" / "Cancelar" / "Editar") antes de gravar no Supabase.
- Validar as regras de obrigatoriedade da seção 4 antes de permitir confirmar.

### 5.2 Consulta de leads
- Comando para buscar um lead por nome ou listar os leads do próprio responsável (ex: `/meusleads`).
- Resultado paginado (não mandar uma lista gigante de uma vez se houver muitos leads).

### 5.3 Envio de mensagens prontas
- Comando (ex: `/enviarmensagem`) que:
  1. Pede para o membro selecionar um lead (busca por nome ou lista).
  2. Mostra as `mensagens_prontas` cadastradas no sistema web, filtradas pela plataforma que o lead tem cadastrada (ex: só mostra templates de Instagram se o lead tiver `instagram` preenchido).
  3. Membro escolhe a plataforma de envio.
  4. O bot interpola as variáveis (`{{nome}}` etc.) e:
     - **Se for WhatsApp**: gera o link `https://wa.me/<telefone>?text=<mensagem_url_encoded>` e envia como botão inline "Abrir WhatsApp".
     - **Se for Instagram ou LinkedIn**: **não existe pré-preenchimento de mensagem via link nessas plataformas.** O bot deve enviar a mensagem já pronta como texto no próprio chat do Telegram (para o membro copiar com um toque) e, junto, um botão inline "Abrir perfil no Instagram/LinkedIn" apontando para a URL do perfil salva no lead. Deixe isso claro na resposta do bot (ex: "Copie a mensagem acima e cole na conversa que vai abrir").
     - **Se for Email**: **envio automático real, disparado com um único clique**, tanto pelo bot do Telegram quanto pelo painel web. Isso faz parte do escopo do MVP (não é um "próximo passo"). Use um provedor de envio transacional (ex: Resend, SendGrid, Amazon SES) autenticado por uma conta de e-mail da própria EJ, configurado via variável de ambiente. Esse botão só deve aparecer/funcionar quando o lead tiver `email` preenchido.
  5. Registrar o disparo em `historico_contatos`.

### 5.4 Tratamento de erros de conversa
- Se o usuário digitar algo inválido (ex: telefone com letras), o bot deve pedir para corrigir sem perder o progresso do cadastro.
- Implementar timeout/cancelamento de conversas obsoletas.

---

## 6. Sistema Web — requisitos funcionais

### 6.1 Autenticação
- Login via Supabase Auth (e-mail/senha ou magic link) para os membros da EJ.

### 6.2 CRUD completo de leads
- Listagem com filtros (status, origem, responsável) e busca por nome/empresa.
- Criação, edição e exclusão (soft delete se possível, para manter histórico).
- Tela de detalhe do lead mostrando `historico_contatos`.

### 6.3 Gestão de mensagens prontas
- CRUD de templates (`mensagens_prontas`), com preview mostrando como fica ao interpolar um lead de exemplo.

### 6.4 Botão de contato rápido em cada lead
- Mesma lógica da seção 5.3, disponível também na interface web: um botão por canal disponível no lead.
- **WhatsApp**: abre o link com o texto já preenchido.
- **Instagram/LinkedIn**: copia a mensagem para a área de transferência (`navigator.clipboard.writeText`) e abre o perfil em nova aba.
- **E-mail** (quando o lead tem `email` cadastrado): **botão de envio automático com um clique**, disparando de fato o e-mail via provedor transacional (mesmo serviço usado pelo bot, seção 5.3) — sem abrir o cliente de e-mail do usuário, sem depender de `mailto:`. Registrar o envio em `historico_contatos` da mesma forma que os outros canais.

### 6.5 Busca e enriquecimento por CNPJ
Duas funcionalidades distintas — não confunda:

**a) Consulta pontual de CNPJ conhecido**
Use uma API gratuita de consulta unitária (ex: BrasilAPI ou ReceitaWS) para trazer razão social, CNAE, endereço, situação cadastral, e telefone/email quando disponíveis. Usar para enriquecer um lead que já tem CNPJ ou para o membro colar um CNPJ manualmente.

**b) Busca avançada por região/setor (múltiplas empresas)**
Use a **API oficial da Casa dos Dados** (`https://api.casadosdados.com.br/v5/cnpj/pesquisa`, autenticada por header `api-key`, sistema de saldo pago por consulta — a chave deve vir de variável de ambiente). Monte uma tela onde o membro filtra por UF, município, CNAE/setor, porte etc., recebe uma lista de empresas, e pode selecionar quais quer **importar como novos leads** (criando registros na tabela `leads` com `origem_lead = 'busca_cnpj'`, evitando duplicar CNPJs já cadastrados).

Trate erros de saldo insuficiente ou rate limit dessa API com mensagens claras na interface.

### 6.6 Dashboard simples
Contagem de leads por status e por responsável, útil para a EJ acompanhar o funil. Não precisa ser sofisticado no MVP — um resumo numérico e talvez um gráfico simples já resolve.

---

## 7. Restrições explícitas — o que NÃO fazer

- **Não implementar automação de envio real (sem intervenção humana) para Instagram ou LinkedIn.** Não há API pública legítima para cold DM automatizada nessas plataformas; qualquer tentativa de simular o app viola os termos de uso e arrisca banimento de conta. O sistema deve **preparar** a mensagem e abrir o link, mas o clique de enviar é sempre humano.
- **Exceção deliberada: e-mail.** Diferente de Instagram/LinkedIn/WhatsApp, o envio de e-mail via provedor transacional (Resend/SendGrid/SES) **deve, sim, ser automático com um clique** — é o canal com menor risco de bloqueio/spam quando usado para leads individuais (não disparo em massa), e por isso está dentro do escopo do MVP.
- **Não fazer scraping do LinkedIn.**
- **Não implementar disparo de ligações automáticas (robocall)** neste MVP.
- **Não usar bibliotecas não-oficiais de automação do WhatsApp** (tipo simular o WhatsApp Web) neste MVP — usar apenas o link oficial `wa.me`. Se no futuro quiserem envio em massa via WhatsApp, isso é uma decisão separada que exige WhatsApp Business API oficial com templates aprovados pela Meta — não implemente isso agora, apenas deixe um comentário no código indicando onde essa integração entraria futuramente.

---

## 8. Entregáveis esperados

1. Estrutura de pastas do monorepo (ou dois projetos separados — bot e web — decida e justifique).
2. SQL de criação das tabelas + policies de RLS.
3. Bot do Telegram funcional com os fluxos da seção 5.
4. Sistema Web funcional com os fluxos da seção 6.
5. README com instruções de setup (variáveis de ambiente, como rodar localmente, como fazer deploy).
6. Ao final, uma lista do que ficou como "próximos passos" (ex: integração oficial com a WhatsApp Business API para campanhas em maior escala, disparo de sequências de e-mail com follow-up automático, etc.) para a EJ evoluir depois do MVP.

---

## 9. Como quero que você trabalhe

- Pense e planeje antes de codar — mostre o plano (pastas + schema) primeiro e espere eu confirmar (ou ajuste automaticamente se eu disser "pode seguir").
- Vá por etapas: banco → bot → web. Não tente entregar tudo de uma vez em um único bloco gigante.
- Sempre que uma decisão for ambígua (ex: nome de variável, estrutura exata de uma tela), tome a decisão mais simples e razoável e **avise que tomou essa decisão**, em vez de me perguntar para tudo.
- Se algo desta especificação for tecnicamente inviável ou tiver uma alternativa melhor, me avise antes de implementar do jeito que pedi.
