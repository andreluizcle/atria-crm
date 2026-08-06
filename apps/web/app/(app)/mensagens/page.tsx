import Link from 'next/link';
import { listarMensagens } from '@atria/core';
import { exigirUsuarioLogado } from '@/lib/sessao';
import { EtiquetaPlataforma } from '@/components/ui/Etiqueta';
import { ListaVazia } from '@/components/ui/Aviso';
import { AcoesDoTemplate } from '@/components/mensagens/AcoesDoTemplate';

/** CRUD de templates (spec 6.3). */
export default async function PaginaMensagens() {
  const { db } = await exigirUsuarioLogado();
  const mensagens = await listarMensagens(db);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mensagens prontas</h1>
          <p className="mt-1 text-sm text-slate-500">
            Templates usados pelo bot e pelo contato rápido do painel.
          </p>
        </div>
        <Link href="/mensagens/nova" className="botao-primario">
          + Novo template
        </Link>
      </div>

      {mensagens.length === 0 ? (
        <ListaVazia
          titulo="Nenhum template ainda"
          descricao="Crie um por canal para começar a disparar mensagens pelo bot."
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {mensagens.map((mensagem) => (
            <li key={mensagem.id} className={`cartao ${mensagem.ativo ? '' : 'opacity-60'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <EtiquetaPlataforma plataforma={mensagem.plataforma} />
                    {!mensagem.ativo ? (
                      <span className="text-xs font-medium text-slate-500">inativo</span>
                    ) : null}
                  </div>
                  <h2 className="mt-2 font-semibold">{mensagem.titulo}</h2>
                </div>
              </div>

              {mensagem.assunto ? (
                <p className="mt-2 text-xs text-slate-500">
                  <span className="font-medium">Assunto:</span> {mensagem.assunto}
                </p>
              ) : null}

              <pre className="mt-3 line-clamp-4 whitespace-pre-wrap font-sans text-sm text-slate-600">
                {mensagem.conteudo}
              </pre>

              <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                <Link href={`/mensagens/${mensagem.id}`} className="botao-secundario">
                  Editar
                </Link>
                <AcoesDoTemplate id={mensagem.id} titulo={mensagem.titulo} ativo={mensagem.ativo} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
