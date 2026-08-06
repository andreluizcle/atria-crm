import { ROTULO_PLATAFORMA, ROTULO_STATUS_LEAD, type Plataforma, type StatusLead } from '@atria/core/cliente';

/** Etiquetas coloridas de status e plataforma, para a lista e a ficha do lead. */

const CORES_STATUS: Record<StatusLead, string> = {
  novo: 'bg-slate-100 text-slate-700 ring-slate-200',
  contatado: 'bg-blue-50 text-blue-700 ring-blue-200',
  respondeu: 'bg-amber-50 text-amber-700 ring-amber-200',
  descartado: 'bg-red-50 text-red-700 ring-red-200',
  fechado: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

export function EtiquetaStatus({ status }: { status: StatusLead }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${CORES_STATUS[status]}`}
    >
      {ROTULO_STATUS_LEAD[status]}
    </span>
  );
}

const CORES_PLATAFORMA: Record<Plataforma, string> = {
  whatsapp: 'bg-green-50 text-green-700 ring-green-200',
  instagram: 'bg-pink-50 text-pink-700 ring-pink-200',
  linkedin: 'bg-sky-50 text-sky-700 ring-sky-200',
  email: 'bg-violet-50 text-violet-700 ring-violet-200',
};

export function EtiquetaPlataforma({ plataforma }: { plataforma: Plataforma }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${CORES_PLATAFORMA[plataforma]}`}
    >
      {ROTULO_PLATAFORMA[plataforma]}
    </span>
  );
}
