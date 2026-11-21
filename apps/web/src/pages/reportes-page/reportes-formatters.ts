export const hoy = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Lima" });

export const primerDiaMes = () => hoy().slice(0, 8) + "01";

export const soles = (valor: string | number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Number(valor) || 0);

export const numero = (valor: string | number) =>
  new Intl.NumberFormat("es-PE", { maximumFractionDigits: 3 }).format(Number(valor) || 0);

export const fechaCorta = (valor: string) => new Date(`${valor}T00:00:00`).toLocaleDateString("es-PE");

const etiquetasMedioPago: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
  BILLETERA_DIGITAL: "Billetera digital",
  OTRO: "Otro",
};

export const medioPago = (valor: string) => etiquetasMedioPago[valor] ?? valor;
