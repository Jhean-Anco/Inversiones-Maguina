import { BadRequestException } from "@nestjs/common";

function fechaIso(valor: string | undefined, nombre: string) {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) throw new BadRequestException(`La fecha ${nombre} no es válida.`);
  const parseada = new Date(`${valor}T00:00:00.000Z`);
  if (Number.isNaN(parseada.getTime()) || parseada.toISOString().slice(0, 10) !== valor) throw new BadRequestException(`La fecha ${nombre} no es válida.`);
  return valor;
}

/** Valida un rango `desde`–`hasta` en formato AAAA-MM-DD, con desde ≤ hasta. */
export function validarRangoFechas(desde?: string, hasta?: string) {
  const inicio = fechaIso(desde, "desde");
  const fin = fechaIso(hasta, "hasta");
  if (inicio > fin) throw new BadRequestException("La fecha desde no puede ser posterior a la fecha hasta.");
  return { desde: inicio, hasta: fin };
}
