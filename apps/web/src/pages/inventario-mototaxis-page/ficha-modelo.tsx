import { useState } from "react";
import { clasesTablaDialogo, DialogoCatalogo, fechaInventario, monedaInventario } from "../../components/inventario/dialogo-catalogo";
import { Button } from "../../components/ui/button";
import { BotonEditarConfirmacion } from "../../components/ui/confirmar-edicion";
import type { AnalisisModeloMototaxi } from "../../services/mototaxis.service";
import { GraficoPreciosMototaxi } from "./grafico-precios-mototaxi";

const tipoMovimiento: Record<string, string> = { COMPRA: "Compra", VENTA: "Venta", AJUSTE: "Ajuste", ANULACION_VENTA: "Anulación de venta" };

export function FichaModelo({ analisis, alEditar, alCerrar }: {
  analisis: AnalisisModeloMototaxi;
  alEditar?: () => void;
  alCerrar: () => void;
}) {
  const [seccion, setSeccion] = useState<"datos" | "movimientos" | "comercial">("datos");
  const { modelo, compras, ventas, movimientos } = analisis;
  const datos = [
    ["Marca", modelo.marca], ["Modelo", modelo.nombre], ["Versión", modelo.version], ["Categoría vehicular", modelo.categoriaVehicular],
    ["Tipo", modelo.tipoMototaxi], ["Fabricante", modelo.fabricante], ["País", modelo.paisFabricacion],
    ["Marca del motor", modelo.marcaMotor], ["Modelo del motor", modelo.modeloMotor], ["Tipo de motor", modelo.tipoMotor === "MONOCILINDRICO_4T" ? "Monocilíndrico 4T" : modelo.tipoMotor === "ELECTRICO" ? "Eléctrico" : modelo.tipoMotor?.replaceAll("_", " ")],
    ["Cilindrada", modelo.cilindradaCc && `${modelo.cilindradaCc} cc`], ["Combustible", modelo.combustible],
    ["Transmisión", modelo.transmision], ["Refrigeración", modelo.tipoRefrigeracion?.replaceAll("_", " ")], ["Carrocería", modelo.carroceria],
    ["Asientos", modelo.capacidadAsientos], ["Carga", modelo.capacidadCargaKg && `${modelo.capacidadCargaKg} kg`], ["Colores ofrecidos", modelo.coloresDisponibles?.join(", ")],
  ];
  return <DialogoCatalogo titulo="Ficha del modelo" articulo={[modelo.marca, modelo.nombre, modelo.version].filter(Boolean).join(" ")} codigo={modelo.codigo} alCerrar={alCerrar} acciones={<>
    {alEditar && <BotonEditarConfirmacion titulo="¿Editar este modelo de mototaxi?" descripcion={`Vas a abrir ${[modelo.marca, modelo.nombre, modelo.version].filter(Boolean).join(" ")} para revisar sus datos. Los cambios solo se aplicarán cuando pulses «Guardar cambios».`} etiquetaCancelar="Volver a la ficha" etiquetaConfirmar="Sí, editar modelo" onConfirmar={alEditar}><Button variant="outline">Editar datos</Button></BotonEditarConfirmacion>}
  </>}>
    <dl className="m-0 grid grid-cols-3 gap-3 border-b border-[var(--erp-border)] pb-4 text-sm">
      <div><dt className="text-xs">Existencias</dt><dd className="m-0 font-semibold">{analisis.existencias.disponibles} disponibles</dd></div>
      <div><dt className="text-xs">Precio general</dt><dd className="m-0 font-semibold">{modelo.precioVenta == null ? "Sin precio" : monedaInventario(modelo.precioVenta)}</dd></div>
      <div><dt className="text-xs">Estado</dt><dd className="m-0 font-semibold">{modelo.activo ? "Activo" : "Inactivo"}</dd></div>
    </dl>
    <div className="my-4 flex flex-wrap gap-2" role="group" aria-label="Secciones de la ficha">
      <Button variant={seccion === "datos" ? "secondary" : "ghost"} aria-pressed={seccion === "datos"} onClick={() => setSeccion("datos")}>Datos técnicos</Button>
      <Button variant={seccion === "movimientos" ? "secondary" : "ghost"} aria-pressed={seccion === "movimientos"} onClick={() => setSeccion("movimientos")}>Movimientos</Button>
      <Button variant={seccion === "comercial" ? "secondary" : "ghost"} aria-pressed={seccion === "comercial"} onClick={() => setSeccion("comercial")}>Historial comercial</Button>
    </div>
    {seccion === "datos" && <>
      <dl className="m-0 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">{datos.filter(([, valor]) => valor).map(([etiqueta, valor]) => <div key={etiqueta}><dt className="text-xs text-[var(--erp-ink-muted)]">{etiqueta}</dt><dd className="m-0 break-words font-medium">{valor}</dd></div>)}</dl>
      {modelo.especificacionesAdicionales && <p className="text-sm">{modelo.especificacionesAdicionales}</p>}
    </>}
    {seccion === "movimientos" && (movimientos.length ? <div className="overflow-x-auto"><table className={clasesTablaDialogo}>
      <thead><tr><th>Fecha</th><th>Movimiento</th><th>Anterior</th><th>Final</th><th>Responsable</th></tr></thead>
      <tbody>{movimientos.map((item) => <tr key={item.id}><td>{fechaInventario(item.fecha)}</td><td>{tipoMovimiento[item.tipo] ?? item.tipo}</td><td>{item.cantidadAnterior}</td><td>{item.cantidadFinal}</td><td>{item.usuario}</td></tr>)}</tbody>
    </table></div> : <p className="text-sm">Todavía no hay movimientos por modelo.</p>)}
    {seccion === "comercial" && <>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div><dt>Último costo de compra</dt><dd className="m-0 font-semibold">{monedaInventario(compras.ultimoPrecio)}</dd><dd className="m-0">{fechaInventario(compras.ultima?.fecha)}</dd></div>
        <div><dt>Último precio vendido</dt><dd className="m-0 font-semibold">{monedaInventario(ventas.ultimoPrecio)}</dd><dd className="m-0">{fechaInventario(ventas.ultima?.fecha)}</dd></div>
      </dl>
      <div className="grid gap-3 sm:grid-cols-2">
        <GraficoPreciosMototaxi titulo="Costo promedio de compra" datos={compras.historialMensual} tono="compra" />
        <GraficoPreciosMototaxi titulo="Precio promedio de venta" datos={ventas.historialMensual} tono="venta" />
      </div>
    </>}
  </DialogoCatalogo>;
}
