import Link from 'next/link';
import { LEAD_DE_EXEMPLO, listarLeads, obterMensagem } from '@atria/core';
import { exigirUsuarioLogado } from '@/lib/sessao';
import { atualizarMensagemAction } from '@/actions/mensagemActions';
import { FormularioMensagem } from '@/components/mensagens/FormularioMensagem';

export default async function PaginaEditarMensagem({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, usuario } = await exigirUsuarioLogado();

  const [mensagem, { itens }] = await Promise.all([obterMensagem(db, id), listarLeads(db, { porPagina: 1 })]);
  const leadExemplo = itens[0] ?? LEAD_DE_EXEMPLO;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/mensagens" className="text-sm text-slate-500 hover:text-slate-700">
          « Voltar para mensagens
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{mensagem.titulo}</h1>
      </div>

      <FormularioMensagem
        acao={atualizarMensagemAction.bind(null, id)}
        leadExemplo={leadExemplo}
        nomeResponsavelExemplo={usuario.nome}
        mensagem={mensagem}
      />
    </div>
  );
}
