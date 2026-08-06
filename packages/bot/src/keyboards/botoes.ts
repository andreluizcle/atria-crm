import { Markup } from 'telegraf';
import type { InlineKeyboardMarkup } from 'telegraf/types';
import { CB } from './callbacks';

/** Teclados inline reutilizados pelos fluxos. Nenhum handler monta botao na mao. */

export function tecladoPular(): Markup.Markup<InlineKeyboardMarkup> {
  return Markup.inlineKeyboard([
    [Markup.button.callback('⏭️ Pular', CB.PULAR)],
    [Markup.button.callback('❌ Cancelar', CB.CANCELAR)],
  ]);
}

export function tecladoObrigatorio(): Markup.Markup<InlineKeyboardMarkup> {
  return Markup.inlineKeyboard([[Markup.button.callback('❌ Cancelar', CB.CANCELAR)]]);
}

/** Opcoes fixas (origem do lead) ou dinamicas (membros), duas por linha. */
export function tecladoDeOpcoes(
  opcoes: Array<{ rotulo: string; valor: string }>,
  porLinha = 2,
): Markup.Markup<InlineKeyboardMarkup> {
  const linhas: ReturnType<typeof Markup.button.callback>[][] = [];

  for (let i = 0; i < opcoes.length; i += porLinha) {
    linhas.push(
      opcoes.slice(i, i + porLinha).map((o) => Markup.button.callback(o.rotulo, CB.opcao(o.valor))),
    );
  }

  linhas.push([Markup.button.callback('❌ Cancelar', CB.CANCELAR)]);
  return Markup.inlineKeyboard(linhas);
}

export function tecladoConfirmacao(): Markup.Markup<InlineKeyboardMarkup> {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✅ Confirmar', CB.CONFIRMAR)],
    [Markup.button.callback('✏️ Editar', CB.EDITAR)],
    [Markup.button.callback('❌ Cancelar', CB.CANCELAR)],
  ]);
}

export function tecladoEscolherCampo(
  campos: Array<{ rotulo: string; campo: string }>,
): Markup.Markup<InlineKeyboardMarkup> {
  const linhas = campos.map((c) => [Markup.button.callback(c.rotulo, CB.editarCampo(c.campo))]);
  linhas.push([Markup.button.callback('« Voltar ao resumo', CB.EDITAR + ':voltar')]);

  return Markup.inlineKeyboard(linhas);
}

/** Botao que abre uma URL externa (wa.me, perfil do Instagram/LinkedIn). */
export function tecladoLinkExterno(rotulo: string, url: string): Markup.Markup<InlineKeyboardMarkup> {
  return Markup.inlineKeyboard([[Markup.button.url(rotulo, url)]]);
}

export function tecladoConfirmarEmail(): Markup.Markup<InlineKeyboardMarkup> {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📨 Enviar agora', CB.confirmarEmail)],
    [Markup.button.callback('❌ Cancelar', CB.cancelarEnvio)],
  ]);
}
