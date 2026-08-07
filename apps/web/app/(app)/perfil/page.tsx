import { exigirUsuarioLogado } from '@/lib/sessao';
import { atualizarNomeAction } from '@/actions/perfilActions';
import { VincularTelegram } from '@/components/VincularTelegram';
import { FormularioNome } from '@/components/perfil/FormularioNome';

export default async function PaginaPerfil() {
  const { usuario } = await exigirUsuarioLogado();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meu perfil</h1>
        <p className="mt-1 text-sm text-slate-500">Seus dados e a conexão com o bot do Telegram.</p>
      </div>

      <section className="cartao space-y-4">
        <FormularioNome acao={atualizarNomeAction} nomeAtual={usuario.nome} />

        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">E-mail</p>
          <p className="text-slate-800">{usuario.email}</p>
          <p className="mt-1 text-xs text-slate-500">
            O e-mail vem do seu acesso e não muda por aqui.
          </p>
        </div>
      </section>

      <section className="cartao">
        <h2 className="font-semibold">Telegram</h2>
        <p className="mt-1 text-sm text-slate-500">
          Vincular permite cadastrar e consultar leads pelo bot. O link é pessoal e vale 15 minutos.
        </p>

        <div className="mt-4">
          <VincularTelegram jaVinculado={Boolean(usuario.telegram_user_id)} />
        </div>
      </section>
    </div>
  );
}
