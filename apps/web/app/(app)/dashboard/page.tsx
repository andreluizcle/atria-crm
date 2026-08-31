import Link from 'next/link';
import { ROTULO_STATUS_LEAD, obterResumoDashboard } from '@atria/core';
import { exigirUsuarioLogado } from '@/lib/sessao';

/** Resumo do funil (spec 6.6). Numeros e barras — sem sofisticacao no MVP. */
export default async function PaginaDashboard() {
  const { db, usuario } = await exigirUsuarioLogado();
  const resumo = await obterResumoDashboard(db);

  const maiorPorStatus = Math.max(1, ...resumo.porStatus.map((s) => s.total));
  const maiorPorMembro = Math.max(1, ...resumo.porResponsavel.map((r) => r.total));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Olá, {usuario.nome.split(' ')[0]} 👋</h1>
        <p className="mt-1 text-sm text-slate-500">Como está o funil de prospecção da EJ.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Indicador rotulo="Leads ativos" valor={resumo.total} />
        <Indicador rotulo="Em andamento" valor={resumo.emAndamento} />
        <Indicador rotulo="Taxa de fechamento" valor={`${resumo.taxaDeFechamento}%`} />
      </div>

      {resumo.total === 0 ? (
        <div className="cartao text-center">
          <p className="font-medium">Nenhum lead ainda.</p>
          <p className="mt-1 text-sm text-slate-500">
            Comece cadastrando um{' '}
            <Link href="/leads/novo" className="text-marca-600 underline">
              lead manualmente
            </Link>{' '}
            ou importando empresas na{' '}
            <Link href="/buscar-cnpj" className="text-marca-600 underline">
              busca por CNPJ
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="cartao">
            <h2 className="mb-4 font-semibold">Leads por status</h2>
            <ul className="space-y-3">
              {resumo.porStatus.map((item) => (
                <li key={item.status}>
                  <Link
                    href={`/leads?status=${item.status}`}
                    className="flex items-center gap-3 text-sm hover:opacity-80"
                  >
                    <span className="w-24 shrink-0 text-slate-600">{ROTULO_STATUS_LEAD[item.status]}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <span
                        className="block h-full rounded-full bg-marca-500"
                        style={{ width: `${(item.total / maiorPorStatus) * 100}%` }}
                      />
                    </span>
                    <span className="w-8 shrink-0 text-right font-medium tabular-nums">{item.total}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="cartao">
            <h2 className="mb-4 font-semibold">Leads por responsável</h2>
            {resumo.porResponsavel.length === 0 ? (
              <p className="text-sm text-slate-500">Ninguém com leads atribuídos.</p>
            ) : (
              <ul className="space-y-3">
                {resumo.porResponsavel.map((item) => (
                  <li key={item.responsavel_id}>
                    <Link
                      href={`/leads?responsavel=${item.responsavel_id}`}
                      className="flex items-center gap-3 text-sm hover:opacity-80"
                    >
                      <span className="w-32 shrink-0 truncate text-slate-600">{item.responsavel_nome}</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <span
                          className="block h-full rounded-full bg-emerald-500"
                          style={{ width: `${(item.total / maiorPorMembro) * 100}%` }}
                        />
                      </span>
                      <span className="w-8 shrink-0 text-right font-medium tabular-nums">{item.total}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Indicador({ rotulo, valor }: { rotulo: string; valor: number | string }) {
  return (
    <div className="cartao">
      <p className="text-sm text-slate-500">{rotulo}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{valor}</p>
    </div>
  );
}
