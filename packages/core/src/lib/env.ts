import { ErroDeConfiguracao } from './erros';

/**
 * Leitura de variaveis de ambiente com erro explicito.
 *
 * Nunca acesse `process.env` direto nos services — se a variavel faltar, o bug
 * aparece longe da causa. Aqui a mensagem ja diz qual variavel esta faltando.
 */

export function requerEnv(nome: string): string {
  const valor = process.env[nome];
  if (!valor || valor.trim() === '') {
    throw new ErroDeConfiguracao(
      `Variável de ambiente ${nome} não está definida. Veja o .env.example na raiz do projeto.`,
    );
  }
  return valor.trim();
}

export function envOpcional(nome: string): string | undefined {
  const valor = process.env[nome];
  return valor && valor.trim() !== '' ? valor.trim() : undefined;
}

/**
 * A integracao com a Casa dos Dados e paga e opcional. O resto do sistema
 * precisa funcionar sem ela, entao consultamos isso antes de montar a tela.
 */
export function casaDosDadosConfigurada(): boolean {
  return envOpcional('CASA_DOS_DADOS_API_KEY') !== undefined;
}

export function emailConfigurado(): boolean {
  return envOpcional('RESEND_API_KEY') !== undefined && envOpcional('EMAIL_REMETENTE') !== undefined;
}
