import { ErroDeNegocio } from '../lib/erros';
import type { ResultadoValidacao } from './leadValidacao';

/**
 * Regras do nome de exibicao do membro.
 *
 * Por que existe: o trigger `handle_new_user` preenche `usuarios.nome` com o
 * pedaco do e-mail antes do @ quando o membro e criado pelo dashboard do
 * Supabase sem metadata. Isso vaza para as mensagens enviadas, porque este e o
 * `{{responsavel}}` da interpolacao — o lead recebia "Sou andre.oliveira, da
 * Atria". Dai a tela de perfil poder corrigir.
 *
 * A coluna e `not null` no banco mas nao tem CHECK nenhum: string vazia passaria
 * direto. Alem de sair torto na mensagem, quebraria a saudacao do dashboard, que
 * faz `usuario.nome.split(' ')[0]`. Por isso o minimo mora aqui.
 */

export const MIN_NOME_USUARIO = 2;
export const MAX_NOME_USUARIO = 80;

export function validarNomeUsuario(nome: string): ResultadoValidacao {
  const erros: ResultadoValidacao['erros'] = [];
  const limpo = nome.trim();

  if (limpo.length < MIN_NOME_USUARIO) {
    erros.push({
      campo: 'nome',
      mensagem: `O nome precisa de pelo menos ${MIN_NOME_USUARIO} letras.`,
    });
  } else if (limpo.length > MAX_NOME_USUARIO) {
    erros.push({
      campo: 'nome',
      mensagem: `O nome pode ter no máximo ${MAX_NOME_USUARIO} caracteres.`,
    });
  }

  return { valido: erros.length === 0, erros };
}

/** Devolve o nome ja aparado, ou lanca ErroDeNegocio com a mensagem pronta. */
export function garantirNomeUsuarioValido(nome: string): string {
  const { valido, erros } = validarNomeUsuario(nome);

  if (!valido) {
    throw new ErroDeNegocio(
      erros.map((e) => e.mensagem).join(' '),
      erros.map((e) => e.campo),
    );
  }

  return nome.trim();
}
