'use client';

import { useState, useTransition } from 'react';
import type { EmpresaCnpj, FiltroBuscaEmpresas, ResultadoBuscaEmpresas, Usuario } from '@atria/core/cliente';
import { buscarEmpresasAction, importarEmpresasAction } from '@/actions/cnpjActions';
import { Aviso } from '@/components/ui/Aviso';
import { ResultadoEmpresa } from './ResultadoEmpresa';

/**
 * Busca em lote na Casa dos Dados e importacao como leads (spec 6.5b).
 *
 * Dois cuidados de UX que existem por causa do custo da API:
 *   - o filtro "só com telefone/e-mail" vem LIGADO, porque empresa sem contato
 *     nao pode virar lead e a consulta teria sido desperdicio;
 *   - a paginacao e explicita, para ninguem varrer 50 paginas sem perceber.
 */
export function BuscaAvancada({ membros, usuarioAtual }: { membros: Usuario[]; usuarioAtual: Usuario }) {
  const [filtro, setFiltro] = useState<FiltroBuscaEmpresas>({
    uf: '',
    municipio: '',
    somenteAtivas: true,
    comTelefone: true,
  });

  const [resultado, setResultado] = useState<ResultadoBuscaEmpresas | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [responsavel, setResponsavel] = useState(usuarioAtual.id);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'sucesso'; texto: string } | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  function buscar(pagina = 1) {
    setAviso(null);

    iniciarTransicao(async () => {
      const resposta = await buscarEmpresasAction({ ...filtro, pagina });

      if (!resposta.ok) {
        setAviso({ tipo: 'erro', texto: resposta.erro });
        setResultado(null);
        return;
      }

      setResultado(resposta.dados);
      setSelecionados(new Set());
    });
  }

  function alternar(cnpj: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(cnpj)) novo.delete(cnpj);
      else novo.add(cnpj);
      return novo;
    });
  }

  function importar() {
    const escolhidas = (resultado?.empresas ?? []).filter((e) => selecionados.has(e.cnpj));
    if (escolhidas.length === 0) return;

    iniciarTransicao(async () => {
      const resposta = await importarEmpresasAction(escolhidas, responsavel);

      setAviso(
        resposta.ok
          ? { tipo: 'sucesso', texto: resposta.mensagem ?? 'Importado.' }
          : { tipo: 'erro', texto: resposta.erro },
      );
      if (resposta.ok) setSelecionados(new Set());
    });
  }

  const importaveis = (resultado?.empresas ?? []).filter((e) => e.telefone || e.email);

  return (
    <div className="space-y-4">
      <form
        className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          buscar(1);
        }}
      >
        <div>
          <label className="rotulo" htmlFor="uf">
            UF
          </label>
          <input
            id="uf"
            className="campo"
            maxLength={2}
            placeholder="SP"
            value={filtro.uf ?? ''}
            onChange={(e) => setFiltro({ ...filtro, uf: e.target.value.toUpperCase() })}
          />
        </div>

        <div>
          <label className="rotulo" htmlFor="municipio">
            Município
          </label>
          <input
            id="municipio"
            className="campo"
            placeholder="São Paulo"
            value={filtro.municipio ?? ''}
            onChange={(e) => setFiltro({ ...filtro, municipio: e.target.value })}
          />
        </div>

        <div className="lg:col-span-2">
          <label className="rotulo" htmlFor="cnaes">
            CNAE (códigos separados por vírgula)
          </label>
          <input
            id="cnaes"
            className="campo"
            placeholder="5611201, 4712100"
            onChange={(e) =>
              setFiltro({
                ...filtro,
                cnaes: e.target.value
                  .split(',')
                  .map((c) => c.replace(/\D/g, ''))
                  .filter(Boolean),
              })
            }
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filtro.somenteAtivas ?? true}
            onChange={(e) => setFiltro({ ...filtro, somenteAtivas: e.target.checked })}
          />
          Só empresas ativas
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filtro.comTelefone ?? false}
            onChange={(e) => setFiltro({ ...filtro, comTelefone: e.target.checked })}
          />
          Só com telefone
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filtro.comEmail ?? false}
            onChange={(e) => setFiltro({ ...filtro, comEmail: e.target.checked })}
          />
          Só com e-mail
        </label>

        <div className="flex items-end">
          <button type="submit" disabled={pendente} className="botao-primario w-full">
            {pendente ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </form>

      {aviso ? <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso> : null}

      {resultado ? (
        resultado.empresas.length === 0 ? (
          <Aviso tipo="info">Nenhuma empresa com esses filtros. Tente afrouxar a busca.</Aviso>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <span className="text-slate-600">
                {resultado.total} encontrada(s) — página {resultado.pagina}, mostrando{' '}
                {resultado.empresas.length}
              </span>
              <button
                type="button"
                className="text-marca-600 hover:underline"
                onClick={() =>
                  setSelecionados(
                    selecionados.size === importaveis.length
                      ? new Set()
                      : new Set(importaveis.map((e) => e.cnpj)),
                  )
                }
              >
                {selecionados.size === importaveis.length ? 'Limpar seleção' : 'Selecionar todas com contato'}
              </button>
            </div>

            <ul className="space-y-2">
              {resultado.empresas.map((empresa: EmpresaCnpj) => (
                <li key={empresa.cnpj}>
                  <ResultadoEmpresa
                    empresa={empresa}
                    selecao={
                      <input
                        type="checkbox"
                        disabled={!empresa.telefone && !empresa.email}
                        checked={selecionados.has(empresa.cnpj)}
                        onChange={() => alternar(empresa.cnpj)}
                      />
                    }
                  />
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-end justify-between gap-3 border-t border-slate-200 pt-4">
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="rotulo" htmlFor="responsavel-busca">
                    Responsável
                  </label>
                  <select
                    id="responsavel-busca"
                    className="campo"
                    value={responsavel}
                    onChange={(e) => setResponsavel(e.target.value)}
                  >
                    {membros.map((membro) => (
                      <option key={membro.id} value={membro.id}>
                        {membro.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  className="botao-primario"
                  disabled={pendente || selecionados.size === 0}
                  onClick={importar}
                >
                  Importar {selecionados.size} como lead(s)
                </button>
              </div>

              <div className="flex gap-2">
                {resultado.pagina > 1 ? (
                  <button className="botao-secundario" onClick={() => buscar(resultado.pagina - 1)}>
                    « Anterior
                  </button>
                ) : null}
                <button className="botao-secundario" onClick={() => buscar(resultado.pagina + 1)}>
                  Próxima página »
                </button>
              </div>
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}
