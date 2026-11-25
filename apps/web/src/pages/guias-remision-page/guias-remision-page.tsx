import { useAlertas, type TipoNotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { useEffect, useState } from "react";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { Etiqueta } from "../../components/ui/etiqueta";
import { tamanioTablaInicial } from "../../components/ui/listado-maestro/paginacion-responsive";
import { servicioIngresos, type EstadoFiltroGuias, type GuiaRemision } from "../../services/ingresos.service";
import { FormularioGuiaRemision } from "./formulario-guia-remision";
import { guideListActionsClasses, guidePageClasses } from "./guias-remision-page-classes";

function tipoAviso(estado: string): TipoNotificacionFlotante {
  if (estado === "EMITIDO") return "exito";
  if (estado.startsWith("ERROR") || estado.startsWith("RECHAZADO")) return "error";
  return "advertencia";
}

function etiquetaEstadoGuia(estado: string) {
  if (estado === "EMITIDO") return "Emitida";
  if (estado === "RECHAZADO_SUNAT" || estado === "ERROR_NUBEFACT") return "Rechazada";
  if (estado === "PENDIENTE_SUNAT") return "Pendiente de SUNAT";
  if (estado === "NUBEFACT_PENDIENTE") return "Pendiente de envío";
  return estado.replaceAll("_", " ");
}

const filtrosGuias: { valor: EstadoFiltroGuias; etiqueta: string; clave: "todas" | "emitidas" | "pendientes" | "rechazadas" }[] = [
  { valor: "TODAS", etiqueta: "Todas", clave: "todas" },
  { valor: "EMITIDAS", etiqueta: "Emitidas", clave: "emitidas" },
  { valor: "PENDIENTES", etiqueta: "Pendientes", clave: "pendientes" },
  { valor: "RECHAZADAS", etiqueta: "Rechazadas", clave: "rechazadas" },
];

export function GuiasRemisionPage({ puedeCrear = false }: { puedeCrear?: boolean }) {
  const [guias, setGuias] = useState<GuiaRemision[]>([]);
  const [totalGuias, setTotalGuias] = useState(0);
  const [totalPaginasGuias, setTotalPaginasGuias] = useState(1);
  const [paginaGuias, setPaginaGuias] = useState(1);
  const [porPaginaGuias, setPorPaginaGuias] = useState(tamanioTablaInicial);
  const [cargandoGuias, setCargandoGuias] = useState(true);
  const [consultando, setConsultando] = useState<string | null>(null);
  const [error, setError] = useState("");
  const alertas = useAlertas();
  const [actualizada, setActualizada] = useState(0);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<EstadoFiltroGuias>("TODAS");
  const [conteos, setConteos] = useState({ todas: 0, emitidas: 0, pendientes: 0, rechazadas: 0 });

  useEffect(() => {
    let vigente = true;
    setCargandoGuias(true);
    void servicioIngresos.listarGuias(paginaGuias, porPaginaGuias, filtroEstado).then((resultado) => {
      if (vigente) {
        const perteneceAlFiltro = (guia: GuiaRemision) => filtroEstado === "TODAS"
          || (filtroEstado === "EMITIDAS" && guia.estado === "EMITIDO")
          || (filtroEstado === "RECHAZADAS" && (guia.estado.startsWith("ERROR") || guia.estado.startsWith("RECHAZADO")))
          || (filtroEstado === "PENDIENTES" && guia.estado !== "EMITIDO" && !guia.estado.startsWith("ERROR") && !guia.estado.startsWith("RECHAZADO"));
        const items = resultado.conteos ? resultado.items : resultado.items.filter(perteneceAlFiltro);
        const conteosDePagina = resultado.conteos ?? resultado.items.reduce((cuenta, guia) => {
          cuenta.todas += 1;
          if (guia.estado === "EMITIDO") cuenta.emitidas += 1;
          else if (guia.estado.startsWith("ERROR") || guia.estado.startsWith("RECHAZADO")) cuenta.rechazadas += 1;
          else cuenta.pendientes += 1;
          return cuenta;
        }, { todas: 0, emitidas: 0, pendientes: 0, rechazadas: 0 });
        setGuias(items);
        setTotalGuias(resultado.conteos ? resultado.total : filtroEstado === "TODAS" ? resultado.total : items.length);
        setTotalPaginasGuias(resultado.conteos ? resultado.totalPaginas : Math.max(1, Math.ceil(items.length / porPaginaGuias)));
        setConteos(conteosDePagina);
        setError("");
      }
    }).catch((problema) => {
      if (vigente) setError(problema instanceof Error ? problema.message : "No se pudieron cargar las guías.");
    }).finally(() => { if (vigente) setCargandoGuias(false); });
    return () => { vigente = false; };
  }, [actualizada, filtroEstado, paginaGuias, porPaginaGuias]);

  function cambiarFiltro(estado: EstadoFiltroGuias) {
    setFiltroEstado(estado);
    setPaginaGuias(1);
  }

  async function consultar(id: string) {
    setConsultando(id);
    try {
      const resultado = await servicioIngresos.consultarGuia(id);
      alertas.mostrar({
        tipo: tipoAviso(resultado.estado),
        mensaje: resultado.detalle || `${resultado.codigo}: ${resultado.estado === "EMITIDO" ? "aceptada por SUNAT" : resultado.estado}.`,
      });
      setActualizada((valor) => valor + 1);
    } catch (problema) {
      alertas.error(problema instanceof Error ? problema.message : "No se pudo consultar la guía.");
    } finally {
      setConsultando(null);
    }
  }

  if (puedeCrear && mostrarFormulario) return <FormularioGuiaRemision
    alCancelar={() => setMostrarFormulario(false)}
    alEmitir={(guia) => {
      const tipo = tipoAviso(guia.estado);
      alertas.mostrar({
        tipo,
        mensaje: guia.mensaje
          ? `${guia.codigo}: ${guia.mensaje}`
          : tipo === "error" ? `No se pudo enviar la guía ${guia.codigo}.` : `${guia.codigo} enviada. Consulta SUNAT para obtener el PDF y el CDR.`,
      });
      setPaginaGuias(1);
      setActualizada((valor) => valor + 1);
      setMostrarFormulario(false);
    }}
  />;

  return (
    <main className={guidePageClasses}>
      {puedeCrear && <RegistrarAccionPrincipal etiqueta="Crear guía de remisión" onClick={() => setMostrarFormulario(true)} />}
      <nav className="flex flex-wrap gap-2 rounded-2xl border border-[#dce6f0] bg-white p-3 shadow-[0_8px_26px_#173b600b]" aria-label="Filtrar guías por estado">
        {filtrosGuias.map((filtro) => <button
          key={filtro.valor}
          type="button"
          aria-pressed={filtroEstado === filtro.valor}
          onClick={() => cambiarFiltro(filtro.valor)}
          className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors ${filtroEstado === filtro.valor ? "border-[#28577f] bg-[#28577f] text-white" : "border-[#d4e1ed] bg-[#f8fbfe] text-[#28577f] hover:bg-[#edf5fc]"}`}
        >{filtro.etiqueta}<span className={`rounded-full px-2 py-0.5 text-xs ${filtroEstado === filtro.valor ? "bg-white/20" : "bg-[#e8f0f7]"}`}>{conteos[filtro.clave]}</span></button>)}
      </nav>
      <ListadoMaestro<GuiaRemision>
        variante="tabla"
        titulo="Guías de remisión"
        registros={guias}
        cargando={cargandoGuias}
        error={error || undefined}
        paginacion={{
          modo: "remota", pagina: paginaGuias, tamanio: porPaginaGuias, total: totalGuias, totalPaginas: totalPaginasGuias,
          desde: totalGuias ? (paginaGuias - 1) * porPaginaGuias + 1 : 0,
          hasta: Math.min(paginaGuias * porPaginaGuias, totalGuias),
          alCambiarPagina: setPaginaGuias,
          alCambiarTamanio: (tamanio) => { setPorPaginaGuias(tamanio); setPaginaGuias(1); },
        }}
        vacio={<span>{filtroEstado === "TODAS" ? "Las guías emitidas aparecerán aquí." : "No hay guías con este estado."}</span>}
        encabezadoTabla={<tr><th>Tipo y código</th><th>Comprobante origen</th><th>Fecha</th><th>Estado y detalle</th><th>Documentos y acciones</th></tr>}
        renderizarFila={(guia) => (
          <tr key={guia.id}>
            <td><strong>Guía de remisión {guia.tipo === "REMITENTE" ? "remitente" : "transportista"}</strong><small>{guia.codigo}</small></td>
            <td>{guia.comprobanteOrigen ? <><strong>{guia.comprobanteOrigen.codigo}</strong><small>{guia.comprobanteOrigen.tipo.replace("_", " ")}</small></> : "Sin vínculo"}</td>
            <td>{guia.fecha}</td>
            <td><Etiqueta compacta tono={guia.estado === "EMITIDO" ? "positiva" : guia.estado.includes("RECHAZ") || guia.estado.includes("ERROR") ? "peligro" : "advertencia"}>{etiquetaEstadoGuia(guia.estado)}</Etiqueta>{guia.detalle && <small>{guia.detalle}</small>}</td>
            <td>
              <div className={guideListActionsClasses}>
                {guia.enlacePdf && <a href={guia.enlacePdf} target="_blank" rel="noreferrer">PDF</a>}
                {guia.enlaceXml && <a href={guia.enlaceXml} target="_blank" rel="noreferrer">XML</a>}
                {guia.enlaceCdr && <a href={guia.enlaceCdr} target="_blank" rel="noreferrer">CDR</a>}
                {guia.estado !== "EMITIDO" && <button type="button" disabled={consultando === guia.id} onClick={() => void consultar(guia.id)}>{consultando === guia.id ? "Consultando…" : "Consultar SUNAT"}</button>}
              </div>
            </td>
          </tr>
        )}
      />
    </main>
  );
}
