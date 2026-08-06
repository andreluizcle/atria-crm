'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { criarClienteNavegador } from '@/lib/supabase/navegador';
import { Aviso } from '@/components/ui/Aviso';

/**
 * Login por e-mail e senha (Supabase Auth).
 *
 * Precisa ser client component: a autenticacao acontece no navegador para o
 * @supabase/ssr gravar os cookies de sessao que o middleware depois renova.
 */
export function FormularioLogin({ mensagemInicial }: { mensagemInicial?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | undefined>(mensagemInicial);
  const [carregando, setCarregando] = useState(false);

  async function entrar(evento: React.FormEvent) {
    evento.preventDefault();
    setCarregando(true);
    setErro(undefined);

    const { error } = await criarClienteNavegador().auth.signInWithPassword({ email, password: senha });

    if (error) {
      // A mensagem do Supabase vem em ingles e generica de proposito (nao revela
      // se o e-mail existe). Traduzimos mantendo essa propriedade.
      setErro('E-mail ou senha incorretos.');
      setCarregando(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={entrar} className="space-y-4">
      {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}

      <div>
        <label className="rotulo" htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          className="campo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label className="rotulo" htmlFor="senha">
          Senha
        </label>
        <input
          id="senha"
          type="password"
          required
          autoComplete="current-password"
          className="campo"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
      </div>

      <button type="submit" disabled={carregando} className="botao-primario w-full">
        {carregando ? 'Entrando...' : 'Entrar'}
      </button>

      <p className="text-center text-xs text-slate-500">
        Não tem acesso? Peça para a diretoria criar sua conta no painel do Supabase.
      </p>
    </form>
  );
}
