import { FormularioLogin } from '@/components/FormularioLogin';

const MENSAGENS_DE_ERRO: Record<string, string> = {
  'sem-cadastro': 'Sua conta existe no login, mas não está cadastrada como membro. Fale com a diretoria.',
  inativo: 'Seu acesso está desativado. Fale com quem administra a EJ.',
};

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const mensagem = erro ? MENSAGENS_DE_ERRO[erro] : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Atria CRM</h1>
          <p className="mt-1 text-sm text-slate-500">Prospecção ativa da empresa júnior</p>
        </div>

        <div className="cartao">
          <FormularioLogin mensagemInicial={mensagem} />
        </div>
      </div>
    </main>
  );
}
