import Link from 'next/link';
import { listarUsuariosAtivos, obterLead } from '@atria/core';
import { exigirUsuarioLogado } from '@/lib/sessao';
import { atualizarLeadAction } from '@/actions/leadActions';
import { FormularioLead } from '@/components/leads/FormularioLead';

export default async function PaginaEditarLead({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, usuario } = await exigirUsuarioLogado();

  const [lead, membros] = await Promise.all([obterLead(db, id), listarUsuariosAtivos(db)]);

  // A action precisa do id, que so existe aqui. Fechamos sobre ele e passamos
  // uma funcao com a mesma assinatura que o formulario espera.
  const acao = atualizarLeadAction.bind(null, id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href={`/leads/${id}`} className="text-sm text-slate-500 hover:text-slate-700">
          « Voltar para o lead
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Editar {lead.nome}</h1>
      </div>

      <FormularioLead acao={acao} membros={membros} usuarioAtual={usuario} lead={lead} />
    </div>
  );
}
