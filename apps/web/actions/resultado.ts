import { mensagemParaUsuario, registrarErro } from '@atria/core';

/**
 * Formato unico de retorno das Server Actions.
 *
 * Actions nao lancam para o cliente: excecao em Server Action vira erro
 * generico na tela ("An error occurred in the Server Components render"), que
 * nao ajuda ninguem. Aqui capturamos e devolvemos a mensagem tratada.
 */

export type ResultadoAction =
  | { ok: true; mensagem?: string }
  | { ok: false; erro: string; campos?: string[] };

export const SUCESSO: ResultadoAction = { ok: true };

export async function executarAction(
  contexto: string,
  acao: () => Promise<ResultadoAction | void>,
): Promise<ResultadoAction> {
  try {
    return (await acao()) ?? SUCESSO;
  } catch (erro) {
    registrarErro(contexto, erro);
    return {
      ok: false,
      erro: mensagemParaUsuario(erro),
      campos: erro instanceof Error && 'campos' in erro ? (erro.campos as string[]) : undefined,
    };
  }
}

/** Le um campo de texto do FormData, tratando vazio como ausente. */
export function texto(formulario: FormData, campo: string): string | null {
  const valor = formulario.get(campo);
  if (typeof valor !== 'string') return null;

  const limpo = valor.trim();
  return limpo === '' ? null : limpo;
}

export function textoObrigatorio(formulario: FormData, campo: string): string {
  return texto(formulario, campo) ?? '';
}
