/**
 * Todos os `callback_data` do bot em um lugar so.
 *
 * O Telegram limita callback_data a 64 bytes, por isso os prefixos sao curtos.
 * Centralizar aqui evita o classico bug de digitar 'nl:conf' no botao e
 * escutar 'nl:confirmar' no handler.
 */

export const CB = {
  // --- /novolead ---
  PULAR: 'nl:pular',
  CONFIRMAR: 'nl:conf',
  CANCELAR: 'nl:canc',
  EDITAR: 'nl:edit',
  /** Escolha de opcao fixa (origem do lead) ou de membro responsavel. */
  opcao: (valor: string) => `nl:opt:${valor}`,
  editarCampo: (campo: string) => `nl:ed:${campo}`,

  // --- /meusleads e /buscarlead ---
  paginaMeusLeads: (pagina: number) => `ml:pag:${pagina}`,
  paginaBusca: (pagina: number) => `bl:pag:${pagina}`,
  verLead: (leadId: string) => `lead:${leadId}`,

  // --- /enviarmensagem ---
  // Paginacao propria: reusar `bl:pag:` faria a proxima pagina voltar com botoes
  // de "ver lead" em vez de "escolher lead", quebrando o fluxo no meio.
  paginaEnvio: (pagina: number) => `em:pag:${pagina}`,
  escolherLead: (leadId: string) => `em:lead:${leadId}`,
  escolherTemplate: (mensagemId: string) => `em:tpl:${mensagemId}`,
  confirmarEmail: 'em:enviaremail',
  cancelarEnvio: 'em:canc',
} as const;

export const PREFIXOS = {
  opcao: 'nl:opt:',
  editarCampo: 'nl:ed:',
  paginaMeusLeads: 'ml:pag:',
  paginaBusca: 'bl:pag:',
  verLead: 'lead:',
  paginaEnvio: 'em:pag:',
  escolherLead: 'em:lead:',
  escolherTemplate: 'em:tpl:',
} as const;

/** Extrai o valor depois do prefixo. Devolve null se nao casar. */
export function valorDoCallback(dados: string, prefixo: string): string | null {
  return dados.startsWith(prefixo) ? dados.slice(prefixo.length) : null;
}
