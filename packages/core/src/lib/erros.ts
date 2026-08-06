/**
 * Tipos de erro do sistema.
 *
 * A regra da spec (secao 3) e: nenhuma chamada externa pode falhar em silencio.
 * Toda integracao lanca um destes, e as camadas de cima (handler do bot, server
 * action da web) transformam em mensagem legivel para o usuario.
 */

/** Regra de negocio violada. Culpa do dado, nao do sistema. Mostrar ao usuario como esta. */
export class ErroDeNegocio extends Error {
  readonly campos: string[];

  constructor(mensagem: string, campos: string[] = []) {
    super(mensagem);
    this.name = 'ErroDeNegocio';
    this.campos = campos;
  }
}

/** Servico externo (Supabase, BrasilAPI, Casa dos Dados, Resend, Telegram) falhou. */
export class ErroDeIntegracao extends Error {
  readonly servico: string;
  readonly status?: number;

  constructor(servico: string, mensagem: string, opcoes: { status?: number; causa?: unknown } = {}) {
    super(mensagem, { cause: opcoes.causa });
    this.name = 'ErroDeIntegracao';
    this.servico = servico;
    this.status = opcoes.status;
  }
}

/** Variavel de ambiente faltando ou invalida. Culpa do setup, nao do usuario. */
export class ErroDeConfiguracao extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDeConfiguracao';
  }
}

/**
 * Converte qualquer erro numa frase segura para mostrar ao usuario final.
 * Erros inesperados viram uma mensagem generica — detalhe tecnico vai para o log,
 * nao para o chat do Telegram nem para a tela.
 */
export function mensagemParaUsuario(erro: unknown): string {
  if (erro instanceof ErroDeNegocio) return erro.message;
  if (erro instanceof ErroDeIntegracao) {
    return `Não consegui falar com ${erro.servico} agora. ${erro.message}`;
  }
  if (erro instanceof ErroDeConfiguracao) {
    return 'O sistema está com uma configuração faltando. Avise quem cuida do projeto.';
  }
  return 'Algo deu errado por aqui. Tente de novo em instantes.';
}

/** Log padronizado. Mantem o stack no servidor sem vazar nada para o usuario. */
export function registrarErro(contexto: string, erro: unknown): void {
  console.error(`[atria-crm] ${contexto}:`, erro);
}
