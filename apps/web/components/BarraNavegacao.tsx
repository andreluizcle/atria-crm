'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { criarClienteNavegador } from '@/lib/supabase/navegador';

const LINKS = [
  { href: '/dashboard', rotulo: 'Dashboard' },
  { href: '/leads', rotulo: 'Leads' },
  { href: '/mensagens', rotulo: 'Mensagens' },
  { href: '/buscar-cnpj', rotulo: 'Buscar CNPJ' },
  { href: '/perfil', rotulo: 'Meu perfil' },
];

export function BarraNavegacao({ nomeDoUsuario }: { nomeDoUsuario: string }) {
  const caminho = usePathname();
  const router = useRouter();

  async function sair() {
    await criarClienteNavegador().auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <nav className="flex items-center gap-1 text-sm">
      {LINKS.map((link) => {
        const ativo = caminho.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-1.5 transition ${
              ativo ? 'bg-marca-50 font-medium text-marca-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {link.rotulo}
          </Link>
        );
      })}

      <span className="ml-3 hidden border-l border-slate-200 pl-3 text-slate-500 sm:inline">
        {nomeDoUsuario}
      </span>
      <button onClick={sair} className="rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100">
        Sair
      </button>
    </nav>
  );
}
