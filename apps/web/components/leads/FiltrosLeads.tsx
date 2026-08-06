'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  ORIGENS_LEAD,
  ROTULO_ORIGEM_LEAD,
  ROTULO_STATUS_LEAD,
  STATUS_LEAD,
  type Usuario,
} from '@atria/core/cliente';

/**
 * Filtros da listagem. Escrevem na URL em vez de estado local, para o filtro
 * sobreviver a um refresh e poder ser compartilhado por link (o dashboard
 * aponta para ca com ?status=novo).
 */
export function FiltrosLeads({ membros }: { membros: Usuario[] }) {
  const router = useRouter();
  const parametros = useSearchParams();

  function aplicar(chave: string, valor: string) {
    const novos = new URLSearchParams(parametros.toString());

    if (valor === '') novos.delete(chave);
    else novos.set(chave, valor);

    // Trocar um filtro sempre volta para a primeira pagina.
    novos.delete('pagina');
    router.push(`/leads?${novos.toString()}`);
  }

  return (
    <form
      className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5"
      onSubmit={(e) => {
        e.preventDefault();
        const campo = new FormData(e.currentTarget).get('busca');
        aplicar('busca', typeof campo === 'string' ? campo : '');
      }}
    >
      <div className="lg:col-span-2">
        <label className="rotulo" htmlFor="busca">
          Buscar
        </label>
        <input
          id="busca"
          name="busca"
          className="campo"
          placeholder="Nome, e-mail ou CNPJ"
          defaultValue={parametros.get('busca') ?? ''}
        />
      </div>

      <Seletor
        rotulo="Status"
        valor={parametros.get('status') ?? ''}
        aoMudar={(v) => aplicar('status', v)}
        opcoes={STATUS_LEAD.map((s) => ({ valor: s, rotulo: ROTULO_STATUS_LEAD[s] }))}
      />

      <Seletor
        rotulo="Origem"
        valor={parametros.get('origem') ?? ''}
        aoMudar={(v) => aplicar('origem', v)}
        opcoes={ORIGENS_LEAD.map((o) => ({ valor: o, rotulo: ROTULO_ORIGEM_LEAD[o] }))}
      />

      <Seletor
        rotulo="Responsável"
        valor={parametros.get('responsavel') ?? ''}
        aoMudar={(v) => aplicar('responsavel', v)}
        opcoes={membros.map((m) => ({ valor: m.id, rotulo: m.nome }))}
      />

      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-5">
        <button type="submit" className="botao-primario">
          Buscar
        </button>
        <button type="button" className="botao-secundario" onClick={() => router.push('/leads')}>
          Limpar filtros
        </button>
      </div>
    </form>
  );
}

function Seletor({
  rotulo,
  valor,
  opcoes,
  aoMudar,
}: {
  rotulo: string;
  valor: string;
  opcoes: Array<{ valor: string; rotulo: string }>;
  aoMudar: (valor: string) => void;
}) {
  return (
    <div>
      <label className="rotulo">{rotulo}</label>
      <select className="campo" value={valor} onChange={(e) => aoMudar(e.target.value)}>
        <option value="">Todos</option>
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </div>
  );
}
