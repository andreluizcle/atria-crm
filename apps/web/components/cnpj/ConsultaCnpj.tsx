'use client';

import { useState, useTransition } from 'react';
import type { EmpresaCnpj, Usuario } from '@atria/core/cliente';
import { consultarCnpjAction, importarEmpresasAction } from '@/actions/cnpjActions';
import { Aviso } from '@/components/ui/Aviso';
import { ResultadoEmpresa } from './ResultadoEmpresa';

/** Consulta pontual (spec 6.5a) com opcao de virar lead direto. */
export function ConsultaCnpj({ membros, usuarioAtual }: { membros: Usuario[]; usuarioAtual: Usuario }) {
  const [cnpj, setCnpj] = useState('');
  const [empresa, setEmpresa] = useState<EmpresaCnpj | null>(null);
  const [responsavel, setResponsavel] = useState(usuarioAtual.id);
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'sucesso'; texto: string } | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  function consultar(evento: React.FormEvent) {
    evento.preventDefault();
    setAviso(null);
    setEmpresa(null);

    iniciarTransicao(async () => {
      const resultado = await consultarCnpjAction(cnpj);

      if (resultado.ok) setEmpresa(resultado.empresa);
      else setAviso({ tipo: 'erro', texto: resultado.erro });
    });
  }

  function importar() {
    if (!empresa) return;

    iniciarTransicao(async () => {
      const resultado = await importarEmpresasAction([empresa], responsavel);

      setAviso(
        resultado.ok
          ? { tipo: 'sucesso', texto: resultado.mensagem ?? 'Importado.' }
          : { tipo: 'erro', texto: resultado.erro },
      );
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={consultar} className="flex flex-wrap gap-2">
        <input
          className="campo max-w-xs"
          placeholder="00.000.000/0000-00"
          value={cnpj}
          onChange={(e) => setCnpj(e.target.value)}
        />
        <button type="submit" disabled={pendente || cnpj.trim() === ''} className="botao-primario">
          {pendente ? 'Consultando...' : 'Consultar'}
        </button>
      </form>

      {aviso ? <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso> : null}

      {empresa ? (
        <div className="space-y-3">
          <ResultadoEmpresa empresa={empresa} />

          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="rotulo" htmlFor="responsavel-consulta">
                Responsável pelo lead
              </label>
              <select
                id="responsavel-consulta"
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
              disabled={pendente || (!empresa.telefone && !empresa.email)}
              onClick={importar}
            >
              {pendente ? 'Importando...' : 'Cadastrar como lead'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
