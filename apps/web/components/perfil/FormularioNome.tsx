'use client';

import { useActionState } from 'react';
import { MAX_NOME_USUARIO } from '@atria/core/cliente';
import type { ResultadoAction } from '@/actions/resultado';
import { Aviso } from '@/components/ui/Aviso';
import { BotaoSubmit } from '@/components/ui/BotaoSubmit';

/**
 * Nome de exibicao do membro.
 *
 * Vale a pena saber onde isso aparece: e o `{{responsavel}}` interpolado nas
 * mensagens enviadas, entao mudar aqui muda o que o lead le no proximo disparo.
 * Sem esta tela, quem foi cadastrado pelo dashboard do Supabase ficava com o
 * pedaco do e-mail antes do @ como nome.
 */
export function FormularioNome({
  acao,
  nomeAtual,
}: {
  acao: (anterior: unknown, formulario: FormData) => Promise<ResultadoAction>;
  nomeAtual: string;
}) {
  const [resultado, executar] = useActionState(acao, null as ResultadoAction | null);

  const comErro = Boolean(resultado && !resultado.ok);

  return (
    <form action={executar} className="space-y-3">
      {resultado && !resultado.ok ? <Aviso tipo="erro">{resultado.erro}</Aviso> : null}
      {resultado?.ok && resultado.mensagem ? (
        <Aviso tipo="sucesso">{resultado.mensagem}</Aviso>
      ) : null}

      <div>
        <label className="rotulo" htmlFor="nome">
          Nome
        </label>
        <input
          id="nome"
          name="nome"
          type="text"
          required
          maxLength={MAX_NOME_USUARIO}
          defaultValue={nomeAtual}
          className={`campo ${comErro ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`}
        />
        <p className="mt-1 text-xs text-slate-500">
          É este nome que aparece nas mensagens enviadas aos leads, no lugar de{' '}
          <code className="rounded bg-slate-100 px-1">{'{{responsavel}}'}</code>.
        </p>
      </div>

      <BotaoSubmit carregando="Salvando...">Salvar nome</BotaoSubmit>
    </form>
  );
}
