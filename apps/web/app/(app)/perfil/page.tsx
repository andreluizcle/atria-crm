import { exigirUsuarioLogado } from '@/lib/sessao';
import { VincularTelegram } from '@/components/VincularTelegram';

export default async function PaginaPerfil() {
  const { usuario } = await exigirUsuarioLogado();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meu perfil</h1>
        <p className="mt-1 text-sm text-slate-500">Seus dados e a conexão com o bot do Telegram.</p>
      </div>

      <section className="cartao space-y-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Nome</p>
          <p className="text-slate-800">{usuario.nome}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">E-mail</p>
          <p className="text-slate-800">{usuario.email}</p>
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
