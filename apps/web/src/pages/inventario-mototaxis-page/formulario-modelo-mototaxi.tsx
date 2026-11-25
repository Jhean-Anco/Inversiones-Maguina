import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { useRef, useState, type FormEvent } from "react";
import { Dialogo } from "../../components/ui/dialogo/dialogo";
import { useConfirmarCancelacionFormulario } from "../../hooks/use-confirmar-cancelacion-formulario";
import { cn } from "../../lib/utils";
import { COLORES_ADICIONALES_MOTOTAXI, COLORES_RAPIDOS_MOTOTAXI, etiquetaColorMototaxi, hexColorMototaxi, servicioMototaxis, type MarcaMototaxi, type ModeloMototaxi } from "../../services/mototaxis.service";
import { inventarioMototaxisClasses as c } from "./inventario-mototaxis-page-classes";

type DatosModelo = {
  marcaId: string; nombre: string; version: string; categoriaVehicular: string;
  fabricante: string; paisFabricacion: string; marcaMotor: string; modeloMotor: string; tipoMototaxi: string; tipoMotor: string; tipoRefrigeracion: string; cilindradaCc: string;
  combustible: string; transmision: string; carroceria: string; capacidadAsientos: string; capacidadCargaKg: string; especificacionesAdicionales: string; coloresDisponibles: string[];
};
const nuevoModelo = (): DatosModelo => ({ marcaId: "", nombre: "", version: "", categoriaVehicular: "L5", fabricante: "", paisFabricacion: "", marcaMotor: "", modeloMotor: "", tipoMototaxi: "", tipoMotor: "", tipoRefrigeracion: "", cilindradaCc: "", combustible: "", transmision: "", carroceria: "", capacidadAsientos: "", capacidadCargaKg: "", especificacionesAdicionales: "", coloresDisponibles: [] });
const datosDeModelo = (modelo: ModeloMototaxi): DatosModelo => ({ marcaId: modelo.marcaId, nombre: modelo.nombre, version: modelo.version ?? "", categoriaVehicular: modelo.categoriaVehicular, fabricante: modelo.fabricante ?? "", paisFabricacion: modelo.paisFabricacion ?? "", marcaMotor: modelo.marcaMotor ?? "", modeloMotor: modelo.modeloMotor ?? "", tipoMototaxi: modelo.tipoMototaxi ?? "", tipoMotor: modelo.tipoMotor ?? "", tipoRefrigeracion: modelo.tipoRefrigeracion ?? "", cilindradaCc: String(modelo.cilindradaCc ?? ""), combustible: modelo.combustible ?? "", transmision: modelo.transmision ?? "", carroceria: modelo.carroceria ?? "", capacidadAsientos: String(modelo.capacidadAsientos ?? ""), capacidadCargaKg: modelo.capacidadCargaKg ?? "", especificacionesAdicionales: modelo.especificacionesAdicionales ?? "", coloresDisponibles: modelo.coloresDisponibles ?? [] });
const combustiblesSugeridos = ["Gasolina", "Diésel", "GLP", "GNV", "Eléctrico", "Híbrido"];
const transmisionesSugeridas = ["Manual", "Automática", "Semiautomática", "CVT"];
const carroceriasSugeridas = ["Trimoto para pasajeros", "Trimoto de carga", "Mototaxi", "Motofurgón"];

export function FormularioModeloMototaxi({ modelo, marcas, alCerrar, alGuardar }: {
  modelo?: ModeloMototaxi;
  marcas: MarcaMototaxi[];
  alCerrar: () => void;
  alGuardar: (modelo: ModeloMototaxi) => void;
}) {
  const tiposMotor = [
    { valor: "MONOCILINDRICO_4T", etiqueta: "Monocilíndrico 4T" },
    { valor: "ELECTRICO", etiqueta: "Eléctrico" },
  ] as const;
  const tiposMotorAnteriores: Record<string, string> = { "2_TIEMPOS": "2 tiempos", "4_TIEMPOS": "4 tiempos" };
  const [datos, setDatos] = useState(() => modelo ? datosDeModelo(modelo) : nuevoModelo());
  const [mostrarMasColores, setMostrarMasColores] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const modalRef = useRef<HTMLFormElement>(null);
  const { solicitarCancelacion, dialogo } = useConfirmarCancelacionFormulario(modalRef, alCerrar, modelo ? "los cambios del modelo" : "el modelo de mototaxi", JSON.stringify(datos));

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (guardando) return;
    setError(""); setGuardando(true);
    try {
      const guardado = modelo ? await servicioMototaxis.actualizarModelo(modelo.id, datos) : await servicioMototaxis.crearModelo(datos);
      alGuardar(guardado);
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : "No se pudo guardar el modelo.");
    } finally { setGuardando(false); }
  }

  function alternarColor(color: string) {
    setDatos((actual) => {
      const yaSeleccionado = actual.coloresDisponibles.some((actualColor) => actualColor.toLocaleLowerCase("es-PE") === color.toLocaleLowerCase("es-PE"));
      if (yaSeleccionado) return { ...actual, coloresDisponibles: actual.coloresDisponibles.filter((actualColor) => actualColor.toLocaleLowerCase("es-PE") !== color.toLocaleLowerCase("es-PE")) };
      if (actual.coloresDisponibles.length >= 24) return actual;
      return { ...actual, coloresDisponibles: [...actual.coloresDisponibles, color] };
    });
  }
  const esColorRapido = (color: string) => COLORES_RAPIDOS_MOTOTAXI.some((rapido) => rapido.toLocaleLowerCase("es-PE") === etiquetaColorMototaxi(color).toLocaleLowerCase("es-PE"));
  const coloresAdicionalesActivos = datos.coloresDisponibles.filter((color) => !esColorRapido(color)).length;
  const candidatosColorPaleta = mostrarMasColores
    ? [...datos.coloresDisponibles, ...COLORES_RAPIDOS_MOTOTAXI, ...COLORES_ADICIONALES_MOTOTAXI]
    : [...datos.coloresDisponibles.filter(esColorRapido), ...COLORES_RAPIDOS_MOTOTAXI];
  const coloresEnPaleta = candidatosColorPaleta.filter((color, indice, colores) => colores.findIndex((candidato) => etiquetaColorMototaxi(candidato).toLocaleLowerCase("es-PE") === etiquetaColorMototaxi(color).toLocaleLowerCase("es-PE")) === indice);
  return (
    <>
      {dialogo}
      <Dialogo
        kicker="CATÁLOGO DE MOTOTAXIS"
        titulo={modelo ? "Editar modelo" : "Nueva mototaxi · modelo"}
        subtitulo="Completa los datos generales, técnicos y de fabricación."
        ancho="lg"
        cerrable={!guardando}
        onCerrar={solicitarCancelacion}
        pie={<><button type="button" className="min-h-11 rounded-xl border border-[#c5d1db] bg-white px-5 text-sm font-semibold text-[#27445f] max-sm:w-full" disabled={guardando} onClick={solicitarCancelacion}>Cancelar</button><button type="submit" form="modelo-form" className="min-h-11 rounded-xl border border-[#b91e30] bg-gradient-to-br from-[#d92c40] to-[#bb1d30] px-5 text-sm font-bold text-white disabled:opacity-60 max-sm:w-full" disabled={guardando}>{guardando ? "Guardando…" : modelo ? "Guardar cambios" : "Crear modelo"}</button></>}
      >
      <form id="modelo-form" ref={modalRef} className="grid gap-4" onSubmit={(evento) => void guardar(evento)}>
      {error && <NotificacionFlotante mensaje={error} />}
      <div className={cn("inventory-moto-dialog-content", c.dialogContent)}>
        <div className={cn("inventory-moto-technical-fields", c.technicalFields)}>
          <section className={cn("inventory-moto-field-group", c.fieldGroup)}><header><div><h3>Identificación</h3><p>Datos para reconocer el modelo.</p></div></header><div className={cn("inventory-moto-form-grid", c.technicalGrid)}>
            <label>Marca<select required value={datos.marcaId} onChange={(e) => setDatos((actual) => ({ ...actual, marcaId: e.target.value }))}><option value="">Selecciona una marca</option>{marcas.filter((marca) => marca.activo || marca.id === datos.marcaId).map((marca) => <option value={marca.id} key={marca.id}>{marca.nombre}</option>)}</select></label>
            <label>Nombre del modelo<input required maxLength={120} value={datos.nombre} onChange={(e) => setDatos((actual) => ({ ...actual, nombre: e.target.value }))} placeholder="Ej. RIK" /></label>
            <label>Versión<input maxLength={80} value={datos.version} onChange={(e) => setDatos((actual) => ({ ...actual, version: e.target.value }))} placeholder="Si se vende como una variante" /></label>
            <label>Tipo de mototaxi<select value={datos.tipoMototaxi} onChange={(e) => setDatos((actual) => ({ ...actual, tipoMototaxi: e.target.value }))}><option value="">Selecciona el tipo de mototaxi</option><option value="PASAJERO">Pasajero</option><option value="CARGA">Carga</option></select></label>
            <label>Categoría vehicular<select required value={datos.categoriaVehicular} onChange={(e) => setDatos((actual) => ({ ...actual, categoriaVehicular: e.target.value }))}><option value="L5">L5</option><option value="L4">L4</option><option value="L3">L3</option><option value="L2">L2</option><option value="L1">L1</option></select></label>
          </div></section>
          <section className={cn("inventory-moto-field-group", c.fieldGroup)}><header><div><h3>Motor y configuración</h3><p>Especificaciones principales de fábrica.</p></div></header><div className={cn("inventory-moto-form-grid", c.technicalGrid)}>
            <label>Tipo de motor<select value={datos.tipoMotor} onChange={(e) => setDatos((actual) => ({ ...actual, tipoMotor: e.target.value }))}><option value="">Selecciona el tipo de motor</option>{tiposMotor.map((tipo) => <option key={tipo.valor} value={tipo.valor}>{tipo.etiqueta}</option>)}{tiposMotorAnteriores[datos.tipoMotor] && <option value={datos.tipoMotor}>{tiposMotorAnteriores[datos.tipoMotor]} (actual)</option>}</select></label>
            <label>Cilindrada<div className={cn("inventory-moto-input-unit", c.inputUnit)}><input type="number" min="1" max="2147483647" step="1" inputMode="numeric" value={datos.cilindradaCc} onChange={(e) => setDatos((actual) => ({ ...actual, cilindradaCc: e.target.value }))} placeholder="150" /><span>cc</span></div></label>
            <label>Combustible<select value={datos.combustible} onChange={(e) => setDatos((actual) => ({ ...actual, combustible: e.target.value }))}><option value="">Selecciona el combustible</option>{combustiblesSugeridos.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}</select></label>
            <label>Carrocería<input list="inventory-moto-bodyworks" maxLength={80} value={datos.carroceria} onChange={(e) => setDatos((actual) => ({ ...actual, carroceria: e.target.value }))} placeholder="Ej. Trimoto pasajeros" /><datalist id="inventory-moto-bodyworks">{carroceriasSugeridas.map((opcion) => <option key={opcion} value={opcion} />)}</datalist></label>
            <label>{"Transmisi\u00f3n"}<select value={datos.transmision} onChange={(e) => setDatos((actual) => ({ ...actual, transmision: e.target.value }))}><option value="">{"Selecciona la transmisi\u00f3n"}</option>{transmisionesSugeridas.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}</select></label>
            <label>{"Tipo de refrigeraci\u00f3n"}<select value={datos.tipoRefrigeracion} onChange={(e) => setDatos((actual) => ({ ...actual, tipoRefrigeracion: e.target.value }))}><option value="">{"Selecciona la refrigeraci\u00f3n"}</option><option value="AIRE">Por aire</option><option value="LIQUIDO">{"Por l\u00edquido"}</option><option value="AIRE_ACEITE">Por aire y aceite</option></select></label>
            <label>Asientos<input type="number" min="1" max="2147483647" step="1" inputMode="numeric" value={datos.capacidadAsientos} onChange={(e) => setDatos((actual) => ({ ...actual, capacidadAsientos: e.target.value }))} /></label>
            <label>Carga máxima<div className={cn("inventory-moto-input-unit", c.inputUnit)}><input type="number" min="0.01" max="99999999.99" step="0.01" inputMode="decimal" value={datos.capacidadCargaKg} onChange={(e) => setDatos((actual) => ({ ...actual, capacidadCargaKg: e.target.value }))} /><span>kg</span></div></label>
          </div></section>
          <section className={cn("inventory-moto-field-group inventory-moto-colors-group", c.fieldGroup)}><header><div><h3>Colores disponibles</h3><p>Selecciona los tonos que manejas para este modelo.</p></div></header><div className={cn("inventory-moto-color-grid", c.colorGrid)}>{coloresEnPaleta.map((color) => { const seleccionado = datos.coloresDisponibles.some((actual) => actual.toLocaleLowerCase("es-PE") === color.toLocaleLowerCase("es-PE")); const limiteAlcanzado = datos.coloresDisponibles.length >= 24 && !seleccionado; return <button key={color} type="button" disabled={limiteAlcanzado} className={cn("inventory-moto-color-option", c.colorOption, seleccionado && "is-selected")} aria-pressed={seleccionado} onClick={() => alternarColor(color)}><span className={cn("inventory-moto-color-dot", c.colorDot)} aria-hidden="true" style={{ backgroundColor: hexColorMototaxi(color) }} />{etiquetaColorMototaxi(color)}</button>; })}</div><button className={cn("inventory-moto-color-more", c.colorMore)} type="button" aria-expanded={mostrarMasColores} onClick={() => setMostrarMasColores((actual) => !actual)}>{mostrarMasColores ? "Ver menos" : `Ver más${coloresAdicionalesActivos ? ` · ${coloresAdicionalesActivos} activos` : ""}`}</button><small>{datos.coloresDisponibles.length} de 24 tonos seleccionados. Pulsa un tono para activarlo o quitarlo.</small>{datos.coloresDisponibles.length >= 24 && <small className={cn("inventory-moto-color-limit", c.colorLimit)}>Límite alcanzado. Desactiva un tono para elegir otro.</small>}</section>
          <section className={cn("inventory-moto-field-group", c.fieldGroup)}><header><div><h3>Fabricación y datos adicionales</h3><p>Completa el origen y otros detalles que identifican al modelo.</p></div></header>
            <div className={cn("inventory-moto-form-grid", c.technicalGrid)}>
              <label>Fabricante<input maxLength={160} value={datos.fabricante} onChange={(e) => setDatos((actual) => ({ ...actual, fabricante: e.target.value }))} /></label>
              <label>País de fabricación<input maxLength={100} value={datos.paisFabricacion} onChange={(e) => setDatos((actual) => ({ ...actual, paisFabricacion: e.target.value }))} /></label>
              <label>Marca del motor<input maxLength={100} value={datos.marcaMotor} onChange={(e) => setDatos((actual) => ({ ...actual, marcaMotor: e.target.value }))} /></label>
              <label>Modelo del motor<input maxLength={100} value={datos.modeloMotor} onChange={(e) => setDatos((actual) => ({ ...actual, modeloMotor: e.target.value }))} /></label>
              <label className="col-span-full">Especificaciones adicionales<textarea maxLength={2000} rows={3} value={datos.especificacionesAdicionales} onChange={(e) => setDatos((actual) => ({ ...actual, especificacionesAdicionales: e.target.value }))} placeholder="Otros datos técnicos del modelo" /></label>
            </div>
          </section>
        </div>
      </div>
      </form>
      </Dialogo>
    </>
  );
}
