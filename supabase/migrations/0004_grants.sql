-- =============================================================================
-- 0004_grants.sql — fecha o EXECUTE de eh_membro_ativo() para o papel `anon`
-- =============================================================================
-- O 0002 tentou fechar isso com `revoke execute ... from public`, mas o revoke
-- nao pegou: o Supabase concede EXECUTE ao `anon` por default privileges no
-- schema `public`, e revogar de PUBLIC nao remove um grant direto ao papel.
-- Resultado: `anon` conseguia chamar /rest/v1/rpc/eh_membro_ativo.
--
-- Nao vazava dado (para `anon`, auth.uid() e nulo e a funcao sempre devolve
-- false), mas a funcao e SECURITY DEFINER e nao tem motivo para ficar exposta
-- fora da sessao autenticada — que e onde as policies do 0002 a usam.
-- =============================================================================

revoke execute on function public.eh_membro_ativo() from anon;
