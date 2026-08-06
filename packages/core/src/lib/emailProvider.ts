import { Resend } from 'resend';
import { emailConfigurado, requerEnv } from './env';
import { ErroDeIntegracao, ErroDeNegocio, registrarErro } from './erros';

/**
 * Envio transacional de e-mail.
 *
 * Este e o UNICO canal com envio automatico de verdade (spec 7): WhatsApp,
 * Instagram e LinkedIn so preparam a mensagem para um humano clicar em enviar.
 *
 * A interface existe para trocar Resend por SendGrid/SES sem tocar nos services:
 * basta escrever outra implementacao de `ProvedorDeEmail` e devolve-la em
 * `obterProvedorDeEmail()`.
 */

export interface EmailParaEnviar {
  para: string;
  assunto: string;
  /** Texto puro. Convertemos para HTML preservando as quebras de linha. */
  conteudo: string;
  responderPara?: string;
}

export interface ProvedorDeEmail {
  readonly nome: string;
  enviar(email: EmailParaEnviar): Promise<{ id: string }>;
}

class ProvedorResend implements ProvedorDeEmail {
  readonly nome = 'Resend';
  private cliente: Resend | null = null;

  private obterCliente(): Resend {
    this.cliente ??= new Resend(requerEnv('RESEND_API_KEY'));
    return this.cliente;
  }

  async enviar(email: EmailParaEnviar): Promise<{ id: string }> {
    const { data, error } = await this.obterCliente().emails.send({
      from: requerEnv('EMAIL_REMETENTE'),
      to: [email.para],
      subject: email.assunto,
      text: email.conteudo,
      html: textoParaHtml(email.conteudo),
      ...(email.responderPara ? { replyTo: email.responderPara } : {}),
    });

    if (error) {
      registrarErro('emailProvider.enviar', error);
      throw new ErroDeIntegracao('o Resend', error.message || 'O provedor recusou o envio.');
    }

    if (!data?.id) {
      throw new ErroDeIntegracao('o Resend', 'O provedor não confirmou o envio.');
    }

    return { id: data.id };
  }
}

/**
 * Usado quando RESEND_API_KEY nao esta definida. Nao envia nada: registra no log
 * e falha com uma mensagem clara, para ninguem achar que o e-mail saiu.
 */
class ProvedorNaoConfigurado implements ProvedorDeEmail {
  readonly nome = 'nenhum provedor';

  async enviar(email: EmailParaEnviar): Promise<{ id: string }> {
    registrarErro(
      'emailProvider',
      `Tentativa de enviar para ${email.para} sem provedor configurado (falta RESEND_API_KEY / EMAIL_REMETENTE).`,
    );
    throw new ErroDeNegocio(
      'O envio de e-mail ainda não está configurado. Defina RESEND_API_KEY e EMAIL_REMETENTE para habilitar.',
    );
  }
}

let provedorCache: ProvedorDeEmail | null = null;

export function obterProvedorDeEmail(): ProvedorDeEmail {
  provedorCache ??= emailConfigurado() ? new ProvedorResend() : new ProvedorNaoConfigurado();
  return provedorCache;
}

function textoParaHtml(texto: string): string {
  const escapado = texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#111">${escapado.replace(
    /\n/g,
    '<br>',
  )}</div>`;
}
