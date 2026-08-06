/** Membro da EJ. `id` e o mesmo id do Supabase Auth. */
export interface Usuario {
  id: string;
  nome: string;
  email: string;
  telegram_user_id: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}
