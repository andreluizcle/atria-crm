import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { USER_AGENT, cabecalhosPadrao } from '../src/lib/http';

/**
 * Este teste existe por causa de um bug real: sem User-Agent proprio, o `fetch`
 * do Node manda `user-agent: node`, o Cloudflare da BrasilAPI responde 403 e
 * TODA consulta de CNPJ falha — em dev e em producao.
 *
 * Nao batemos na BrasilAPI de verdade aqui: teste de rede fica intermitente.
 * Cobrimos o que quebrou, que e a montagem do cabecalho.
 */

describe('cabecalhosPadrao', () => {
  it('sempre manda um User-Agent', () => {
    assert.ok(cabecalhosPadrao()['user-agent']);
  });

  it('nao usa o User-Agent padrao do Node, que leva 403', () => {
    assert.notEqual(USER_AGENT, 'node');
    assert.notEqual(USER_AGENT.trim(), '');
  });

  it('identifica o projeto, que e o que a BrasilAPI espera', () => {
    assert.match(USER_AGENT, /atria-crm/);
  });

  it('manda accept: application/json por padrao', () => {
    assert.equal(cabecalhosPadrao()['accept'], 'application/json');
  });

  it('repassa cabecalhos especificos da integracao', () => {
    const cabecalhos = cabecalhosPadrao({
      'api-key': 'chave-secreta',
      'Content-Type': 'application/json',
    });

    assert.equal(cabecalhos['api-key'], 'chave-secreta');
    assert.equal(cabecalhos['Content-Type'], 'application/json');
  });

  it('mantem o User-Agent mesmo quando a integracao passa extras', () => {
    const cabecalhos = cabecalhosPadrao({ 'api-key': 'chave-secreta' });

    assert.equal(cabecalhos['user-agent'], USER_AGENT);
  });

  it('deixa a integracao sobrescrever o accept se precisar', () => {
    assert.equal(cabecalhosPadrao({ accept: 'text/csv' })['accept'], 'text/csv');
  });
});
