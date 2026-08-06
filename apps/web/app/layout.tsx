import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Atria CRM — Prospecção',
  description: 'Sistema interno de prospecção ativa da Atria Empresa Júnior.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
