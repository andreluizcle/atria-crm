'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import {
  PLATAFORMAS,
  ROTULO_PLATAFORMA,
  VARIAVEIS_DISPONIVEIS,
  contextoDoLead,
  interpolar,
  variaveisInvalidas,
  type Lead,
  type MensagemPronta,
  type Plataforma,
} from '@atria/core/cliente';
import { Aviso } from '@/components/ui/Aviso';
import { BotaoSubmit } from '@/components/ui/BotaoSubmit';
import type { ResultadoAction } from '@/actions/resultado';

/**
 * Editor de template com preview ao vivo (spec 6.3).
 *
 * O preview usa a MESMA funcao `interpolar` do envio real — se o preview
 * mostra certo, o disparo sai igual. Duplicar essa logica no cliente seria a
 * forma mais facil de o preview mentir.
 */
export function FormularioMensagem({
  acao,
  leadExemplo,
  nomeResponsavelExemplo,
  mensagem,
}: {
  acao: (anterior: unknown, formulario: FormData) => Promise<ResultadoAction>;
  leadExemplo: Lead;
  nomeResponsavelExemplo: string;
  mensagem?: MensagemPronta;
}) {
  const [resultado, executar] = useActionState(acao, null as ResultadoAction | null);

  const [plataforma, setPlataforma] = useState<Plataforma>(mensagem?.plataforma ?? 'whatsapp');
  const [assunto, setAssunto] = useState(mensagem?.assunto ?? '');
  const [conteudo, setConteudo] = useState(mensagem?.conteudo ?? '');

  const contexto = contextoDoLead(leadExemplo, nomeResponsavelExemplo);
  const invalidas = [...variaveisInvalidas(conteudo), ...variaveisInvalidas(assunto)];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form action={executar} className="space-y-4">
        {resultado && !resultado.ok ? <Aviso tipo="erro">{resultado.erro}</Aviso> : null}

        <div>
          <label className="rotulo" htmlFor="titulo">
            Título *
          </label>
          <input
            id="titulo"
            name="titulo"
            required
            className="campo"
            defaultValue={mensagem?.titulo}
            placeholder="Primeiro contato — WhatsApp"
          />
          <p className="mt-1 text-xs text-slate-500">É o rótulo que aparece no menu do bot.</p>
        </div>

        <div>
          <label className="rotulo" htmlFor="plataforma">
            Plataforma *
          </label>
          <select
            id="plataforma"
            name="plataforma"
            className="campo"
            value={plataforma}
            onChange={(e) => setPlataforma(e.target.value as Plataforma)}
          >
            {PLATAFORMAS.map((p) => (
              <option key={p} value={p}>
                {ROTULO_PLATAFORMA[p]}
              </option>
            ))}
          </select>
        </div>

        {plataforma === 'email' ? (
          <div>
            <label className="rotulo" htmlFor="assunto">
              Assunto * <span className="font-normal text-slate-500">(só para e-mail)</span>
            </label>
            <input
              id="assunto"
              name="assunto"
              required
              className="campo"
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
            />
          </div>
        ) : (
          <input type="hidden" name="assunto" value="" />
        )}

        <div>
          <label className="rotulo" htmlFor="conteudo">
            Mensagem *
          </label>
          <textarea
            id="conteudo"
            name="conteudo"
            required
            rows={12}
            className="campo font-mono text-xs"
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
          />
        </div>

        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-700">Variáveis disponíveis</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {VARIAVEIS_DISPONIVEIS.map((variavel) => (
              <button
                key={variavel}
                type="button"
                onClick={() => setConteudo((atual) => `${atual}{{${variavel}}}`)}
                className="rounded bg-white px-2 py-1 font-mono text-xs text-slate-600 ring-1 ring-slate-200 hover:bg-marca-50 hover:text-marca-700"
              >
                {`{{${variavel}}}`}
              </button>
            ))}
          </div>
        </div>

        {invalidas.length > 0 ? (
          <Aviso tipo="atencao">
            Estas variáveis não existem e sairiam vazias:{' '}
            <span className="font-mono">{invalidas.map((v) => `{{${v}}}`).join(', ')}</span>
          </Aviso>
        ) : null}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="ativo" defaultChecked={mensagem?.ativo ?? true} className="rounded" />
          Ativo (aparece no bot e no painel)
        </label>

        <div className="flex gap-3">
          <BotaoSubmit carregando="Salvando...">{mensagem ? 'Salvar' : 'Criar template'}</BotaoSubmit>
          <Link href="/mensagens" className="botao-secundario">
            Cancelar
          </Link>
        </div>
      </form>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <div className="cartao">
          <h2 className="mb-1 font-semibold">Preview</h2>
          <p className="mb-4 text-xs text-slate-500">
            Interpolado com o lead de exemplo <strong>{leadExemplo.nome}</strong>.
          </p>

          {plataforma === 'email' && assunto ? (
            <p className="mb-3 border-b border-slate-100 pb-3 text-sm">
              <span className="text-slate-500">Assunto: </span>
              <span className="font-medium">{interpolar(assunto, contexto)}</span>
            </p>
          ) : null}

          <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800">
            {conteudo ? interpolar(conteudo, contexto) : 'Escreva a mensagem ao lado para ver o preview.'}
          </pre>

          {plataforma === 'instagram' || plataforma === 'linkedin' ? (
            <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
              ℹ️ {ROTULO_PLATAFORMA[plataforma]} não permite pré-preencher mensagem. O painel copia o texto
              para a área de transferência e abre o perfil — o envio é sempre manual.
            </p>
          ) : null}

          {plataforma === 'email' ? (
            <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-amber-700">
              ⚠️ Templates de e-mail são enviados de verdade com um clique. Revise bem antes de ativar.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
