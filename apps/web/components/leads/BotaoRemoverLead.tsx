'use client';

import { useState, useTransition } from 'react';
import { removerLeadAction } from '@/actions/leadActions';

/** Exclusao com confirmacao. E soft delete — o historico do lead permanece. */
export function BotaoRemoverLead({ leadId, nome }: { leadId: string; nome: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();

  if (!confirmando) {
    return (
      <button className="botao-perigo" onClick={() => setConfirmando(true)}>
        Excluir
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-slate-600">Excluir {nome}?</span>
      <button
        className="botao-perigo"
        disabled={pendente}
        onClick={() => iniciarTransicao(() => void removerLeadAction(leadId))}
      >
        {pendente ? 'Excluindo...' : 'Sim, excluir'}
      </button>
      <button className="botao-secundario" onClick={() => setConfirmando(false)}>
        Não
      </button>
    </div>
  );
}
