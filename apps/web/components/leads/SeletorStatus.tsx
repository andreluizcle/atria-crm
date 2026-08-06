'use client';

import { useState, useTransition } from 'react';
import { ROTULO_STATUS_LEAD, STATUS_LEAD, type StatusLead } from '@atria/core/cliente';
import { mudarStatusAction } from '@/actions/leadActions';

/**
 * Atalho da ficha: mover o lead pelo funil sem abrir a tela de edicao.
 *
 * Usa a `mudarStatusAction`, a unica action de lead que NAO chama redirect() —
 * por isso da para acionar daqui sem tirar a pessoa da pagina. As outras
 * (criar/atualizar/remover) desviam de rota e nao serviriam para um atalho.
 *
 * O `key={status}` remonta o select quando o valor revalidado chega do
 * servidor; sem ele o campo ficaria preso na escolha anterior.
 */
export function SeletorStatus({ leadId, status }: { leadId: string; status: StatusLead }) {
  const [pendente, iniciarTransicao] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function trocar(novo: StatusLead) {
    if (novo === status) return;

    setErro(null);
    iniciarTransicao(async () => {
      const resultado = await mudarStatusAction(leadId, novo);
      if (!resultado.ok) setErro(resultado.erro);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-2 text-sm">
        <span className="text-slate-500">Status</span>
        <select
          key={status}
          aria-label="Mudar status do lead"
          className="campo w-auto"
          defaultValue={status}
          disabled={pendente}
          onChange={(evento) => trocar(evento.target.value as StatusLead)}
        >
          {STATUS_LEAD.map((valor) => (
            <option key={valor} value={valor}>
              {ROTULO_STATUS_LEAD[valor]}
            </option>
          ))}
        </select>
      </label>

      {erro ? <p className="text-xs text-red-600">{erro}</p> : null}
    </div>
  );
}
