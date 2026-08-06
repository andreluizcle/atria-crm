import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { montarClausulasDeBusca } from '../src/repositories/leadRepository';

/**
 * A busca livre da lista de leads monta um filtro `or()` do PostgREST.
 *
 * O que estes testes protegem: a coluna `cnpj` guarda so digitos, entao um CNPJ
 * formatado precisa de uma clausula extra — SEM alterar as tres clausulas
 * originais, que a lista inteira de leads depende.
 */

describe('montarClausulasDeBusca', () => {
  it('mantem as tres clausulas originais para uma busca por nome', () => {
    // Trava de regressao: este era o filtro inteiro antes da correcao.
    assert.deepEqual(montarClausulasDeBusca('padaria'), [
      'nome.ilike.%padaria%',
      'email.ilike.%padaria%',
      'cnpj.ilike.%padaria%',
    ]);
  });

  it('acrescenta a busca por digitos quando o CNPJ vem formatado', () => {
    const clausulas = montarClausulasDeBusca('33.000.167/0001-01');

    assert.equal(clausulas.length, 4);
    assert.equal(clausulas[3], 'cnpj.ilike.%33000167000101%');
    // as tres primeiras continuam usando o termo cru
    assert.equal(clausulas[0], 'nome.ilike.%33.000.167/0001-01%');
  });

  it('nao duplica a clausula quando o CNPJ ja vem so com digitos', () => {
    const clausulas = montarClausulasDeBusca('33000167000101');

    assert.equal(clausulas.length, 3, 'a terceira clausula ja cobre esse caso');
  });

  it('aceita CNPJ parcial formatado', () => {
    const clausulas = montarClausulasDeBusca('33.000.167');

    assert.equal(clausulas.length, 4);
    assert.equal(clausulas[3], 'cnpj.ilike.%33000167%');
  });

  it('nao transforma nome com numero em busca de CNPJ', () => {
    // "Padaria 24h" tem digitos, mas poucos — nao e tentativa de CNPJ.
    assert.equal(montarClausulasDeBusca('Padaria 24h').length, 3);
    assert.equal(montarClausulasDeBusca('Loja 100').length, 3);
  });

  it('ignora espacos em volta e devolve vazio para termo em branco', () => {
    assert.deepEqual(montarClausulasDeBusca('   '), []);
    assert.equal(montarClausulasDeBusca('  padaria  ')[0], 'nome.ilike.%padaria%');
  });
});
