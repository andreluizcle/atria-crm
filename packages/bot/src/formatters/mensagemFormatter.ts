import { EMOJI_PLATAFORMA, ROTULO_PLATAFORMA, type DisparoPreparado, type MensagemPronta } from '@atria/core';
import { escaparHtml } from './leadFormatter';

/** Rotulo do template no menu de escolha do bot. */
export function rotuloDoTemplate(mensagem: MensagemPronta): string {
  const titulo = mensagem.titulo.length > 28 ? `${mensagem.titulo.slice(0, 27)}…` : mensagem.titulo;
  return `${EMOJI_PLATAFORMA[mensagem.plataforma]} ${titulo}`;
}

/**
 * Texto entregue ao membro no chat.
 *
 * Para Instagram e LinkedIn, a mensagem vai em bloco <code>: no Telegram, um
 * toque nela copia tudo. E o mais perto de "pre-preencher" que da para chegar
 * nessas plataformas sem violar os termos de uso (spec 5.3 e 7).
 */
export function formatarDisparo(disparo: DisparoPreparado, nomeDoLead: string): string {
  const cabecalho = `${EMOJI_PLATAFORMA[disparo.plataforma]} <b>${ROTULO_PLATAFORMA[disparo.plataforma]}</b> — ${escaparHtml(nomeDoLead)}`;

  if (disparo.acao === 'copiar_e_abrir') {
    return [
      cabecalho,
      '',
      `<code>${escaparHtml(disparo.conteudo)}</code>`,
      '',
      `<i>👆 Toque na mensagem para copiar.</i>`,
      disparo.instrucao,
    ].join('\n');
  }

  if (disparo.acao === 'envio_automatico') {
    return [
      cabecalho,
      '',
      `<b>Assunto:</b> ${escaparHtml(disparo.assunto ?? '')}`,
      '',
      escaparHtml(disparo.conteudo),
      '',
      `⚠️ ${disparo.instrucao}`,
    ].join('\n');
  }

  return [cabecalho, '', escaparHtml(disparo.conteudo), '', disparo.instrucao].join('\n');
}
