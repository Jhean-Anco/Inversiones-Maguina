import { useState } from "react";
import { construirMapaCalor, type MetricaCalor } from "./dashboard-calculos";
import type { HorariosVentas } from "../../services/reportes.service";

type Soles = (valor: string | number) => string;
const POCAS_VENTAS = 30;
const hora = (valor: number) => `${String(valor).padStart(2, "0")}:00`;

export function MapaCalorHorarios({ horarios, soles }: { horarios: HorariosVentas; soles: Soles }) {
  const [metrica, setMetrica] = useState<MetricaCalor>("importe");
  const mapa = construirMapaCalor(horarios.celdas, metrica);
  const descartadas = horarios.ventasVigentes - horarios.ventasConsideradas;
  const formato = (valor: number) => metrica === "importe" ? soles(valor) : `${valor} ${valor === 1 ? "venta" : "ventas"}`;
  return (
    <div className="grid gap-3">
      <div className="inicio-sales-view-toggle w-fit" role="group" aria-label="Medida del mapa de calor">
        <button type="button" className={metrica === "importe" ? "is-active" : ""} aria-pressed={metrica === "importe"} onClick={() => setMetrica("importe")}>Importe vendido</button>
        <button type="button" className={metrica === "operaciones" ? "is-active" : ""} aria-pressed={metrica === "operaciones"} onClick={() => setMetrica("operaciones")}>Número de ventas</button>
      </div>
      {!mapa ? <div className="inicio-chart-empty">Aún no hay ventas con hora confiable para mostrar.</div> : (
        <div className="overflow-x-auto overscroll-x-contain" role="region" aria-label="Mapa de calor de ventas por día y hora; desplázate horizontalmente si no cabe" tabIndex={0}>
          <table className="w-full min-w-[520px] border-separate border-spacing-[3px] text-[10px] text-[#5a6f84]">
            <caption className="sr-only">Ventas por día de la semana y hora. Mientras más oscura la celda, más se vendió.{mapa.mejor ? ` La mejor franja es el ${mapa.mejor.diaCompleto} de ${hora(mapa.mejor.hora)} a ${hora(mapa.mejor.hora + 1)}.` : ""}</caption>
            <thead><tr><td className="w-10" />{mapa.horas.map((valor) => <th key={valor} scope="col" className="font-bold">{valor}h</th>)}</tr></thead>
            <tbody>
              {mapa.filas.map((fila) => (
                <tr key={fila.dia}>
                  <th scope="row" className="pr-1 text-left font-bold text-[#33506a]">{fila.nombre}</th>
                  {fila.celdas.map((celda) => (
                    <td key={celda.hora} className="h-8 rounded-md p-0" style={{ backgroundColor: celda.valor > 0 ? `rgba(11, 55, 106, ${(0.1 + 0.9 * celda.intensidad).toFixed(2)})` : "#eef3f7" }} title={celda.valor > 0 ? `${fila.nombreCompleto} ${hora(celda.hora)}–${hora(celda.hora + 1)}: ${soles(celda.total)} en ${celda.operaciones} ${celda.operaciones === 1 ? "venta" : "ventas"}` : `${fila.nombreCompleto} ${hora(celda.hora)}: sin ventas`}>
                      <span className="sr-only">{celda.valor > 0 ? `${soles(celda.total)}, ${celda.operaciones} ${celda.operaciones === 1 ? "venta" : "ventas"}` : "Sin ventas"}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#5a6f84]">
        <span className="flex items-center gap-1.5" aria-hidden="true">Menos <i className="h-2 w-24 rounded-full bg-[linear-gradient(90deg,rgba(11,55,106,.1),rgba(11,55,106,1))]" /> Más</span>
        {mapa?.mejor && <span>Mejor franja: <b className="text-[#244967]">{mapa.mejor.diaCompleto} de {hora(mapa.mejor.hora)} a {hora(mapa.mejor.hora + 1)}</b> ({formato(mapa.mejor.valor)})</span>}
      </div>
      <p className="m-0 text-[10px] text-[#5a6f84]">
        Se usaron {horarios.ventasConsideradas} de {horarios.ventasVigentes} ventas de los últimos 90 días.
        {descartadas > 0 ? " Las demás se registraron otro día distinto al de su emisión, así que su hora no refleja cuándo se vendieron." : ""}
        {horarios.ventasConsideradas > 0 && horarios.ventasConsideradas < POCAS_VENTAS ? " Todavía hay pocas ventas para ver un patrón confiable." : ""}
      </p>
    </div>
  );
}
