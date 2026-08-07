import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_NOME_USUARIO,
  garantirNomeUsuarioValido,
  validarNomeUsuario,
} from '../src/validacao/usuarioValidacao';

/**
 * O nome do membro e o `{{responsavel}}` das mensagens enviadas ao lead, entao
 * nome vazio nao e so feio: sai no e-mail e quebra a saudacao do dashboard, que
 * faz `nome.split(' ')[0]`. A coluna e `not null` mas nao tem CHECK, entao a
 * regra so existe aqui.
 */

describe('validarNomeUsuario', () => {
  it('aceita um nome normal', () => {
    assert.equal(validarNomeUsuario('André Oliveira').valido, true);
  });

  it('recusa vazio e so espacos', () => {
    for (const entrada of ['', '   ', '\n\t']) {
      const { valido, erros } = validarNomeUsuario(entrada);

      assert.equal(valido, false, `deveria recusar ${JSON.stringify(entrada)}`);
      assert.ok(erros.some((e) => e.campo === 'nome'));
    }
  });

  it('recusa uma letra so', () => {
    assert.equal(validarNomeUsuario('A').valido, false);
  });

  it('aceita duas letras', () => {
    assert.equal(validarNomeUsuario('Ana').valido, true);
    assert.equal(validarNomeUsuario('Bo').valido, true);
  });

  it('conta o tamanho depois de aparar os espacos', () => {
    // 'A' + espacos passaria se o trim nao rodasse antes da contagem.
    assert.equal(validarNomeUsuario('A          ').valido, false);
    assert.equal(validarNomeUsuario('  Ana  ').valido, true);
  });

  it('recusa nome longo demais', () => {
    assert.equal(validarNomeUsuario('a'.repeat(MAX_NOME_USUARIO)).valido, true);
    assert.equal(validarNomeUsuario('a'.repeat(MAX_NOME_USUARIO + 1)).valido, false);
  });
});

describe('garantirNomeUsuarioValido', () => {
  it('devolve o nome ja aparado', () => {
    assert.equal(garantirNomeUsuarioValido('  André Oliveira  '), 'André Oliveira');
  });

  it('lanca com mensagem legivel e o campo marcado', () => {
    assert.throws(
      () => garantirNomeUsuarioValido(' '),
      (erro: unknown) => {
        assert.ok(erro instanceof Error);
        assert.match(erro.message, /pelo menos/);
        assert.deepEqual((erro as { campos?: string[] }).campos, ['nome']);
        return true;
      },
    );
  });
});
