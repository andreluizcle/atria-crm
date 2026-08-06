/**
 * Telefones brasileiros.
 *
 * O link do WhatsApp (wa.me) exige o numero com codigo do pais e sem pontuacao.
 * Um numero salvo como "(11) 91234-5678" precisa virar "5511912345678" — e essa
 * conversao e a diferenca entre o botao funcionar e abrir uma conversa vazia.
 */

export function limparTelefone(valor: string): string {
  return valor.replace(/\D/g, '');
}

/**
 * Aceita 10 digitos (fixo com DDD) ou 11 (celular com DDD), com ou sem o 55 na frente.
 * Rejeita letras — o bot usa isso para pedir correcao sem perder o progresso (spec 5.4).
 */
export function validarTelefone(valor: string): boolean {
  const digitos = limparTelefone(valor);
  const semPais = digitos.startsWith('55') && digitos.length > 11 ? digitos.slice(2) : digitos;

  if (semPais.length !== 10 && semPais.length !== 11) return false;

  const ddd = Number(semPais.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;

  // Celular no Brasil sempre comeca com 9 depois do DDD.
  if (semPais.length === 11 && semPais[2] !== '9') return false;

  return true;
}

/** Formato exigido pelo wa.me: 55 + DDD + numero, so digitos. */
export function paraFormatoWhatsApp(valor: string): string {
  const digitos = limparTelefone(valor);
  if (digitos.startsWith('55') && digitos.length > 11) return digitos;
  return `55${digitos}`;
}

export function formatarTelefone(valor: string): string {
  const digitos = limparTelefone(valor);
  const semPais = digitos.startsWith('55') && digitos.length > 11 ? digitos.slice(2) : digitos;

  if (semPais.length === 11) return semPais.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  if (semPais.length === 10) return semPais.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');

  return valor;
}
