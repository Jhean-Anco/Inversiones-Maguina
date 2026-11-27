import { useAlertas, type TipoNotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { FileCheck, FileCode, FileText, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { MenuImpresion } from "../../components/impresion/menu-impresion";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { BotonAccion } from "../../components/ui/boton-accion";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { tamanioTablaInicial } from "../../components/ui/listado-maestro/paginacion-responsive";
import { urlApi } from "../../services/api-cliente";
import { servicioIngresos, type GuiaRemision } from "../../services/ingresos.service";
import { ventasClasses as c } from "../ventas-page/ventas-classes";
import { documentoDeGuia } from "./documento-guia";
import { FormularioGuiaRemision } from "./formulario-guia-remision";

const rechazada = (estado: string) => estado.startsWith("ERROR") || estado.startsWith("RECHAZADO");

function tipoAviso(estado: string): TipoNotificacionFlotante {
  if (estado === "EMITIDO") return "exito";
  return rechazada(estado) ? "error" : "advertencia";
}

// Listado de documentos ya emitidos: sin chips de estado; la píldora muestra el estado fiscal.
const tonosEstado = {
  Emitida: { caja: "border-[#b3d8c4] bg-[#e4f3ec] text-[#1b5e40]", punto: "bg-[#1b5e40]" },
  Pendiente: { caja: "border-[#c8deed] bg-[#eef6fb] text-[#17628b]", punto: "bg-[#2a8bbd]" },
  Rechazada: { caja: "border-[#efcfcd] bg-[#fff4f3] text-[#9b2c2c]", punto: "bg-[#c64243]" },
} as const;

function estadoVisible(estado: string): keyof typeof tonosEstado {
  if (estado === "EMITIDO") return "Emitida";
  return rechazada(estado) ? "Rechazada" : "Pendiente";
}

function detalleEstado(estado: string) {
  if (estado === "NUBEFACT_PENDIENTE") return "Pendiente de envío a NubeFact";
  if (estado === "PENDIENTE_SUNAT") return "Pendiente de confirmación de SUNAT";
  return estado.replaceAll("_", " ");
}

const enlace = (ruta: string) => (ruta.startsWith("/") ? urlApi(ruta) : ruta);
const fecha = (valor: string) => valor.slice(0, 10).split("-").reverse().join("/");
const encabezado = <tr><th>Fecha</th><th>Guía</th><th>Comprobante origen</th><th>Destinatario</th><th>Estado SUNAT</th><th>Acciones</th></tr>;

export function GuiasRemisionPage({ puedeCrear = false }: { puedeCrear?: boolean }) {
  const [guias, setGuias] = useState<GuiaRemision[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(tamanioTablaInicial);
  const [cargando, setCargando] = useState(true);
  const [consultando, setConsultando] = useState<string | null>(null);
  const [error, setError] = useState("");
  const alertas = useAlertas();
  const [actualizada, setActualizada] = useState(0);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  useEffect(() => {
    let vigente = true;
    const temporizador = window.setTimeout(() => {
      setCargando(true);
      void servicioIngresos.listarGuias(pagina, porPagina, "TODAS", busqueda).then((resultado) => {
        if (!vigente) return;
        setGuias(resultado.items); setTotal(resultado.total); setTotalPaginas(resultado.totalPaginas); setError("");
      }).catch((problema) => {
        if (vigente) setError(problema instanceof Error ? problema.message : "No se pudieron cargar las guías.");
      }).finally(() => { if (vigente) setCargando(false); });
    }, busqueda ? 220 : 0);
    return () => { vigente = false; window.clearTimeout(temporizador); };
  }, [actualizada, pagina, porPagina, busqueda]);

  async function consultar(guia: GuiaRemision) {
    setConsultando(guia.id);
    try {
      const resultado = await servicioIngresos.consultarGuia(guia.id);
      alertas.mostrar({
        tipo: tipoAviso(resultado.estado),
        mensaje: resultado.detalle || `${resultado.codigo}: ${resultado.estado === "EMITIDO" ? "aceptada por SUNAT" : detalleEstado(resultado.estado)}.`,
      });
      setActualizada((valor) => valor + 1);
    } catch (problema) {
      alertas.error(problema instanceof Error ? problema.message : "No se pudo consultar la guía.");
    } finally {
      setConsultando(null);
    }
  }

  // El formulario se devuelve sin contenedor: así toma los márgenes y el scroll propio de `.os-editor`.
  if (puedeCrear && mostrarFormulario) return <FormularioGuiaRemision
    alCancelar={() => setMostrarFormulario(false)}
    alEmitir={(guia) => {
      if (guia.estado !== "EMITIDO") alertas.mostrar({
        tipo: tipoAviso(guia.estado),
        mensaje: guia.mensaje ? `${guia.codigo}: ${guia.mensaje}` : rechazada(guia.estado) ? `No se pudo enviar la guía ${guia.codigo}.` : `${guia.codigo} enviada. Consulta SUNAT desde el listado para imprimirla.`,
      });
      setPagina(1);
      setActualizada((valor) => valor + 1);
    }}
  />;

  return (
    <section className={c.page}>
      {puedeCrear && <RegistrarAccionPrincipal etiqueta="Crear guía de remisión" onClick={() => setMostrarFormulario(true)} />}
      <div className={c.toolbar}>
        <label className={`${c.search} listado-maestro-busqueda-icono`}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>
          <input type="search" value={busqueda} placeholder="Buscar por guía, comprobante o cliente" aria-label="Buscar guías de remisión"
            onChange={(evento) => { setPagina(1); setBusqueda(evento.target.value); }} />
        </label>
      </div>
      <ListadoMaestro<GuiaRemision>
        variante="tabla"
        titulo="Guías de remisión"
        registros={guias}
        cargando={cargando}
        error={error || undefined}
        claseCabecera={c.header}
        centrarCeldas={false}
        claseTabla={c.table}
        claseContenedor={c.tableScroll}
        paginacion={{
          modo: "remota", pagina, tamanio: porPagina, total, totalPaginas,
          desde: total ? (pagina - 1) * porPagina + 1 : 0,
          hasta: Math.min(pagina * porPagina, total),
          alCambiarPagina: setPagina,
          alCambiarTamanio: (tamanio) => { setPorPagina(tamanio); setPagina(1); },
        }}
        vacio={<div className={c.empty}><strong>No hay guías para mostrar</strong><span>{busqueda.trim() ? "Prueba con otra búsqueda." : "Las guías emitidas aparecerán aquí."}</span></div>}
        encabezadoTabla={encabezado}
        renderizarFila={(guia) => {
          const visible = estadoVisible(guia.estado);
          const tono = tonosEstado[visible];
          return (
            <tr key={guia.id}>
              <td className="[font-variant-numeric:tabular-nums] text-[#142b42]">{fecha(guia.fecha)}</td>
              <td>
                <strong className={c.documentCode}>{guia.codigo}</strong>
                <small className={c.minorText}>{guia.tipo === "REMITENTE" ? "Remitente" : "Transportista"}</small>
              </td>
              <td>
                {guia.comprobanteOrigen
                  ? <><strong className={c.documentCode}>{guia.comprobanteOrigen.codigo}</strong><small className={c.minorText}>{guia.comprobanteOrigen.tipo === "NOTA_VENTA" ? "Nota de venta" : guia.comprobanteOrigen.tipo === "FACTURA" ? "Factura" : "Boleta"}</small></>
                  : <span className="text-[#5b7083]">Sin vínculo</span>}
              </td>
              <td><strong className={c.clientName}>{guia.clienteNombre?.trim() || "Clientes varios"}</strong></td>
              <td>
                <span className={`${c.status} ${tono.caja}`} title={guia.detalle || detalleEstado(guia.estado)}><i className={`h-[7px] w-[7px] rounded-full ${tono.punto}`} aria-hidden="true" />{visible}</span>
                {visible === "Pendiente" && <small className={c.minorText}>Confirmando con SUNAT</small>}
              </td>
              <td>
                <div className={c.rowActions}>
                  {visible !== "Rechazada" && <MenuImpresion codigo={guia.codigo} etiqueta={`Imprimir guía ${guia.codigo}`} tono="neutral" obtener={() => documentoDeGuia(guia)} />}
                  {guia.enlacePdf && <BotonAccion tono="neutral" etiqueta={`Abrir PDF de ${guia.codigo}`} href={enlace(guia.enlacePdf)} target="_blank" rel="noreferrer" icono={<FileText aria-hidden="true" size={16} />} />}
                  {guia.enlaceXml && <BotonAccion tono="neutral" etiqueta={`Descargar XML de ${guia.codigo}`} href={enlace(guia.enlaceXml)} target="_blank" rel="noreferrer" icono={<FileCode aria-hidden="true" size={16} />} />}
                  {guia.enlaceCdr && <BotonAccion tono="positiva" etiqueta={`Ver constancia SUNAT de ${guia.codigo}`} href={enlace(guia.enlaceCdr)} target="_blank" rel="noreferrer" icono={<FileCheck aria-hidden="true" size={16} />} />}
                  {guia.estado !== "EMITIDO" && <BotonAccion tono="informativa" etiqueta={consultando === guia.id ? `Consultando ${guia.codigo}…` : `Consultar estado SUNAT de ${guia.codigo}`} disabled={consultando === guia.id} onClick={() => void consultar(guia)} icono={<RefreshCw aria-hidden="true" size={16} className={consultando === guia.id ? "animate-spin" : undefined} />} />}
                </div>
              </td>
            </tr>
          );
        }}
      />
    </section>
  );
}
