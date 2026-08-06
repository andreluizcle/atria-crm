/** Caixa de mensagem de erro / sucesso / informacao. */
export function Aviso({
  tipo = 'info',
  titulo,
  children,
}: {
  tipo?: 'info' | 'erro' | 'sucesso' | 'atencao';
  titulo?: string;
  children: React.ReactNode;
}) {
  const estilos = {
    info: 'border-slate-200 bg-slate-50 text-slate-700',
    erro: 'border-red-200 bg-red-50 text-red-800',
    sucesso: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    atencao: 'border-amber-200 bg-amber-50 text-amber-900',
  } as const;

  return (
    <div className={`rounded-md border p-4 text-sm ${estilos[tipo]}`}>
      {titulo ? <p className="mb-1 font-semibold">{titulo}</p> : null}
      {children}
    </div>
  );
}

/** Estado vazio das listas — evita a tela em branco que parece bug. */
export function ListaVazia({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
      <p className="font-medium text-slate-700">{titulo}</p>
      <p className="mt-1 text-sm text-slate-500">{descricao}</p>
    </div>
  );
}
