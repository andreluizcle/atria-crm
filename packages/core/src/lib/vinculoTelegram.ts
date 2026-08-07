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
 *
 * FORMATO DO TOKEN — e aqui que mora a pegadinha:
 *
 * O Telegram e restritivo com o parametro `start` do deep link. A documentacao
 * (Bot API > Deep Linking) diz: "A-Z, a-z, 0-9, _ and - are allowed" e "The
 * parameter can be up to 64 characters long".
 *
 * A primeira versao deste arquivo montava `uuid.expiracao.assinatura`, que da 94
 * caracteres E contem pontos. O cliente do Telegram descartava o payload em
 * silencio: o bot recebia um /start pelado e nenhum vinculo jamais acontecia.
 *
 * Por isso empacotamos em binario e serializamos em base64url, que por definicao
 * so produz [A-Za-z0-9_-] e dispensa separador:
 *
 *   16 bytes  uuid do usuario, sem os hifens
 *    4 bytes  expiracao em segundos desde a epoch (uint32 — vale ate 2106)
 *   16 bytes  HMAC-SHA256 do corpo, truncado em 128 bits
 *   --------
 *   36 bytes -> 48 caracteres em base64url, dentro do limite com folga.
 *
 * Truncar o HMAC em 128 bits e seguro de sobra para um token de 15 minutos.
 */

const VALIDADE_MINUTOS = 15;

const BYTES_UUID = 16;
const BYTES_EXPIRACAO = 4;
const BYTES_ASSINATURA = 16;
const BYTES_CORPO = BYTES_UUID + BYTES_EXPIRACAO;
const BYTES_TOKEN = BYTES_CORPO + BYTES_ASSINATURA;

export function gerarTokenVinculo(usuarioId: string): string {
  const corpo = Buffer.alloc(BYTES_CORPO);

  Buffer.from(usuarioId.replace(/-/g, ''), 'hex').copy(corpo, 0);
  corpo.writeUInt32BE(Math.floor(Date.now() / 1000) + VALIDADE_MINUTOS * 60, BYTES_UUID);

  return Buffer.concat([corpo, assinar(corpo)]).toString('base64url');
}

export interface VinculoValidado {
  usuarioId: string;
}

/** Lanca ErroDeNegocio com motivo legivel se o token for invalido ou vencido. */
export function validarTokenVinculo(token: string): VinculoValidado {
  // Buffer.from nao lanca em entrada invalida — ele decodifica o que conseguir e
  // ignora o resto. Quem barra lixo aqui e o comprimento, nao o parser.
  const bruto = Buffer.from(token, 'base64url');

  if (bruto.length !== BYTES_TOKEN) {
    throw new ErroDeNegocio('Link de vínculo inválido. Gere um novo no painel.');
  }

  const corpo = bruto.subarray(0, BYTES_CORPO);
  const assinatura = bruto.subarray(BYTES_CORPO);

  if (!assinaturaConfere(corpo, assinatura)) {
    throw new ErroDeNegocio('Link de vínculo inválido. Gere um novo no painel.');
  }

  // A expiracao so e checada depois da assinatura: sem isso, daria para saber se
  // um token forjado "expirou" ou nao, o que vaza informacao a toa.
  const expiraEm = corpo.readUInt32BE(BYTES_UUID);
  if (expiraEm * 1000 < Date.now()) {
    throw new ErroDeNegocio('Este link de vínculo expirou. Gere um novo no painel.');
  }

  return { usuarioId: formatarUuid(corpo.subarray(0, BYTES_UUID)) };
}

function assinar(corpo: Buffer): Buffer {
  // Reaproveita o segredo do webhook: e um valor que ja precisa existir e que
  // nunca sai do servidor.
  return createHmac('sha256', requerEnv('TELEGRAM_WEBHOOK_SECRET'))
    .update(corpo)
    .digest()
    .subarray(0, BYTES_ASSINATURA);
}

function assinaturaConfere(corpo: Buffer, recebida: Buffer): boolean {
  const esperada = assinar(corpo);

  // Comprimentos diferentes fazem timingSafeEqual lancar; comparamos antes.
  if (esperada.length !== recebida.length) return false;
  return timingSafeEqual(esperada, recebida);
}

function formatarUuid(bytes: Buffer): string {
  const hex = bytes.toString('hex');

  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}
