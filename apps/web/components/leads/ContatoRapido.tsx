'use client';

import { useState, useTransition } from 'react';
import { EMOJI_PLATAFORMA, ROTULO_PLATAFORMA, type MensagemPronta } from '@atria/core/cliente';
import { enviarEmailAction, prepararDisparoAction } from '@/actions/envioActions';
import { Aviso } from '@/components/ui/Aviso';

/**
 * Botao de contato rapido por canal (spec 6.4).
 *
 * O comportamento por plataforma segue a mesma regra do bot:
 *   - WhatsApp   -> abre wa.me com o texto ja preenchido
 *   - IG/LinkedIn-> copia a mensagem para a area de transferencia e abre o perfil
 *   - E-mail     -> envia de verdade, com um clique, sem mailto e sem abrir cliente
 */
export function ContatoRapido({
  leadId,
  nomeDoLead,
  templates,
}: {
  leadId: string;
  nomeDoLead: string;
  templates: MensagemPronta[];
}) {
  const [pendente, iniciarTransicao] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro' | 'info'; texto: string } | null>(null);
  const [emailEmConfirmacao, setEmailEmConfirmacao] = useState<MensagemPronta | null>(null);

  if (templates.length === 0) {
    return (
      <Aviso tipo="info">
        Nenhum template ativo para os canais deste lead. Crie um em <strong>Mensagens</strong>.
      </Aviso>
    );
  }

  function dispararManual(template: MensagemPronta) {
    iniciarTransicao(async () => {
      const resultado = await prepararDisparoAction(leadId, template.id);

      if (!resultado.ok) {
        setAviso({ tipo: 'erro', texto: resultado.erro });
        return;
      }

      const { disparo } = resultado;

      if (disparo.acao === 'copiar_e_abrir') {
        // O clipboard so funciona em contexto seguro (https ou localhost).
        // Se falhar, mostramos o texto para o membro copiar na mao.
        try {
          await navigator.clipboard.writeText(disparo.conteudo);
          setAviso({
            tipo: 'sucesso',
            texto: `Mensagem copiada. Cole na conversa do ${ROTULO_PLATAFORMA[disparo.plataforma]} que abriu.`,
          });
        } catch {
          setAviso({ tipo: 'info', texto: `Copie manualmente:\n\n${disparo.conteudo}` });
        }
      }

      if (disparo.url) window.open(disparo.url, '_blank', 'noopener,noreferrer');

      if (disparo.acao === 'abrir_link') {
        setAviso({ tipo: 'sucesso', texto: 'WhatsApp aberto com a mensagem já escrita. Revise e envie.' });
      }
    });
  }

  function enviarEmail(template: MensagemPronta) {
    iniciarTransicao(async () => {
      const resultado = await enviarEmailAction(leadId, template.id);

      setAviso(
        resultado.ok
          ? { tipo: 'sucesso', texto: resultado.mensagem ?? 'E-mail enviado.' }
          : { tipo: 'erro', texto: resultado.erro },
      );
      setEmailEmConfirmacao(null);
    });
  }

  return (
    <div className="space-y-3">
      {aviso ? (
        <Aviso tipo={aviso.tipo}>
          <span className="whitespace-pre-wrap">{aviso.texto}</span>
        </Aviso>
      ) : null}

      {emailEmConfirmacao ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            Enviar &ldquo;{emailEmConfirmacao.titulo}&rdquo; para {nomeDoLead}?
          </p>
          <p className="mt-1 text-xs text-amber-800">
            O e-mail sai de verdade agora, direto pelo provedor. Não dá para desfazer.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              className="botao-primario"
              disabled={pendente}
              onClick={() => enviarEmail(emailEmConfirmacao)}
            >
              {pendente ? 'Enviando...' : 'Enviar agora'}
            </button>
            <button className="botao-secundario" onClick={() => setEmailEmConfirmacao(null)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {templates.map((template) => (
          <button
            key={template.id}
            disabled={pendente}
            className="botao-secundario"
            onClick={() =>
              template.plataforma === 'email'
                ? setEmailEmConfirmacao(template)
                : dispararManual(template)
            }
          >
            <span>{EMOJI_PLATAFORMA[template.plataforma]}</span>
            {template.titulo}
          </button>
        ))}
      </div>
    </div>
  );
}
