import { redirect } from 'next/navigation';

/** A raiz nao tem tela propria: quem esta logado vai para o dashboard, o resto para o login. */
export default function PaginaRaiz() {
  redirect('/dashboard');
}
