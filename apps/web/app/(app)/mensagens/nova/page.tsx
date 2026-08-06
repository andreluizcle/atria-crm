import Link from 'next/link';
import { LEAD_DE_EXEMPLO, listarLeads } from '@atria/core';
import { exigirUsuarioLogado } from '@/lib/sessao';
import { criarMensagemAction } from '@/actions/mensagemActions';
import { FormularioMensagem } from '@/components/mensagens/FormularioMensagem';

export default async function PaginaNovaMensagem() {
  const { db, usuario } = await exigirUsuarioLogado();

  // Preview com um lead real quando existir; senao, o ficticio do core.
  const { itens } = await listarLeads(db, { porPagina: 1 });
  const leadExemplo = itens[0] ?? LEAD_DE_EXEMPLO;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/mensagens" className="text-sm text-slate-500 hover:text-slate-700">
          « Voltar para mensagens
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Novo template</h1>
      </div>

      <FormularioMensagem
        acao={criarMensagemAction}
        leadExemplo={leadExemplo}
        nomeResponsavelExemplo={usuario.nome}
      />
    </div>
  );
}
