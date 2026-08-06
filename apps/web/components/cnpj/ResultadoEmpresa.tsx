import { formatarCnpj, formatarTelefone, type EmpresaCnpj } from '@atria/core/cliente';

/** Cartao de uma empresa retornada pela BrasilAPI ou pela Casa dos Dados. */
export function ResultadoEmpresa({ empresa, selecao }: { empresa: EmpresaCnpj; selecao?: React.ReactNode }) {
  const semContato = !empresa.telefone && !empresa.email;

  return (
    <div className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4">
      {selecao ? <div className="pt-1">{selecao}</div> : null}

      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-900">{empresa.nome_fantasia || empresa.razao_social}</p>
        {empresa.nome_fantasia ? <p className="text-xs text-slate-500">{empresa.razao_social}</p> : null}

        <dl className="mt-2 grid gap-x-6 gap-y-1 text-xs text-slate-600 sm:grid-cols-2">
          <Item rotulo="CNPJ" valor={formatarCnpj(empresa.cnpj)} />
          <Item rotulo="Situação" valor={empresa.situacao_cadastral} />
          <Item rotulo="Atividade" valor={empresa.cnae_descricao} />
          <Item rotulo="Porte" valor={empresa.porte} />
          <Item
            rotulo="Local"
            valor={empresa.municipio && empresa.uf ? `${empresa.municipio}/${empresa.uf}` : null}
          />
          <Item rotulo="Telefone" valor={empresa.telefone ? formatarTelefone(empresa.telefone) : null} />
          <Item rotulo="E-mail" valor={empresa.email} />
        </dl>

        {semContato ? (
          <p className="mt-2 text-xs text-amber-700">
            ⚠️ Sem telefone nem e-mail — não pode virar lead (todo lead precisa de ao menos um contato).
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Item({ rotulo, valor }: { rotulo: string; valor?: string | null }) {
  if (!valor) return null;

  return (
    <div className="flex gap-1">
      <dt className="shrink-0 text-slate-400">{rotulo}:</dt>
      <dd className="truncate">{valor}</dd>
    </div>
  );
}
