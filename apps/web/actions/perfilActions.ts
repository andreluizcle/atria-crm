'use server';

import { revalidatePath } from 'next/cache';
import {
  atualizarNomeUsuario,
  desvincularTelegram,
  envOpcional,
  garantirNomeUsuarioValido,
  gerarTokenVinculo,
} from '@atria/core';
import { exigirUsuarioLogado } from '@/lib/sessao';
import { executarAction, textoObrigatorio, type ResultadoAction } from './resultado';

/**
 * Vinculo da conta do Telegram (ver core/lib/vinculoTelegram.ts).
 *
 * O token so pode ser gerado aqui, por quem ja passou pelo Supabase Auth. E o
 * que impede alguem de fora abrir o bot e se declarar membro da EJ.
 */

export type ResultadoLink = { ok: true; url: string } | { ok: false; erro: string };

export async function gerarLinkVinculoAction(): Promise<ResultadoLink> {
  const usuarioBot = envOpcional('TELEGRAM_BOT_USERNAME');
  if (!usuarioBot) {
    return {
      ok: false,
      erro: 'Falta definir TELEGRAM_BOT_USERNAME no ambiente (o @ do bot, sem a arroba).',
    };
  }

  try {
    const { usuario } = await exigirUsuarioLogado();
    const token = gerarTokenVinculo(usuario.id);

    return { ok: true, url: `https://t.me/${usuarioBot}?start=${token}` };
  } catch {
    return { ok: false, erro: 'Não consegui gerar o link agora. Tente de novo.' };
  }
}

/**
 * Troca o nome de exibicao do proprio membro.
 *
 * Esse nome e o `{{responsavel}}` das mensagens enviadas — mudar aqui muda o que
 * o lead le no proximo disparo. Envios ja registrados guardam o texto renderizado
 * em `historico_contatos` e continuam com o nome antigo, que e o correto.
 *
 * O id vem SEMPRE da sessao, nunca do formulario: mesmo com a RLS barrando linha
 * de outra pessoa, aceitar id de fora seria pedir para errar.
 */
export async function atualizarNomeAction(
  _anterior: unknown,
  formulario: FormData,
): Promise<ResultadoAction> {
  return executarAction('perfilActions.atualizarNome', async () => {
    const { db, usuario } = await exigirUsuarioLogado();

    const nome = garantirNomeUsuarioValido(textoObrigatorio(formulario, 'nome'));
    await atualizarNomeUsuario(db, usuario.id, nome);

    // 'layout' e nao so '/perfil': o nome tambem aparece na barra de navegacao
    // (renderizada em app/(app)/layout.tsx) e na saudacao do dashboard.
    revalidatePath('/', 'layout');

    return { ok: true, mensagem: 'Nome atualizado.' };
  });
}

export async function desvincularTelegramAction(): Promise<ResultadoAction> {
  return executarAction('perfilActions.desvincular', async () => {
    const { db, usuario } = await exigirUsuarioLogado();

    await desvincularTelegram(db, usuario.id);
    revalidatePath('/perfil');
  });
}
