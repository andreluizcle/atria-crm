/**
 * Fachada SEGURA PARA O NAVEGADOR: `@atria/core/cliente`.
 *
 * Todo componente 'use client' deve importar daqui, nunca de '@atria/core'.
 *
 * Por que existe: o index principal reexporta os repositories, os clientes de
 * API e o vinculoTelegram, que dependem de `node:crypto`, do SDK admin do
 * Supabase e do Resend. Importar aquele barrel de um client component quebra o
 * build do webpack e — pior — arrastaria codigo de servidor para o bundle
 * enviado ao navegador.
 *
 * O que entra aqui: apenas codigo puro — tipos, rotulos, validacoes e
 * interpolacao. Nada que toque rede, banco ou APIs do Node.
 */

export * from './types/index';
export * from './validacao/index';
export { ErroDeNegocio, mensagemParaUsuario } from './lib/erros';
