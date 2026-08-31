# Configurar o envio automático de e-mail

O e-mail é o **único canal do sistema com envio automático de verdade**. WhatsApp,
Instagram e LinkedIn só montam a mensagem e abrem o link — quem clica em enviar é
uma pessoa. Por isso este é o único canal que precisa de configuração externa.

O código já está pronto. Não há nada a programar aqui: o que falta são **duas
variáveis de ambiente** e, para prospectar de verdade, **um domínio verificado**.

| Variável | O que é | Onde pegar |
|---|---|---|
| `RESEND_API_KEY` | Chave da conta do Resend | resend.com → API Keys |
| `EMAIL_REMETENTE` | O que aparece no **De:** do e-mail | você escolhe — mas o domínio precisa estar verificado |

Se qualquer uma das duas faltar, o sistema **não envia** e mostra "O envio de
e-mail ainda não está configurado". Isso é proposital: um envio que falha calado
é pior do que um erro na tela.

> ⚠️ **Limite do plano gratuito: 100 e-mails por DIA** (e 3.000 por mês, até 3
> domínios). O teto diário é o que aparece primeiro numa prospecção em lote —
> saiba disso antes de prometer volume para a diretoria. Ao estourar, o disparo
> falha e vira uma linha `falhou` em `historico_contatos`, com o motivo.

---

## Parte 1 — Rodar em modo de teste (10 minutos, sem depender de ninguém)

Serve para provar que o fluxo funciona ponta a ponta antes de mexer com DNS.

1. Criar conta em [resend.com](https://resend.com) e gerar uma **API key**.
2. Preencher no `.env.local`, na raiz do projeto:

   ```
   RESEND_API_KEY=re_...
   EMAIL_REMETENTE=Atria EJ <onboarding@resend.dev>
   ```

3. Disparar um template de e-mail para um lead de teste.

> ⚠️ **O limite do modo de teste.** Com `onboarding@resend.dev`, o Resend **só
> entrega para o e-mail dono da conta**. Qualquer outro destinatário volta com
> erro 403 e a mensagem *"You can only send testing emails to your own email
> address"*. Ou seja: o lead de teste precisa ter **o mesmo e-mail com que a
> conta do Resend foi criada**.
>
> Isso valida o sistema. **Não serve para prospectar.**

---

## De quem é a conta do Resend (resolver antes do primeiro envio)

A conta que verifica o domínio é dona da chave de API e da reputação de envio.
Numa EJ, onde a gestão troca todo ano, isso **não pode ficar numa conta pessoal**.

O Resend tem **Domain Claim** para mover um domínio entre times, mas com uma
pegadinha de ordem — da doc oficial:

> "If the original account has recent sending activity with the domain in
> question, you will need to contact support to release the domain."

Traduzindo: mover **antes** do primeiro disparo é um clique; **depois** vira
ticket de suporte. Então a hora de arrumar é agora.

**Decisão tomada:** a conta do Resend da Atria é institucional, criada com um
endereço `@atriajr.com.br` — não a conta pessoal de ninguém. Ao criar ou trocar,
use um alias que sobreviva à troca de gestão (`contato@`, `ti@`), nunca o e-mail
nominal de um membro.

Para dar acesso a mais gente, convide como **Admin** ou **Member** em Settings →
Team. *Admin* convida pessoas, mexe em pagamento e pode deletar o time; *Member*
só mexe em e-mails, domínios e webhooks.

⚠️ Se algum dia a conta precisar mudar, faça **antes** de disparar — depois de
haver envios, o Domain Claim exige abrir ticket no suporte.

### Limites do plano gratuito

| Limite | Valor |
|---|---|
| E-mails por mês | 3.000 |
| **E-mails por dia** | **100** |
| Domínios | 3 |

O teto diário é o que aparece primeiro numa prospecção em lote — vale saber
antes de prometer volume para a diretoria.

---

## Parte 2 — Verificar o domínio (é o que destrava a prospecção real)

### O que é o "domínio", em uma frase

É a parte **depois do @**. Em `prospeccao@atriajr.com.br`, o domínio é
`atriajr.com.br`.

O Resend não deixa ninguém mandar e-mail dizendo ser `@qualquercoisa.com.br` —
senão qualquer um se passaria pelo banco de qualquer pessoa. Então ele exige que
você **prove que o domínio é seu**, e a prova é criar uns registros no DNS do
domínio.

Três confusões comuns:

- **Domínio não é site.** Não precisa existir site nenhum. Precisa existir o
  domínio registrado e alguém com acesso ao painel de DNS dele.
- **Não precisa existir uma caixa de entrada** em `prospeccao@...`. O sistema põe
  o **reply-to no e-mail de quem disparou** (`envioService.ts`), então a resposta
  do cliente cai na caixa pessoal do membro da EJ, não num endereço fantasma.
- **Não dá para usar um `@gmail.com`.** O Google não autoriza o Resend a assinar
  em nome dele. Tem que ser um domínio que a Atria controle.

### 2.1 — No painel do Resend

Domains → **Add Domain**. Duas escolhas importam:

- **Use um subdomínio**, ex. `envios.atriajr.com.br` — **não** o domínio raiz. É a
  recomendação da própria Resend, e a razão é prática: se um disparo for marcado
  como spam, quem perde reputação é o subdomínio de prospecção, não o e-mail
  institucional que a EJ usa no dia a dia.
- **Região**: a mais próxima dos destinatários.

Isso gera os registros na aba **Records**.

> Os valores **não existem antes desse passo**. O Resend gera um par de chaves
> DKIM único por domínio; ninguém consegue adiantar esses valores nem copiá-los
> de outro projeto. É por isso que a tabela abaixo está vazia.

### 2.2 — No GoDaddy (que é o nosso caso)

Conferido por consulta de DNS em `atriajr.com.br`:

| O quê | Situação real |
|---|---|
| Quem hospeda o DNS | **GoDaddy** (`ns81.domaincontrol.com` / `ns82.domaincontrol.com`) |
| Quem entrega o e-mail da EJ | **Google Workspace** (`aspmx.l.google.com` e companhia) — **não** é Microsoft 365 |
| SPF que já existe no domínio raiz | `v=spf1 include:_spf.google.com include:spf1.secureserver.net ~all` |

> 🚨 **Não use o assistente de e-mail do GoDaddy.** É ele que pergunta "Microsoft
> 365 / outro provedor", e ele **substitui o MX do domínio raiz** — o que derruba
> o Google Workspace e, com ele, o e-mail de toda a EJ. O caminho certo é o
> editor de DNS cru: **Add New Record**, escolhendo o tipo na mão.

**São três registros, não um.** Supondo o subdomínio `envios`:

| Tipo | Name (o GoDaddy completa o domínio sozinho) | Value | Prioridade |
|---|---|---|---|
| `TXT` | `resend._domainkey.envios` | o DKIM que o Resend mostrar | — |
| `TXT` | `send.envios` | o SPF que o Resend mostrar | — |
| `MX` | `send.envios` | o MX que o Resend mostrar | `10` |

Quatro detalhes que evitam retrabalho:

1. **Não digite o domínio no campo Name.** O GoDaddy anexa `.atriajr.com.br`
   sozinho. Digitar o nome completo cria `send.envios.atriajr.com.br.atriajr.com.br`,
   e a verificação nunca fecha.
2. **O MX do Resend não conflita com o Google.** Ele fica em `send.envios`, e um
   MX só afeta o nome onde está. Os cinco MX do Google no domínio raiz continuam
   intactos — não encoste neles.
3. **O SPF do raiz também não muda.** O SPF do Resend é um registro novo, em
   `send.envios`. Não tente mesclar com o `v=spf1` que já existe: além de
   desnecessário, cada `include:` consome uma das 10 consultas que o SPF permite.
4. Se o GoDaddy reclamar da prioridade `10` por já estar em uso, use `20`.

**Atalho:** o Resend tem um botão **Auto Configure** para GoDaddy (via Domain
Connect) que cria os três registros sozinho, depois que você autoriza o acesso ao
DNS. É o caminho mais seguro, porque não passa perto do MX do raiz.

Ele **não** substitui dois passos: o domínio já precisa ter sido adicionado no
Resend (é o "Add Domain" que gera as chaves), e o **DMARC continua manual**, como
passo pós-verificação.

### 2.3 — Se outra pessoa for mexer no DNS

Preencha a tabela com o que aparece na aba *Records* e mande o bloco abaixo para
a pessoa que tem acesso ao DNS do domínio.

---

> **Pedido: liberar envio de e-mail para o subdomínio `envios.atriajr.com.br`**
>
> Oi! Estamos ligando o envio de e-mails de prospecção da Atria e precisamos
> autorizar o serviço (Resend) a enviar em nome de um **subdomínio** nosso. Para
> isso preciso que sejam criados estes registros no DNS de `atriajr.com.br`:
>
> | Tipo | Nome (host) | Valor | Prioridade |
> |---|---|---|---|
> | TXT |  |  | — |
> | TXT |  |  | — |
> | MX  |  |  |  |
>
> Três observações que costumam gerar ida e volta:
>
> 1. **O registro MX é do subdomínio de envio**, não do domínio raiz. Ele **não
>    substitui e não conflita** com o MX do e-mail institucional (Google
>    Workspace/Outlook) — os e-mails da equipe continuam funcionando igual.
> 2. **Colar os valores exatamente como estão**, sem editar. Atenção ao campo
>    *Nome*: alguns painéis completam o domínio sozinhos e outros não — se o
>    painel já mostra `.atriajr.com.br` no fim, não repita.
> 3. Depois de criado, a verificação costuma sair em **~15 minutos**, mas o DNS
>    pode levar até 72h para propagar.
>
> Qualquer dúvida me chama. Obrigado!

---

### 2.4 — Depois de verificar

1. Confirmar o status **Verified** no painel do Resend.
2. Adicionar o registro **DMARC** — a Resend recomenda como passo pós-verificação;
   ele reduz a chance de os e-mails caírem em spam. Conferido por consulta de DNS:
   **o domínio raiz não tem DMARC nenhum hoje**, então criar `_dmarc.envios` é um
   registro novo, que não herda nem conflita com nada.
3. Trocar o remetente. É **uma variável, em dois lugares** — esquecer o segundo é
   o erro mais comum:

| Onde | Valor |
|---|---|
| `.env.local` (local) | `EMAIL_REMETENTE=Atria EJ <prospeccao@envios.atriajr.com.br>` |
| Vercel → Settings → Environment Variables | o mesmo, marcando **Production** e **Preview** |

Na Vercel, **redeploy depois** — variável nova só vale no próximo deploy. Ver
`DEPLOY.md`, seção "Mudou alguma configuração? Precisa redeployar".

Nenhuma linha de código muda.

---

## Como saber se funcionou

| O quê | Como conferir |
|---|---|
| O envio saiu | O e-mail chega na caixa do destinatário |
| O remetente está certo | O **De:** mostra o endereço do domínio da Atria |
| O reply-to está certo | Responder o e-mail cai na caixa de **quem disparou**, não num endereço genérico |
| O histórico gravou | A tabela `historico_contatos` tem uma linha com `status_envio = 'enviado'` |
| Saiu do modo de teste | Um disparo para um endereço que **não** é o dono da conta do Resend chega normalmente |

Se algo falhar, o sistema grava a linha com `status_envio = 'falhou'` e o motivo
— um envio que falha não some do histórico, de propósito.

---

## Onde isso está no código

| Arquivo | Responsabilidade |
|---|---|
| `packages/core/src/lib/emailProvider.ts` | Fala com o Resend; a interface `ProvedorDeEmail` existe para trocar de provedor sem tocar nos services |
| `packages/core/src/lib/env.ts` | `emailConfigurado()` decide se envia de verdade ou recusa com mensagem clara |
| `packages/core/src/services/envioService.ts` | `enviarEmailParaLead()` — envia, define o reply-to e grava o histórico nos dois desfechos |
| `.env.example` | O modelo das variáveis |
