export const hoy = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Lima" });

export const primerDiaMes = () => hoy().slice(0, 8) + "01";

export const soles = (valor: string | number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Number(valor) || 0);

export const numero = (valor: string | number) =>
  new Intl.NumberFormat("es-PE", { maximumFractionDigits: 3 }).format(Number(valor) || 0);
