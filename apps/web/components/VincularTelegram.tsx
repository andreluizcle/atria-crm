'use client';

import { useState, useTransition } from 'react';
import { desvincularTelegramAction, gerarLinkVinculoAction } from '@/actions/perfilActions';
import { Aviso } from '@/components/ui/Aviso';

/**
 * Gera o deep link assinado que vincula esta conta ao bot.
 *
 * O token so pode nascer aqui, depois do Supabase Auth — e o que impede alguem
 * de fora abrir o bot e se declarar membro da EJ.
 */
export function VincularTelegram({ jaVinculado }: { jaVinculado: boolean }) {
  const [link, setLink] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  function gerar() {
    setErro(null);

    iniciarTransicao(async () => {
      const resultado = await gerarLinkVinculoAction();

      if (resultado.ok) setLink(resultado.url);
      else setErro(resultado.erro);
    });
  }

  return (
    <div className="space-y-3">
      {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}

      {jaVinculado ? (
        <Aviso tipo="sucesso">Sua conta do Telegram já está vinculada.</Aviso>
      ) : (
        <Aviso tipo="info">Ainda não vinculada. Gere o link e abra no celular onde você usa o Telegram.</Aviso>
      )}

      {link ? (
        <div className="space-y-2">
          <a href={link} target="_blank" rel="noopener noreferrer" className="botao-primario">
            Abrir no Telegram
          </a>
          <p className="break-all rounded bg-slate-50 p-2 font-mono text-xs text-slate-600">{link}</p>
          <p className="text-xs text-slate-500">
            Se estiver no computador, copie e abra este link no celular. Ele expira em 15 minutos.
          </p>
        </div>
      ) : (
        <div className="flex gap-2">
          <button className="botao-primario" disabled={pendente} onClick={gerar}>
            {pendente ? 'Gerando...' : jaVinculado ? 'Gerar novo link' : 'Vincular Telegram'}
          </button>

          {jaVinculado ? (
            <button
              className="botao-secundario"
              disabled={pendente}
              onClick={() => iniciarTransicao(() => void desvincularTelegramAction())}
            >
              Desvincular
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
