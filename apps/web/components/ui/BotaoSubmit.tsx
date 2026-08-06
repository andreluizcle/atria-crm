'use client';

import { useFormStatus } from 'react-dom';

/**
 * Botao de submit que se desabilita sozinho enquanto a Server Action roda.
 *
 * Existe para impedir duplo clique — em telas de envio de e-mail, dois cliques
 * significam dois e-mails para o mesmo lead.
 */
export function BotaoSubmit({
  children,
  carregando = 'Enviando...',
  variante = 'primario',
}: {
  children: React.ReactNode;
  carregando?: string;
  variante?: 'primario' | 'secundario' | 'perigo';
}) {
  const { pending } = useFormStatus();

  const classes = {
    primario: 'botao-primario',
    secundario: 'botao-secundario',
    perigo: 'botao-perigo',
  } as const;

  return (
    <button type="submit" disabled={pending} className={classes[variante]}>
      {pending ? carregando : children}
    </button>
  );
}
