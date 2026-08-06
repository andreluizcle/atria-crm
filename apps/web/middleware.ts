import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Renova o cookie de sessao do Supabase a cada navegacao e barra quem nao
 * esta logado.
 *
 * Sem isso, a sessao expira em background e o usuario ve telas vazias em vez de
 * ser mandado para o login.
 */

const ROTAS_PUBLICAS = ['/login', '/auth'];

export async function middleware(request: NextRequest) {
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesParaDefinir: Array<{ name: string; value: string; options: CookieOptions }>) => {
          for (const { name, value } of cookiesParaDefinir) {
            request.cookies.set(name, value);
          }
          resposta = NextResponse.next({ request });
          for (const { name, value, options } of cookiesParaDefinir) {
            resposta.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const caminho = request.nextUrl.pathname;
  const ehPublica = ROTAS_PUBLICAS.some((rota) => caminho.startsWith(rota));

  if (!user && !ehPublica) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && caminho === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return resposta;
}

export const config = {
  matcher: [
    /*
     * Tudo, menos:
     *   - _next (assets do Next)
     *   - api/telegram/webhook (chamado pelo Telegram, autenticado por segredo proprio)
     *   - arquivos estaticos
     */
    '/((?!_next/static|_next/image|favicon.ico|api/telegram).*)',
  ],
};
