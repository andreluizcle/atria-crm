import type { AtualizacaoLead, CanaisDisponiveis, Lead, NovoLead } from '../types/lead';
import { ehOrigemLead, ehStatusLead } from '../types/enums';
import { ErroDeNegocio } from '../lib/erros';
import { limparCnpj, validarCnpj } from './cnpj';
import { normalizarEmail, normalizarInstagram, normalizarLinkedin, normalizarUrl, validarEmail, vazioParaNulo } from './formatos';
import { limparTelefone, validarTelefone } from './telefone';

/**
 * Regra de negocio da spec secao 4, em UM lugar so.
 *
 * Chamada pelo bot (antes de confirmar o cadastro) e pelas server actions do
 * painel (antes de gravar). O banco tambem tem o CHECK equivalente, como ultima
 * barreira — mas a mensagem amigavel nasce aqui.
 */

export interface ResultadoValidacao {
  valido: boolean;
  erros: Array<{ campo: string; mensagem: string }>;
}

const CAMPOS_DE_CONTATO = ['telefone', 'email', 'instagram', 'linkedin'] as const;

export function validarNovoLead(entrada: Partial<NovoLead>): ResultadoValidacao {
  const erros: ResultadoValidacao['erros'] = [];

  if (!entrada.nome || entrada.nome.trim() === '') {
    erros.push({ campo: 'nome', mensagem: 'O nome é obrigatório.' });
  }

  if (!entrada.responsavel_id) {
    erros.push({ campo: 'responsavel_id', mensagem: 'Escolha quem da EJ vai cuidar deste lead.' });
  }

  if (entrada.status !== undefined && !ehStatusLead(entrada.status)) {
    erros.push({ campo: 'status', mensagem: 'Status inválido.' });
  }

  if (!entrada.origem_lead || !ehOrigemLead(entrada.origem_lead)) {
    erros.push({ campo: 'origem_lead', mensagem: 'Informe de onde veio este lead.' });
  }

  const temContato = CAMPOS_DE_CONTATO.some((campo) => vazioParaNulo(entrada[campo]) !== null);
  if (!temContato) {
    erros.push({
      campo: 'contato',
      mensagem: 'Preencha pelo menos um contato: telefone, e-mail, Instagram ou LinkedIn.',
    });
  }

  erros.push(...validarFormatos(entrada));

  return { valido: erros.length === 0, erros };
}

/** Na edicao so validamos o que veio; o "pelo menos um contato" e checado sobre o resultado final. */
export function validarAtualizacaoLead(atual: Lead, mudancas: AtualizacaoLead): ResultadoValidacao {
  const erros = validarFormatos(mudancas);

  if (mudancas.nome !== undefined && mudancas.nome.trim() === '') {
    erros.push({ campo: 'nome', mensagem: 'O nome não pode ficar vazio.' });
  }

  const resultado = { ...atual, ...mudancas };
  const temContato = CAMPOS_DE_CONTATO.some((campo) => vazioParaNulo(resultado[campo]) !== null);
  if (!temContato) {
    erros.push({
      campo: 'contato',
      mensagem: 'O lead ficaria sem nenhum contato. Mantenha ao menos telefone, e-mail, Instagram ou LinkedIn.',
    });
  }

  return { valido: erros.length === 0, erros };
}

function validarFormatos(entrada: Partial<NovoLead>): ResultadoValidacao['erros'] {
  const erros: ResultadoValidacao['erros'] = [];

  const telefone = vazioParaNulo(entrada.telefone);
  if (telefone && !validarTelefone(telefone)) {
    erros.push({
      campo: 'telefone',
      mensagem: 'Telefone inválido. Use DDD + número, ex: (11) 91234-5678.',
    });
  }

  const email = vazioParaNulo(entrada.email);
  if (email && !validarEmail(email)) {
    erros.push({ campo: 'email', mensagem: 'E-mail inválido. Confira se tem @ e domínio.' });
  }

  const cnpj = vazioParaNulo(entrada.cnpj);
  if (cnpj && !validarCnpj(cnpj)) {
    erros.push({ campo: 'cnpj', mensagem: 'CNPJ inválido. Confira os 14 dígitos.' });
  }

  return erros;
}

/** Lanca em vez de devolver — atalho para services que nao querem tratar campo a campo. */
export function garantirLeadValido(entrada: Partial<NovoLead>): void {
  const { valido, erros } = validarNovoLead(entrada);
  if (!valido) {
    throw new ErroDeNegocio(
      erros.map((e) => e.mensagem).join(' '),
      erros.map((e) => e.campo),
    );
  }
}

/**
 * Deixa os campos prontos para o banco: apara espacos, normaliza URLs e
 * transforma "" em null. Rodar isso antes de gravar evita lead com telefone
 * " " que passa no CHECK mas nao serve para nada.
 */
export function normalizarCamposDoLead<T extends Partial<NovoLead>>(entrada: T): T {
  const telefone = vazioParaNulo(entrada.telefone);
  const email = vazioParaNulo(entrada.email);
  const site = vazioParaNulo(entrada.site);
  const instagram = vazioParaNulo(entrada.instagram);
  const linkedin = vazioParaNulo(entrada.linkedin);
  const cnpj = vazioParaNulo(entrada.cnpj);

  return {
    ...entrada,
    ...(entrada.nome !== undefined ? { nome: entrada.nome.trim() } : {}),
    ...(entrada.telefone !== undefined ? { telefone: telefone ? limparTelefone(telefone) : null } : {}),
    ...(entrada.email !== undefined ? { email: email ? normalizarEmail(email) : null } : {}),
    ...(entrada.site !== undefined ? { site: site ? normalizarUrl(site) : null } : {}),
    ...(entrada.instagram !== undefined ? { instagram: instagram ? normalizarInstagram(instagram) : null } : {}),
    ...(entrada.linkedin !== undefined ? { linkedin: linkedin ? normalizarLinkedin(linkedin) : null } : {}),
    ...(entrada.cnpj !== undefined ? { cnpj: cnpj ? limparCnpj(cnpj) : null } : {}),
    ...(entrada.observacoes !== undefined ? { observacoes: vazioParaNulo(entrada.observacoes) } : {}),
  };
}

/**
 * Canais pelos quais da para falar com este lead.
 * O bot e o painel usam isso para so oferecer templates que fazem sentido (spec 5.3.2).
 */
export function canaisDisponiveis(lead: Lead): CanaisDisponiveis {
  const canais: CanaisDisponiveis = [];

  if (lead.telefone) canais.push('whatsapp');
  if (lead.instagram) canais.push('instagram');
  if (lead.linkedin) canais.push('linkedin');
  if (lead.email) canais.push('email');

  return canais;
}
