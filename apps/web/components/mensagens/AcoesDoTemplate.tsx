'use client';

import { useState, useTransition } from 'react';
import { alternarAtivoAction, removerMensagemAction } from '@/actions/mensagemActions';

/**
 * Ativar/desativar e excluir.
 *
 * Desativar e quase sempre a acao certa: excluir apaga o template, e o historico
 * de contatos que apontava para ele perde o titulo (vira "Template removido").
 */
export function AcoesDoTemplate({ id, titulo, ativo }: { id: string; titulo: string; ativo: boolean }) {
  const [pendente, iniciarTransicao] = useTransition();
  const [confirmando, setConfirmando] = useState(false);

  if (confirmando) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-600">Excluir &ldquo;{titulo}&rdquo;?</span>
        <button
          className="botao-perigo"
          disabled={pendente}
          onClick={() => iniciarTransicao(() => void removerMensagemAction(id))}
        >
          Sim
        </button>
        <button className="botao-secundario" onClick={() => setConfirmando(false)}>
          Não
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        className="botao-secundario"
        disabled={pendente}
        onClick={() => iniciarTransicao(() => void alternarAtivoAction(id, !ativo))}
      >
        {ativo ? 'Desativar' : 'Ativar'}
      </button>
      <button className="botao-perigo" onClick={() => setConfirmando(true)}>
        Excluir
      </button>
    </>
  );
}
