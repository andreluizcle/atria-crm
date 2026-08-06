/**
 * Fachada do pacote. Bot e painel importam sempre de '@atria/core'.
 *
 * Regra: o que sai daqui por padrao e a camada de SERVICES. Os repositories so
 * aparecem quando nao ha um service equivalente — assim ninguem pula a validacao
 * por engano importando `criarLead` do repository em vez do service.
 */

export * from './types/index';
export * from './validacao/index';

export * from './lib/erros';
export * from './lib/env';
export { criarClienteAdmin, type ClienteSupabase } from './lib/supabaseAdmin';
export { obterProvedorDeEmail, type EmailParaEnviar, type ProvedorDeEmail } from './lib/emailProvider';
export { gerarTokenVinculo, validarTokenVinculo, type VinculoValidado } from './lib/vinculoTelegram';

// --- Services (caminho normal) ------------------------------------------------
export * from './services/leadService';
export * from './services/mensagemService';
export * from './services/envioService';
export * from './services/cnpjService';
export * from './services/dashboardService';

// --- Repositories sem service equivalente -------------------------------------
export * from './repositories/usuarioRepository';
export * from './repositories/historicoRepository';
export * from './repositories/sessaoRepository';

export {
  buscarCnpjsExistentes,
  contarLeadsPorResponsavel,
  contarLeadsPorStatus,
} from './repositories/leadRepository';

export { listarMensagensPorPlataformas } from './repositories/mensagemRepository';
