'use server';

import { revalidatePath } from 'next/cache';
import { desvincularTelegram, envOpcional, gerarTokenVinculo } from '@atria/core';
import { exigirUsuarioLogado } from '@/lib/sessao';
import { executarAction, type ResultadoAction } from './resultado';

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

export async function desvincularTelegramAction(): Promise<ResultadoAction> {
  return executarAction('perfilActions.desvincular', async () => {
    const { db, usuario } = await exigirUsuarioLogado();

    await desvincularTelegram(db, usuario.id);
    revalidatePath('/perfil');
  });
}
