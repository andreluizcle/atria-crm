/**
 * Normalizacao dos campos de contato.
 *
 * O membro pode digitar "@atriaej", "atriaej" ou a URL inteira. Guardamos sempre
 * a URL completa, porque e ela que o botao "Abrir perfil" precisa (spec 5.3).
 */

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validarEmail(valor: string): boolean {
  return REGEX_EMAIL.test(valor.trim());
}

export function normalizarEmail(valor: string): string {
  return valor.trim().toLowerCase();
}

/** Garante protocolo. "atria.com.br" vira "https://atria.com.br". */
export function normalizarUrl(valor: string): string {
  const limpo = valor.trim();
  if (limpo === '') return limpo;
  if (/^https?:\/\//i.test(limpo)) return limpo;
  return `https://${limpo}`;
}

export function validarUrl(valor: string): boolean {
  try {
    const url = new URL(normalizarUrl(valor));
    return url.hostname.includes('.');
  } catch {
    return false;
  }
}

export function normalizarInstagram(valor: string): string {
  const limpo = valor.trim();
  if (limpo === '') return limpo;

  if (/^https?:\/\//i.test(limpo)) return limpo;

  const usuario = limpo.replace(/^@/, '').replace(/^instagram\.com\//i, '');
  return `https://instagram.com/${usuario}`;
}

export function normalizarLinkedin(valor: string): string {
  const limpo = valor.trim();
  if (limpo === '') return limpo;

  if (/^https?:\/\//i.test(limpo)) return limpo;
  if (/^(www\.)?linkedin\.com\//i.test(limpo)) return `https://${limpo.replace(/^www\./i, '')}`;

  // Sem pista de ser empresa ou pessoa, /in/ e o caso mais comum na prospeccao.
  return `https://linkedin.com/in/${limpo.replace(/^@/, '')}`;
}

/** Campo vazio vira null — o banco distingue "nao informado" de string vazia. */
export function vazioParaNulo(valor: string | null | undefined): string | null {
  if (valor === null || valor === undefined) return null;
  const limpo = valor.trim();
  return limpo === '' ? null : limpo;
}
