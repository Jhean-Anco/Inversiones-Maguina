export const monedaMototaxi = (valor: string | number | null | undefined) =>
  valor == null
    ? "Sin registros"
    : new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Number(valor));

export const fechaMototaxi = (valor: string | null | undefined) =>
  valor
    ? new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${valor.slice(0, 10)}T00:00:00Z`))
    : "Sin registros";
