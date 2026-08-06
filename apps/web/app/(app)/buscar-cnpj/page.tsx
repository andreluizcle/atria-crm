import { casaDosDadosConfigurada, listarUsuariosAtivos } from '@atria/core';
import { exigirUsuarioLogado } from '@/lib/sessao';
import { ConsultaCnpj } from '@/components/cnpj/ConsultaCnpj';
import { BuscaAvancada } from '@/components/cnpj/BuscaAvancada';
import { Aviso } from '@/components/ui/Aviso';

/**
 * Duas coisas diferentes na mesma tela (spec 6.5):
 *   a) consulta de um CNPJ conhecido — BrasilAPI, gratuita
 *   b) busca por regiao/setor — Casa dos Dados, PAGA por consulta
 */
export default async function PaginaBuscarCnpj() {
  const { db, usuario } = await exigirUsuarioLogado();
  const membros = await listarUsuariosAtivos(db);
  const buscaAvancadaDisponivel = casaDosDadosConfigurada();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Buscar empresas</h1>
        <p className="mt-1 text-sm text-slate-500">
          Consulte um CNPJ específico ou encontre empresas por região e setor.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="font-semibold">Consultar um CNPJ</h2>
          <p className="text-sm text-slate-500">
            Dados da Receita Federal via BrasilAPI. Gratuito e sem limite prático.
          </p>
        </div>
        <ConsultaCnpj membros={membros} usuarioAtual={usuario} />
      </section>

      <section className="space-y-4 border-t border-slate-200 pt-8">
        <div>
          <h2 className="font-semibold">Buscar por região e setor</h2>
          <p className="text-sm text-slate-500">
            Base da Casa dos Dados. <strong>Cada busca consome saldo pago da EJ</strong> — use filtros
            específicos.
          </p>
        </div>

        {buscaAvancadaDisponivel ? (
          <BuscaAvancada membros={membros} usuarioAtual={usuario} />
        ) : (
          <Aviso tipo="atencao" titulo="Integração não configurada">
            A busca por região/setor precisa de uma chave da Casa dos Dados. Defina{' '}
            <code className="font-mono">CASA_DOS_DADOS_API_KEY</code> nas variáveis de ambiente para
            habilitar. A consulta de CNPJ individual acima continua funcionando normalmente.
          </Aviso>
        )}
      </section>
    </div>
  );
}
