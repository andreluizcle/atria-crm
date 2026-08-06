/** Utilitarios de CNPJ. Sem dependencia externa: sao ~40 linhas de aritmetica. */

export function limparCnpj(valor: string): string {
  return valor.replace(/\D/g, '');
}

export function formatarCnpj(valor: string): string {
  const limpo = limparCnpj(valor);
  if (limpo.length !== 14) return valor;
  return limpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

/** Valida os dois digitos verificadores. Evita gastar consulta de API com CNPJ digitado errado. */
export function validarCnpj(valor: string): boolean {
  const cnpj = limparCnpj(valor);

  if (cnpj.length !== 14) return false;
  // Sequencias repetidas (00000000000000, 11111111111111...) passam na conta mas nao existem.
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  return (
    calcularDigito(cnpj.slice(0, 12)) === Number(cnpj[12]) &&
    calcularDigito(cnpj.slice(0, 13)) === Number(cnpj[13])
  );
}

function calcularDigito(base: string): number {
  // Pesos vao de 2 a 9, ciclicamente, da direita para a esquerda.
  let soma = 0;
  let peso = 2;

  for (let i = base.length - 1; i >= 0; i--) {
    soma += Number(base[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }

  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}
