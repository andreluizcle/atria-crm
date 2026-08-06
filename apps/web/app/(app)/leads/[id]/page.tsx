import Link from 'next/link';
import {
  ROTULO_ORIGEM_LEAD,
  formatarCnpj,
  formatarTelefone,
  listarHistoricoDoLead,
  listarMensagensParaLead,
  obterLead,
} from '@atria/core';
import { exigirUsuarioLogado } from '@/lib/sessao';
import { EtiquetaStatus } from '@/components/ui/Etiqueta';
import { ContatoRapido } from '@/components/leads/ContatoRapido';
import { HistoricoContatos } from '@/components/leads/HistoricoContatos';
import { BotaoRemoverLead } from '@/components/leads/BotaoRemoverLead';
import { SeletorStatus } from '@/components/leads/SeletorStatus';

/** Ficha do lead com contato rapido e historico (spec 6.2 e 6.4). */
export default async function PaginaLead({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await exigirUsuarioLogado();

  const lead = await obterLead(db, id);
  const [templates, historico] = await Promise.all([
    listarMensagensParaLead(db, lead),
    listarHistoricoDoLead(db, id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/leads" className="text-sm text-slate-500 hover:text-slate-700">
          « Voltar para leads
        </Link>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{lead.nome}</h1>
            <EtiquetaStatus status={lead.status} />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <SeletorStatus leadId={id} status={lead.status} />
            <Link href={`/leads/${id}/editar`} className="botao-secundario">
              Editar
            </Link>
            <BotaoRemoverLead leadId={id} nome={lead.nome} />
          </div>
        </div>
      </div>

      <section className="cartao">
        <h2 className="mb-4 font-semibold">Contato rápido</h2>
        <ContatoRapido leadId={id} nomeDoLead={lead.nome} templates={templates} />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="cartao lg:col-span-1">
          <h2 className="mb-4 font-semibold">Dados</h2>
          <dl className="space-y-3 text-sm">
            <Dado rotulo="Responsável" valor={lead.responsavel_nome} />
            <Dado rotulo="Origem" valor={ROTULO_ORIGEM_LEAD[lead.origem_lead]} />
            <Dado rotulo="Telefone" valor={lead.telefone ? formatarTelefone(lead.telefone) : null} />
            <Dado rotulo="E-mail" valor={lead.email} />
            <DadoLink rotulo="Instagram" url={lead.instagram} />
            <DadoLink rotulo="LinkedIn" url={lead.linkedin} />
            <DadoLink rotulo="Site" url={lead.site} />
            <Dado rotulo="CNPJ" valor={lead.cnpj ? formatarCnpj(lead.cnpj) : null} />
            <Dado
              rotulo="Cadastrado em"
              valor={new Date(lead.criado_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
            />
          </dl>

          {lead.observacoes ? (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Observações</p>
              <p className="whitespace-pre-wrap text-sm text-slate-700">{lead.observacoes}</p>
            </div>
          ) : null}
        </section>

        <section className="cartao lg:col-span-2">
          <h2 className="mb-4 font-semibold">Histórico de contatos</h2>
          <HistoricoContatos historico={historico} />
        </section>
      </div>
    </div>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor?: string | null }) {
  if (!valor) return null;

  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{rotulo}</dt>
      <dd className="text-slate-800">{valor}</dd>
    </div>
  );
}

function DadoLink({ rotulo, url }: { rotulo: string; url?: string | null }) {
  if (!url) return null;

  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{rotulo}</dt>
      <dd>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-marca-600 hover:underline"
        >
          {url}
        </a>
      </dd>
    </div>
  );
}
