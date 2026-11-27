import { useState } from "react";
import { DialogoCatalogo, fechaInventario, monedaInventario } from "../../components/inventario/dialogo-catalogo";
import { Pencil } from "lucide-react";
import { BotonEditarConfirmacion } from "../../components/ui/confirmar-edicion";
import type { AnalisisModeloMototaxi } from "../../services/mototaxis.service";
import { GraficoPreciosMototaxi } from "./grafico-precios-mototaxi";
import { dialogosModeloClasses as d, tonosPill } from "./dialogos-modelo-classes";
import { ventasClasses as v } from "../ventas-page/ventas-classes";

const secciones = [["datos", "Datos técnicos"], ["movimientos", "Movimientos"], ["comercial", "Historial comercial"]] as const;
const tipoMovimiento: Record<string, string> = { COMPRA: "Compra", VENTA: "Venta", AJUSTE: "Ajuste", ANULACION_VENTA: "Anulación de venta" };

export function FichaModelo({ analisis, alEditar, alCerrar }: {
  analisis: AnalisisModeloMototaxi;
  alEditar?: () => void;
  alCerrar: () => void;
}) {
  const [seccion, setSeccion] = useState<"datos" | "movimientos" | "comercial">("datos");
  const { modelo, compras, ventas, movimientos } = analisis;
  const estado = modelo.activo ? tonosPill.verde : tonosPill.gris;
  const datos = [
    ["Marca", modelo.marca], ["Modelo", modelo.nombre], ["Versión", modelo.version], ["Categoría vehicular", modelo.categoriaVehicular],
    ["Tipo", modelo.tipoMototaxi], ["Fabricante", modelo.fabricante], ["País", modelo.paisFabricacion],
    ["Marca del motor", modelo.marcaMotor], ["Modelo del motor", modelo.modeloMotor], ["Tipo de motor", modelo.tipoMotor === "MONOCILINDRICO_4T" ? "Monocilíndrico 4T" : modelo.tipoMotor === "ELECTRICO" ? "Eléctrico" : modelo.tipoMotor?.replaceAll("_", " ")],
    ["Cilindrada", modelo.cilindradaCc && `${modelo.cilindradaCc} cc`], ["Combustible", modelo.combustible],
    ["Transmisión", modelo.transmision], ["Refrigeración", modelo.tipoRefrigeracion?.replaceAll("_", " ")], ["Carrocería", modelo.carroceria],
    ["Asientos", modelo.capacidadAsientos], ["Carga", modelo.capacidadCargaKg && `${modelo.capacidadCargaKg} kg`],
  ];
  return <DialogoCatalogo titulo="Ficha del modelo" articulo={[modelo.marca, modelo.nombre, modelo.version].filter(Boolean).join(" ")} codigo={modelo.codigo} alCerrar={alCerrar} acciones={<>
    {alEditar && <BotonEditarConfirmacion titulo="¿Editar este modelo de mototaxi?" descripcion={`Vas a abrir ${[modelo.marca, modelo.nombre, modelo.version].filter(Boolean).join(" ")} para revisar sus datos. Los cambios solo se aplicarán cuando pulses «Guardar cambios».`} etiquetaCancelar="Volver a la ficha" etiquetaConfirmar="Sí, editar modelo" onConfirmar={alEditar}><button type="button" className={d.botonSecundario}><Pencil className="size-4" aria-hidden="true" />Editar datos</button></BotonEditarConfirmacion>}
  </>}>
    <div className={d.contenido}>
      <dl className={`${d.bloqueDatos} ${d.bloqueTres}`}>
        <div><dt>Existencias</dt><dd>{analisis.existencias.disponibles} {analisis.existencias.disponibles === 1 ? "disponible" : "disponibles"}</dd></div>
        <div><dt>Precio general</dt><dd>{modelo.precioVenta == null ? "Sin precio" : monedaInventario(modelo.precioVenta)}</dd></div>
        <div><dt>Estado</dt><dd><span className={`${d.pill} !mx-0 ${estado.caja}`}><i className={`${d.punto} ${estado.punto}`} aria-hidden="true" />{modelo.activo ? "Activo" : "Inactivo"}</span></dd></div>
      </dl>
      <div className={v.filters} role="group" aria-label="Secciones de la ficha">
        {secciones.map(([clave, etiqueta]) => <button key={clave} type="button" className={v.chip} aria-pressed={seccion === clave} onClick={() => setSeccion(clave)}>{etiqueta}</button>)}
      </div>
      {seccion === "datos" && <>
        <dl className={d.bloqueDatos}>{datos.filter(([, valor]) => valor).map(([etiqueta, valor]) => <div key={etiqueta}><dt>{etiqueta}</dt><dd>{valor}</dd></div>)}</dl>
        {modelo.especificacionesAdicionales && <p className={d.texto}>{modelo.especificacionesAdicionales}</p>}
      </>}
      {seccion === "movimientos" && (movimientos.length ? <div className={d.tablaScroll}><table className={d.tabla}>
        <thead><tr><th>Fecha</th><th>Movimiento</th><th>Anterior</th><th>Final</th><th>Responsable</th></tr></thead>
        <tbody>{movimientos.map((item) => <tr key={item.id}><td>{fechaInventario(item.fecha)}</td><td>{tipoMovimiento[item.tipo] ?? item.tipo}</td><td>{item.cantidadAnterior}</td><td>{item.cantidadFinal}</td><td>{item.usuario}</td></tr>)}</tbody>
      </table></div> : <p className={d.vacio}>Todavía no hay movimientos de este modelo.</p>)}
      {seccion === "comercial" && <>
        <dl className={d.bloqueDatos}>
          <div><dt>Último costo de compra</dt><dd>{compras.ultimoPrecio == null ? "Sin compras" : monedaInventario(compras.ultimoPrecio)}</dd>{compras.ultima && <dd>{fechaInventario(compras.ultima.fecha)}</dd>}</div>
          <div><dt>Último precio vendido</dt><dd>{ventas.ultimoPrecio == null ? "Sin ventas" : monedaInventario(ventas.ultimoPrecio)}</dd>{ventas.ultima && <dd>{fechaInventario(ventas.ultima.fecha)}</dd>}</div>
        </dl>
        <div className="grid gap-3 sm:grid-cols-2">
          <GraficoPreciosMototaxi titulo="Costo promedio de compra" datos={compras.historialMensual} tono="compra" />
          <GraficoPreciosMototaxi titulo="Precio promedio de venta" datos={ventas.historialMensual} tono="venta" />
        </div>
      </>}
    </div>
  </DialogoCatalogo>;
}
