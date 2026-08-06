import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatarCnpj, limparCnpj, validarCnpj } from '../src/validacao/cnpj';
import { formatarTelefone, paraFormatoWhatsApp, validarTelefone } from '../src/validacao/telefone';
import { normalizarInstagram, normalizarLinkedin, normalizarUrl, validarEmail } from '../src/validacao/formatos';
import { contextoDoLead, interpolar, variaveisInvalidas } from '../src/validacao/interpolar';
import { canaisDisponiveis, normalizarCamposDoLead, validarNovoLead } from '../src/validacao/leadValidacao';
import { LEAD_DE_EXEMPLO } from '../src/services/mensagemService';
import type { Lead } from '../src/types/lead';

describe('cnpj', () => {
  it('aceita um CNPJ real com digitos verificadores corretos', () => {
    assert.equal(validarCnpj('33.000.167/0001-01'), true);
  });

  it('rejeita CNPJ com digito verificador errado', () => {
    assert.equal(validarCnpj('33000167000102'), false);
  });

  it('rejeita sequencias repetidas que passariam na conta', () => {
    assert.equal(validarCnpj('11111111111111'), false);
  });

  it('rejeita comprimento diferente de 14', () => {
    assert.equal(validarCnpj('3300016700010'), false);
  });

  it('limpa e formata', () => {
    assert.equal(limparCnpj('33.000.167/0001-01'), '33000167000101');
    assert.equal(formatarCnpj('33000167000101'), '33.000.167/0001-01');
  });
});

describe('telefone', () => {
  it('aceita celular com DDD', () => {
    assert.equal(validarTelefone('(11) 91234-5678'), true);
  });

  it('aceita fixo com DDD', () => {
    assert.equal(validarTelefone('1132145678'), true);
  });

  it('rejeita letras', () => {
    assert.equal(validarTelefone('11 9ABC-5678'), false);
  });

  it('rejeita DDD inexistente', () => {
    assert.equal(validarTelefone('0912345678'), false);
  });

  it('rejeita celular de 11 digitos que nao comeca com 9', () => {
    assert.equal(validarTelefone('11812345678'), false);
  });

  it('monta o numero no formato do wa.me', () => {
    assert.equal(paraFormatoWhatsApp('(11) 91234-5678'), '5511912345678');
  });

  it('nao duplica o codigo do pais quando ja veio com 55', () => {
    assert.equal(paraFormatoWhatsApp('5511912345678'), '5511912345678');
  });

  it('formata para leitura', () => {
    assert.equal(formatarTelefone('11912345678'), '(11) 91234-5678');
    assert.equal(formatarTelefone('1132145678'), '(11) 3214-5678');
  });
});

describe('formatos', () => {
  it('valida e-mail', () => {
    assert.equal(validarEmail('contato@atria.com.br'), true);
    assert.equal(validarEmail('contato@atria'), false);
    assert.equal(validarEmail('sem-arroba.com'), false);
  });

  it('adiciona protocolo em URL sem esquema', () => {
    assert.equal(normalizarUrl('atria.com.br'), 'https://atria.com.br');
    assert.equal(normalizarUrl('http://atria.com.br'), 'http://atria.com.br');
  });

  it('transforma handle do Instagram em URL', () => {
    assert.equal(normalizarInstagram('@atriaej'), 'https://instagram.com/atriaej');
    assert.equal(normalizarInstagram('atriaej'), 'https://instagram.com/atriaej');
  });

  it('preserva URL do LinkedIn ja completa', () => {
    assert.equal(
      normalizarLinkedin('https://linkedin.com/company/atria'),
      'https://linkedin.com/company/atria',
    );
  });
});

describe('interpolar', () => {
  const lead: Lead = { ...LEAD_DE_EXEMPLO, nome: 'Padaria do Bairro', origem_lead: 'indicacao' };

  it('substitui variaveis conhecidas', () => {
    const texto = interpolar('Olá, {{nome}}! Falo em nome de {{responsavel}}.', contextoDoLead(lead, 'Ana'));
    assert.equal(texto, 'Olá, Padaria do Bairro! Falo em nome de Ana.');
  });

  it('usa o rotulo legivel do enum, nao o valor cru', () => {
    const texto = interpolar('Origem: {{origem_lead}}', contextoDoLead(lead, 'Ana'));
    assert.equal(texto, 'Origem: Indicação');
  });

  it('aceita espacos dentro das chaves', () => {
    assert.equal(interpolar('Oi {{ nome }}', contextoDoLead(lead, 'Ana')), 'Oi Padaria do Bairro');
  });

  it('troca variavel sem valor por vazio em vez de vazar {{...}} para o cliente', () => {
    const semLinkedin: Lead = { ...lead, linkedin: null };
    assert.equal(interpolar('Perfil: {{linkedin}}', contextoDoLead(semLinkedin, 'Ana')), 'Perfil: ');
  });

  it('detecta variavel inexistente', () => {
    assert.deepEqual(variaveisInvalidas('Oi {{nome}}, {{faturamento}}'), ['faturamento']);
    assert.deepEqual(variaveisInvalidas('Oi {{nome}}'), []);
  });
});

describe('validarNovoLead', () => {
  const base = {
    nome: 'Padaria do Bairro',
    origem_lead: 'indicacao' as const,
    responsavel_id: 'uuid-responsavel',
    criado_por: 'uuid-criador',
  };

  it('aceita lead com um unico canal de contato', () => {
    const { valido } = validarNovoLead({ ...base, email: 'contato@padaria.com.br' });
    assert.equal(valido, true);
  });

  it('rejeita lead sem nenhum contato', () => {
    const { valido, erros } = validarNovoLead(base);
    assert.equal(valido, false);
    assert.ok(erros.some((e) => e.campo === 'contato'));
  });

  it('nao aceita espaco em branco como contato', () => {
    const { valido } = validarNovoLead({ ...base, telefone: '   ' });
    assert.equal(valido, false);
  });

  it('rejeita nome vazio', () => {
    const { valido, erros } = validarNovoLead({ ...base, nome: '  ', email: 'a@b.com' });
    assert.equal(valido, false);
    assert.ok(erros.some((e) => e.campo === 'nome'));
  });

  it('rejeita telefone com letras mantendo o resto valido', () => {
    const { valido, erros } = validarNovoLead({ ...base, telefone: '11 9ABC-5678' });
    assert.equal(valido, false);
    assert.ok(erros.some((e) => e.campo === 'telefone'));
  });

  it('exige responsavel', () => {
    const { valido, erros } = validarNovoLead({ ...base, responsavel_id: '', email: 'a@b.com' });
    assert.equal(valido, false);
    assert.ok(erros.some((e) => e.campo === 'responsavel_id'));
  });
});

describe('normalizarCamposDoLead', () => {
  it('guarda telefone so com digitos e e-mail em minusculas', () => {
    const normalizado = normalizarCamposDoLead({
      nome: '  Padaria  ',
      telefone: '(11) 91234-5678',
      email: 'Contato@Padaria.COM.BR',
    });

    assert.equal(normalizado.nome, 'Padaria');
    assert.equal(normalizado.telefone, '11912345678');
    assert.equal(normalizado.email, 'contato@padaria.com.br');
  });

  it('converte string vazia em null para o banco distinguir de "nao informado"', () => {
    const normalizado = normalizarCamposDoLead({ nome: 'X', instagram: '   ' });
    assert.equal(normalizado.instagram, null);
  });

  it('nao inventa campo que nao veio', () => {
    const normalizado = normalizarCamposDoLead({ nome: 'X' });
    assert.equal('telefone' in normalizado, false);
  });
});

describe('canaisDisponiveis', () => {
  it('lista apenas os canais preenchidos', () => {
    const lead: Lead = { ...LEAD_DE_EXEMPLO, linkedin: null };
    assert.deepEqual(canaisDisponiveis(lead), ['whatsapp', 'instagram', 'email']);
  });

  it('devolve lista vazia quando nao ha contato', () => {
    const lead: Lead = {
      ...LEAD_DE_EXEMPLO,
      telefone: null,
      email: null,
      instagram: null,
      linkedin: null,
    };
    assert.deepEqual(canaisDisponiveis(lead), []);
  });
});
