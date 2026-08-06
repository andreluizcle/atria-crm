import type { HistoricoComDetalhes } from '@atria/core/cliente';
import { EtiquetaPlataforma } from '@/components/ui/Etiqueta';

const ROTULO_ENVIO = {
  preparado: { texto: 'Preparado para envio manual', cor: 'text-slate-500' },
  enviado: { texto: 'Enviado automaticamente', cor: 'text-emerald-600' },
  falhou: { texto: 'Falhou', cor: 'text-red-600' },
} as const;

/**
 * Linha do tempo dos contatos (spec 6.2).
 *
 * A distincao entre "preparado" e "enviado" e importante: em WhatsApp,
 * Instagram e LinkedIn o sistema so monta a mensagem — quem envia e a pessoa.
 * Marcar tudo como "enviado" daria uma falsa sensacao de follow-up feito.
 */
export function HistoricoContatos({ historico }: { historico: HistoricoComDetalhes[] }) {
  if (historico.length === 0) {
    return <p className="text-sm text-slate-500">Nenhum contato registrado ainda.</p>;
  }

  return (
    <ol className="space-y-4">
      {historico.map((item) => {
        const rotulo = ROTULO_ENVIO[item.status_envio];

        return (
          <li key={item.id} className="border-l-2 border-slate-200 pl-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <EtiquetaPlataforma plataforma={item.plataforma} />
              <span className="font-medium">{item.mensagem_titulo ?? 'Template removido'}</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500">{item.usuario_nome ?? 'desconhecido'}</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500">
                {new Date(item.enviado_em).toLocaleString('pt-BR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                  timeZone: 'America/Sao_Paulo',
                })}
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-xs text-slate-500">via {item.origem === 'telegram' ? 'bot' : 'painel'}</span>
            </div>

            <p className={`mt-1 text-xs ${rotulo.cor}`}>{rotulo.texto}</p>

            {item.erro ? <p className="mt-1 text-xs text-red-600">Erro: {item.erro}</p> : null}

            {item.conteudo_enviado ? (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-700">
                  Ver mensagem
                </summary>
                <pre className="mt-2 whitespace-pre-wrap rounded bg-slate-50 p-3 text-xs text-slate-700">
                  {item.conteudo_enviado}
                </pre>
              </details>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
