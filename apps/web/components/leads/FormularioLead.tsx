'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import {
  ORIGENS_LEAD,
  ROTULO_ORIGEM_LEAD,
  ROTULO_STATUS_LEAD,
  STATUS_LEAD,
  formatarCnpj,
  formatarTelefone,
  type Lead,
  type Usuario,
} from '@atria/core/cliente';
import { Aviso } from '@/components/ui/Aviso';
import { BotaoSubmit } from '@/components/ui/BotaoSubmit';
import type { ResultadoAction } from '@/actions/resultado';

/**
 * Formulario unico de criacao e edicao.
 *
 * Nao ha validacao de regra de negocio aqui de proposito: o `required` do HTML
 * so evita ida ao servidor por engano. Quem decide se o lead e valido e o
 * leadService, no servidor (spec 4).
 */
export function FormularioLead({
  acao,
  membros,
  usuarioAtual,
  lead,
}: {
  acao: (anterior: unknown, formulario: FormData) => Promise<ResultadoAction>;
  membros: Usuario[];
  usuarioAtual: Usuario;
  lead?: Lead;
}) {
  const [resultado, executar] = useActionState(acao, null as ResultadoAction | null);

  const erroDoCampo = (campo: string): boolean =>
    Boolean(resultado && !resultado.ok && resultado.campos?.includes(campo));

  return (
    <form action={executar} className="space-y-6">
      {resultado && !resultado.ok ? <Aviso tipo="erro">{resultado.erro}</Aviso> : null}

      <section className="cartao space-y-4">
        <h2 className="font-semibold">Identificação</h2>

        <Campo rotulo="Nome *" nome="nome" obrigatorio valor={lead?.nome} erro={erroDoCampo('nome')} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            rotulo="CNPJ"
            nome="cnpj"
            valor={lead?.cnpj ? formatarCnpj(lead.cnpj) : ''}
            dica="Só os 14 dígitos ou já formatado"
            erro={erroDoCampo('cnpj')}
          />
          <Campo rotulo="Site" nome="site" valor={lead?.site ?? ''} dica="ex: atria.com.br" />
        </div>
      </section>

      <section className="cartao space-y-4">
        <h2 className="font-semibold">Contato</h2>
        <p className="-mt-2 text-sm text-slate-500">
          Preencha <strong>pelo menos um</strong>. Sem nenhum canal, não há como prospectar.
        </p>

        {erroDoCampo('contato') ? (
          <Aviso tipo="erro">Preencha ao menos telefone, e-mail, Instagram ou LinkedIn.</Aviso>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            rotulo="Telefone"
            nome="telefone"
            valor={lead?.telefone ? formatarTelefone(lead.telefone) : ''}
            dica="Com DDD. É o que gera o link do WhatsApp."
            erro={erroDoCampo('telefone')}
          />
          <Campo
            rotulo="E-mail"
            nome="email"
            tipo="email"
            valor={lead?.email ?? ''}
            dica="Necessário para o envio automático de e-mail."
            erro={erroDoCampo('email')}
          />
          <Campo rotulo="Instagram" nome="instagram" valor={lead?.instagram ?? ''} dica="@perfil ou URL" />
          <Campo rotulo="LinkedIn" nome="linkedin" valor={lead?.linkedin ?? ''} dica="URL do perfil ou página" />
        </div>
      </section>

      <section className="cartao space-y-4">
        <h2 className="font-semibold">Gestão</h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="rotulo" htmlFor="origem_lead">
              Origem *
            </label>
            <select id="origem_lead" name="origem_lead" required className="campo" defaultValue={lead?.origem_lead ?? 'indicacao'}>
              {ORIGENS_LEAD.map((origem) => (
                <option key={origem} value={origem}>
                  {ROTULO_ORIGEM_LEAD[origem]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="rotulo" htmlFor="status">
              Status *
            </label>
            <select id="status" name="status" required className="campo" defaultValue={lead?.status ?? 'pendente'}>
              {STATUS_LEAD.map((status) => (
                <option key={status} value={status}>
                  {ROTULO_STATUS_LEAD[status]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="rotulo" htmlFor="responsavel_id">
              Responsável *
            </label>
            <select
              id="responsavel_id"
              name="responsavel_id"
              required
              className="campo"
              defaultValue={lead?.responsavel_id ?? usuarioAtual.id}
            >
              {membros.map((membro) => (
                <option key={membro.id} value={membro.id}>
                  {membro.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="rotulo" htmlFor="observacoes">
            Observações
          </label>
          <textarea
            id="observacoes"
            name="observacoes"
            rows={4}
            className="campo"
            defaultValue={lead?.observacoes ?? ''}
            placeholder="Quem indicou, o que já foi conversado, contexto da empresa..."
          />
        </div>
      </section>

      <div className="flex gap-3">
        <BotaoSubmit carregando="Salvando...">{lead ? 'Salvar alterações' : 'Cadastrar lead'}</BotaoSubmit>
        <Link href={lead ? `/leads/${lead.id}` : '/leads'} className="botao-secundario">
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function Campo({
  rotulo,
  nome,
  valor,
  dica,
  tipo = 'text',
  obrigatorio = false,
  erro = false,
}: {
  rotulo: string;
  nome: string;
  valor?: string | null;
  dica?: string;
  tipo?: string;
  obrigatorio?: boolean;
  erro?: boolean;
}) {
  return (
    <div>
      <label className="rotulo" htmlFor={nome}>
        {rotulo}
      </label>
      <input
        id={nome}
        name={nome}
        type={tipo}
        required={obrigatorio}
        defaultValue={valor ?? ''}
        className={`campo ${erro ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`}
      />
      {dica ? <p className="mt-1 text-xs text-slate-500">{dica}</p> : null}
    </div>
  );
}
