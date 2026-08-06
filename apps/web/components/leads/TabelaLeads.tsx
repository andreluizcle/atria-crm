import Link from 'next/link';
import {
  ROTULO_ORIGEM_LEAD,
  canaisDisponiveis,
  formatarTelefone,
  type LeadComResponsavel,
  type Paginado,
} from '@atria/core/cliente';
import { EtiquetaStatus } from '@/components/ui/Etiqueta';

const EMOJI_CANAL = { whatsapp: '💬', instagram: '📷', linkedin: '💼', email: '✉️' } as const;

export function TabelaLeads({
  resultado,
  parametros,
}: {
  resultado: Paginado<LeadComResponsavel>;
  parametros: Record<string, string | undefined>;
}) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Origem</th>
              <th className="px-4 py-3">Responsável</th>
              <th className="px-4 py-3">Canais</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {resultado.itens.map((lead) => (
              <tr key={lead.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/leads/${lead.id}`} className="font-medium text-slate-900 hover:text-marca-600">
                    {lead.nome}
                  </Link>
                  {lead.telefone ? (
                    <p className="text-xs text-slate-500">{formatarTelefone(lead.telefone)}</p>
                  ) : lead.email ? (
                    <p className="text-xs text-slate-500">{lead.email}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <EtiquetaStatus status={lead.status} />
                </td>
                <td className="px-4 py-3 text-slate-600">{ROTULO_ORIGEM_LEAD[lead.origem_lead]}</td>
                <td className="px-4 py-3 text-slate-600">{lead.responsavel_nome ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="text-base" title={canaisDisponiveis(lead).join(', ')}>
                    {canaisDisponiveis(lead).map((canal) => EMOJI_CANAL[canal]).join(' ') || '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resultado.totalPaginas > 1 ? <Paginacao resultado={resultado} parametros={parametros} /> : null}
    </div>
  );
}

function Paginacao({
  resultado,
  parametros,
}: {
  resultado: Paginado<LeadComResponsavel>;
  parametros: Record<string, string | undefined>;
}) {
  const linkDaPagina = (pagina: number) => {
    const novos = new URLSearchParams();
    for (const [chave, valor] of Object.entries(parametros)) {
      if (valor && chave !== 'pagina') novos.set(chave, valor);
    }
    novos.set('pagina', String(pagina));
    return `/leads?${novos.toString()}`;
  };

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">
        Página {resultado.pagina} de {resultado.totalPaginas}
      </span>
      <div className="flex gap-2">
        {resultado.pagina > 1 ? (
          <Link href={linkDaPagina(resultado.pagina - 1)} className="botao-secundario">
            « Anterior
          </Link>
        ) : null}
        {resultado.pagina < resultado.totalPaginas ? (
          <Link href={linkDaPagina(resultado.pagina + 1)} className="botao-secundario">
            Próxima »
          </Link>
        ) : null}
      </div>
    </div>
  );
}
