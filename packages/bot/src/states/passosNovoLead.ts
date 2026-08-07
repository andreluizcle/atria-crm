import {
  ORIGENS_LEAD,
  ROTULO_ORIGEM_LEAD,
  normalizarInstagram,
  normalizarLinkedin,
  normalizarUrl,
  validarCnpj,
  validarEmail,
  validarTelefone,
  validarUrl,
} from '@atria/core';

/**
 * O cadastro de lead descrito como DADOS, nao como codigo.
 *
 * Cada passo diz o que perguntar, se da para pular e como validar. O handler
 * (handlers/novoLead.ts) so percorre esta lista — adicionar um campo novo ao
 * cadastro e acrescentar um item aqui, sem mexer na logica de conversa.
 */

export type ResultadoValidacaoPasso = { ok: true; valor: string } | { ok: false; mensagem: string };

export interface PassoCadastro {
  /** Identificador do passo e nome da coluna em `leads`. */
  campo: string;
  pergunta: string;
  opcional: boolean;
  /** 'escolha' mostra botoes fixos. */
  tipo: 'texto' | 'escolha';
  opcoes?: Array<{ rotulo: string; valor: string }>;
  /** Valida e ja devolve o valor normalizado que sera gravado. */
  validar?: (texto: string) => ResultadoValidacaoPasso;
}

export const PASSOS_NOVO_LEAD: PassoCadastro[] = [
  {
    campo: 'nome',
    pergunta:
      '1️⃣ Qual o <b>nome</b> do lead?\n\n<i>Se não souber o contato, use algo como "Padaria do Bairro — contato desconhecido".</i>',
    opcional: false,
    tipo: 'texto',
    validar: (texto) =>
      texto.trim().length >= 2
        ? { ok: true, valor: texto.trim() }
        : { ok: false, mensagem: 'O nome precisa de pelo menos 2 letras.' },
  },
  {
    campo: 'telefone',
    pergunta: '2️⃣ Qual o <b>telefone</b>? (com DDD)',
    opcional: true,
    tipo: 'texto',
    validar: (texto) =>
      validarTelefone(texto)
        ? { ok: true, valor: texto.trim() }
        : { ok: false, mensagem: 'Telefone inválido. Use DDD + número, ex: (11) 91234-5678.' },
  },
  {
    campo: 'email',
    pergunta: '3️⃣ Qual o <b>e-mail</b>?',
    opcional: true,
    tipo: 'texto',
    validar: (texto) =>
      validarEmail(texto)
        ? { ok: true, valor: texto.trim() }
        : { ok: false, mensagem: 'E-mail inválido. Confira se tem @ e domínio.' },
  },
  {
    campo: 'instagram',
    pergunta: '4️⃣ Qual o <b>Instagram</b>? (pode ser só o @)',
    opcional: true,
    tipo: 'texto',
    validar: (texto) => ({ ok: true, valor: normalizarInstagram(texto) }),
  },
  {
    campo: 'linkedin',
    pergunta: '5️⃣ Qual o <b>LinkedIn</b>? (perfil ou página da empresa)',
    opcional: true,
    tipo: 'texto',
    validar: (texto) => ({ ok: true, valor: normalizarLinkedin(texto) }),
  },
  {
    campo: 'site',
    pergunta: '6️⃣ Qual o <b>site</b>?',
    opcional: true,
    tipo: 'texto',
    validar: (texto) =>
      validarUrl(texto)
        ? { ok: true, valor: normalizarUrl(texto) }
        : { ok: false, mensagem: 'Site inválido. Algo como atria.com.br.' },
  },
  {
    campo: 'cnpj',
    pergunta: '7️⃣ Qual o <b>CNPJ</b>?',
    opcional: true,
    tipo: 'texto',
    validar: (texto) =>
      validarCnpj(texto)
        ? { ok: true, valor: texto.replace(/\D/g, '') }
        : { ok: false, mensagem: 'CNPJ inválido. Confira os 14 dígitos.' },
  },
  {
    campo: 'origem_lead',
    pergunta: '8️⃣ De onde veio esse lead?',
    opcional: false,
    tipo: 'escolha',
    opcoes: ORIGENS_LEAD.map((origem) => ({ rotulo: ROTULO_ORIGEM_LEAD[origem], valor: origem })),
  },
  {
    campo: 'observacoes',
    pergunta: '9️⃣ Alguma <b>observação</b>? (contexto, quem indicou, o que conversaram...)',
    opcional: true,
    tipo: 'texto',
    validar: (texto) => ({ ok: true, valor: texto.trim() }),
  },
];

/** Passo especial: depois do ultimo campo vem o resumo com Confirmar/Editar/Cancelar. */
export const PASSO_CONFIRMACAO = 'confirmacao';

export function passoPorIndice(indice: number): PassoCadastro | undefined {
  return PASSOS_NOVO_LEAD[indice];
}

export function indiceDoCampo(campo: string): number {
  return PASSOS_NOVO_LEAD.findIndex((passo) => passo.campo === campo);
}
