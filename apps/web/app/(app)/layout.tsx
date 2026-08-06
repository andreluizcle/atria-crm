import Link from 'next/link';
import { exigirUsuarioLogado } from '@/lib/sessao';
import { BarraNavegacao } from '@/components/BarraNavegacao';

/** Layout das telas autenticadas. Barra a entrada antes de renderizar qualquer coisa. */
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const { usuario } = await exigirUsuarioLogado();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="text-lg font-bold text-slate-900">
            Atria <span className="text-marca-600">CRM</span>
          </Link>
          <BarraNavegacao nomeDoUsuario={usuario.nome} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
