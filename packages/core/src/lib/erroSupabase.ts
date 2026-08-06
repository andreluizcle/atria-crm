import type { PostgrestError } from '@supabase/supabase-js';
import { ErroDeIntegracao, ErroDeNegocio, registrarErro } from './erros';

/**
 * Traduz erro do Postgres para mensagem util.
 *
 * Sem isso, uma violacao de constraint chega no usuario como
 * "new row violates check constraint contato_obrigatorio" — texto que nao ajuda
 * ninguem. Os codigos vem do Postgres: 23505 unique, 23514 check, 23503 FK.
 */
export function traduzirErroSupabase(contexto: string, erro: PostgrestError): never {
  registrarErro(contexto, erro);

  if (erro.code === '23505') {
    if (erro.message.includes('leads_cnpj_unico_idx')) {
      throw new ErroDeNegocio('Já existe um lead cadastrado com este CNPJ.', ['cnpj']);
    }
    if (erro.message.includes('mensagens_prontas_titulo_idx')) {
      throw new ErroDeNegocio('Já existe um template com esse título.', ['titulo']);
    }
    if (erro.message.includes('usuarios_telegram_user_id_key')) {
      throw new ErroDeNegocio('Esta conta do Telegram já está vinculada a outro membro.');
    }
    throw new ErroDeNegocio('Esse registro já existe.');
  }

  if (erro.code === '23514') {
    if (erro.message.includes('contato_obrigatorio')) {
      throw new ErroDeNegocio(
        'O lead precisa de pelo menos um contato: telefone, e-mail, Instagram ou LinkedIn.',
        ['contato'],
      );
    }
    if (erro.message.includes('assunto_obrigatorio_para_email')) {
      throw new ErroDeNegocio('Template de e-mail precisa de um assunto.', ['assunto']);
    }
    throw new ErroDeNegocio('Algum campo não passou na validação do banco.');
  }

  if (erro.code === '23503') {
    throw new ErroDeNegocio('Referência inválida: o membro ou o lead informado não existe.');
  }

  // 42501 = permissao negada pela RLS.
  if (erro.code === '42501') {
    throw new ErroDeNegocio('Você não tem permissão para essa ação.');
  }

  throw new ErroDeIntegracao('o banco de dados', erro.message, { causa: erro });
}
