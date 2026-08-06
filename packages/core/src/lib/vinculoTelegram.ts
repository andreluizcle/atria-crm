import { createHmac, timingSafeEqual } from 'node:crypto';
import { requerEnv } from './env';
import { ErroDeNegocio } from './erros';

/**
 * Vinculo entre um membro da EJ e a conta dele no Telegram.
 *
 * O problema: o bot precisa saber quem esta falando com ele, mas qualquer pessoa
 * pode mandar mensagem para um bot publico. Deixar o membro digitar o proprio
 * e-mail nao serve — alguem de fora que descobrisse um e-mail da EJ se passaria
 * por ele e cadastraria leads em nome de outra pessoa.
 *
 * A solucao: o painel web (onde a pessoa JA esta autenticada no Supabase Auth)
 * gera um token assinado com HMAC e monta um deep link
 * `https://t.me/<bot>?start=<token>`. O bot valida a assinatura e so entao grava
 * o telegram_user_id. Nenhuma coluna nova, nenhum codigo guardado no banco.
 */

const VALIDADE_MINUTOS = 15;

export function gerarTokenVinculo(usuarioId: string): string {
  const expiraEm = Date.now() + VALIDADE_MINUTOS * 60_000;
  const corpo = `${usuarioId}.${expiraEm}`;

  return `${corpo}.${assinar(corpo)}`;
}

export interface VinculoValidado {
  usuarioId: string;
}

/** Lanca ErroDeNegocio com motivo legivel se o token for invalido ou vencido. */
export function validarTokenVinculo(token: string): VinculoValidado {
  const partes = token.split('.');
  if (partes.length !== 3) {
    throw new ErroDeNegocio('Link de vínculo inválido. Gere um novo no painel.');
  }

  const [usuarioId, expiraEmTexto, assinatura] = partes as [string, string, string];
  const corpo = `${usuarioId}.${expiraEmTexto}`;

  if (!assinaturaConfere(corpo, assinatura)) {
    throw new ErroDeNegocio('Link de vínculo inválido. Gere um novo no painel.');
  }

  const expiraEm = Number(expiraEmTexto);
  if (!Number.isFinite(expiraEm) || expiraEm < Date.now()) {
    throw new ErroDeNegocio('Este link de vínculo expirou. Gere um novo no painel.');
  }

  return { usuarioId };
}

function assinar(corpo: string): string {
  // Reaproveita o segredo do webhook: e um valor que ja precisa existir e que
  // nunca sai do servidor.
  return createHmac('sha256', requerEnv('TELEGRAM_WEBHOOK_SECRET')).update(corpo).digest('base64url');
}

function assinaturaConfere(corpo: string, recebida: string): boolean {
  const esperada = assinar(corpo);
  const bufEsperada = Buffer.from(esperada);
  const bufRecebida = Buffer.from(recebida);

  // Comprimentos diferentes fazem timingSafeEqual lancar; comparamos antes.
  if (bufEsperada.length !== bufRecebida.length) return false;
  return timingSafeEqual(bufEsperada, bufRecebida);
}
