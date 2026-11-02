/** Validates the structure and check digit of a Peruvian RUC. */
export function rucPeruValido(valor: string): boolean {
  if (!/^(10|15|17|20)\d{9}$/.test(valor)) return false;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((total, peso, indice) => total + Number(valor[indice]) * peso, 0);
  const resto = 11 - (suma % 11);
  const digito = resto === 10 ? 0 : resto === 11 ? 1 : resto;
  return digito === Number(valor[10]);
}
