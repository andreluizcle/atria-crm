import Link from 'next/link';
import {
  listarLeads,
  listarUsuariosAtivos,
  type FiltroLeads,
  type OrigemLead,
  type StatusLead,
} from '@atria/core';
import { exigirUsuarioLogado } from '@/lib/sessao';
import { FiltrosLeads } from '@/components/leads/FiltrosLeads';
import { TabelaLeads } from '@/components/leads/TabelaLeads';
import { ListaVazia } from '@/components/ui/Aviso';

/** Listagem com filtros e busca (spec 6.2). */
export default async function PaginaLeads({
  searchParams,
}: {
  searchParams: Promise<{
    busca?: string;
    status?: string;
    origem?: string;
    responsavel?: string;
    pagina?: string;
  }>;
}) {
  const { db } = await exigirUsuarioLogado();
  const parametros = await searchParams;

  const filtro: FiltroLeads = {
    busca: parametros.busca,
    status: parametros.status as StatusLead | undefined,
    origem_lead: parametros.origem as OrigemLead | undefined,
    responsavel_id: parametros.responsavel,
    pagina: Number(parametros.pagina) || 1,
    porPagina: 20,
  };

  const [resultado, membros] = await Promise.all([listarLeads(db, filtro), listarUsuariosAtivos(db)]);

  const temFiltroAtivo = Boolean(
    parametros.busca || parametros.status || parametros.origem || parametros.responsavel,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="mt-1 text-sm text-slate-500">
            {resultado.total} lead(s) {temFiltroAtivo ? 'com os filtros aplicados' : 'no total'}
          </p>
        </div>
        <Link href="/leads/novo" className="botao-primario">
          + Novo lead
        </Link>
      </div>

      <FiltrosLeads membros={membros} />

      {resultado.total === 0 ? (
        <ListaVazia
          titulo={temFiltroAtivo ? 'Nenhum lead com esses filtros' : 'Nenhum lead cadastrado'}
          descricao={
            temFiltroAtivo
              ? 'Tente afrouxar a busca ou limpar os filtros.'
              : 'Cadastre o primeiro lead ou importe empresas pela busca de CNPJ.'
          }
        />
      ) : (
        <TabelaLeads resultado={resultado} parametros={parametros} />
      )}
    </div>
  );
}
