import Link from 'next/link';
import { listarUsuariosAtivos } from '@atria/core';
import { exigirUsuarioLogado } from '@/lib/sessao';
import { criarLeadAction } from '@/actions/leadActions';
import { FormularioLead } from '@/components/leads/FormularioLead';

export default async function PaginaNovoLead() {
  const { db, usuario } = await exigirUsuarioLogado();
  const membros = await listarUsuariosAtivos(db);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/leads" className="text-sm text-slate-500 hover:text-slate-700">
          « Voltar para leads
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Novo lead</h1>
      </div>

      <FormularioLead acao={criarLeadAction} membros={membros} usuarioAtual={usuario} />
    </div>
  );
}
