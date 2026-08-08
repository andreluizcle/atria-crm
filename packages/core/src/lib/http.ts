/**
 * Cabecalhos comuns as chamadas HTTP para APIs externas.
 *
 * O `fetch` nativo do Node manda `user-agent: node` por padrao, e o Cloudflare
 * da BrasilAPI responde 403 a esse valor. Sem User-Agent proprio, TODA consulta
 * de CNPJ falha — em dev e em producao, para qualquer CNPJ. NAO REMOVA.
 *
 * Mandar string vazia tambem nao resolve: cai em 429.
 */

export const USER_AGENT = 'atria-crm (+https://github.com/andreluizcle/atria-crm)';

/** Junta o User-Agent obrigatorio aos cabecalhos especificos de cada integracao. */
export function cabecalhosPadrao(extras: Record<string, string> = {}): Record<string, string> {
  return {
    accept: 'application/json',
    'user-agent': USER_AGENT,
    ...extras,
  };
}
