import { monedaMototaxi } from "./mototaxi-formatters";
import { inventarioMototaxisClasses as c } from "./inventario-mototaxis-page-classes";
import { cn } from "../../lib/utils";

type DatoPrecioMensual = { mes: string; promedio: string; cantidad: string };

type GraficoPreciosMototaxiProps = {
  titulo: string;
  datos: DatoPrecioMensual[];
  tono: "compra" | "venta";
};

const etiquetaMes = (mes: string) =>
  new Intl.DateTimeFormat("es-PE", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${mes}-01T00:00:00Z`));

export function GraficoPreciosMototaxi({ titulo, datos, tono }: GraficoPreciosMototaxiProps) {
  if (!datos.length) {
    return (
      <section className={cn("inventory-moto-chart", c.chart, tono === "venta" && "is-venta")}>
        <h3>{titulo}</h3>
        <div className={cn("inventory-moto-chart-empty", c.chartEmpty)}>Aún no hay movimientos para mostrar.</div>
      </section>
    );
  }

  const valores = datos.map((dato) => Number(dato.promedio));
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const rango = Math.max(maximo - minimo, maximo * 0.08, 1);
  const puntos = valores
    .map((valor, indice) => {
      const x = datos.length === 1 ? 300 : 24 + (indice * 552) / (datos.length - 1);
      const y = 148 - ((valor - (minimo - rango * 0.15)) / (rango * 1.3)) * 118;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <section className={cn("inventory-moto-chart", c.chart, tono === "venta" && "is-venta")}>
      <header><h3>{titulo}</h3><span>{datos.length} {datos.length === 1 ? "mes" : "meses"}</span></header>
      <svg viewBox="0 0 600 180" role="img" aria-label={`${titulo}, promedio por mes`}>
        <line x1="20" y1="150" x2="580" y2="150" className={cn("inventory-moto-chart-axis", c.chartAxis)} />
        <polyline points={puntos} className={cn("inventory-moto-chart-line", c.chartLine)} fill="none" />
        {puntos.split(" ").map((punto, indice) => {
          const [x, y] = punto.split(",");
          const dato = datos[indice];
          return (
            <g key={dato.mes}>
              <circle cx={x} cy={y} r="4" />
              <title>{dato.mes}: {monedaMototaxi(dato.promedio)} ({dato.cantidad} unidades)</title>
            </g>
          );
        })}
      </svg>
      <div className={cn("inventory-moto-chart-labels", c.chartLabels)}>
        {datos.map((dato) => <span key={dato.mes}>{etiquetaMes(dato.mes)}</span>)}
      </div>
      <footer>Promedio mensual ponderado · {monedaMototaxi(minimo)} – {monedaMototaxi(maximo)}</footer>
    </section>
  );
}
