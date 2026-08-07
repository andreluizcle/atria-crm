import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// A chave do HMAC e lida por requerEnv na hora do uso, nao na carga do modulo,
// entao basta definir antes de chamar as funcoes.
process.env.TELEGRAM_WEBHOOK_SECRET ??= 'segredo-de-teste-nao-usar-em-producao';

const { gerarTokenVinculo, validarTokenVinculo } = await import('../src/lib/vinculoTelegram');

/**
 * O deep link do Telegram (`https://t.me/<bot>?start=<token>`) e restritivo:
 * "A-Z, a-z, 0-9, _ and - are allowed" e no maximo 64 caracteres.
 *
 * A primeira versao gerava `uuid.expiracao.assinatura` — 94 caracteres, com
 * pontos. O Telegram descartava o payload em silencio e NENHUM vinculo
 * funcionava. Os dois primeiros testes existem para isso nunca voltar.
 */

const USUARIO = 'a3bc297b-1afc-4433-8926-92f4b5318819';

/** Roda `acao` como se o relogio estivesse deslocado em `minutos`. */
function comRelogioDeslocado<T>(minutos: number, acao: () => T): T {
  const original = Date.now;
  Date.now = () => original() + minutos * 60_000;

  try {
    return acao();
  } finally {
    Date.now = original;
  }
}

describe('gerarTokenVinculo — limites do deep link do Telegram', () => {
  it('cabe no limite de 64 caracteres', () => {
    const token = gerarTokenVinculo(USUARIO);

    assert.ok(
      token.length <= 64,
      `token tem ${token.length} caracteres; o Telegram aceita no maximo 64`,
    );
  });

  it('usa apenas os caracteres que o Telegram permite', () => {
    const token = gerarTokenVinculo(USUARIO);

    assert.match(token, /^[A-Za-z0-9_-]+$/);
    assert.ok(!token.includes('.'), 'ponto nao e aceito no parametro start');
  });
});

describe('validarTokenVinculo', () => {
  it('devolve o mesmo usuario que gerou o token', () => {
    const token = gerarTokenVinculo(USUARIO);

    assert.deepEqual(validarTokenVinculo(token), { usuarioId: USUARIO });
  });

  it('remonta o UUID no formato canonico, com hifens', () => {
    const { usuarioId } = validarTokenVinculo(gerarTokenVinculo(USUARIO));

    assert.match(usuarioId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('aceita um token gerado ha pouco', () => {
    const token = comRelogioDeslocado(-14, () => gerarTokenVinculo(USUARIO));

    assert.deepEqual(validarTokenVinculo(token), { usuarioId: USUARIO });
  });

  it('recusa um token vencido', () => {
    const token = comRelogioDeslocado(-16, () => gerarTokenVinculo(USUARIO));

    assert.throws(() => validarTokenVinculo(token), /expirou/);
  });

  it('recusa assinatura adulterada', () => {
    const bytes = Buffer.from(gerarTokenVinculo(USUARIO), 'base64url');
    bytes[bytes.length - 1] ^= 0xff; // vira o ultimo byte da assinatura

    assert.throws(() => validarTokenVinculo(bytes.toString('base64url')), /inválido/);
  });

  it('recusa corpo adulterado, mesmo mantendo a assinatura', () => {
    // Trocar o usuario sem saber o segredo nao pode passar — e a razao de o
    // token ser assinado.
    const bytes = Buffer.from(gerarTokenVinculo(USUARIO), 'base64url');
    bytes[0] ^= 0xff;

    assert.throws(() => validarTokenVinculo(bytes.toString('base64url')), /inválido/);
  });

  it('recusa lixo, vazio e token truncado sem estourar excecao crua', () => {
    const completo = gerarTokenVinculo(USUARIO);

    for (const entrada of ['', 'nao-e-um-token', completo.slice(0, 20), completo + 'AAAA']) {
      assert.throws(() => validarTokenVinculo(entrada), /inválido/, `entrada: ${JSON.stringify(entrada)}`);
    }
  });
});
