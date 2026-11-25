import { useAlertas, type TipoNotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { useEffect, useState } from "react";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { tamanioTablaInicial } from "../../components/ui/listado-maestro/paginacion-responsive";
import { servicioIngresos, type GrupoGuiasRemision, type GuiaRemision, type PaginaGuiasRemision } from "../../services/ingresos.service";
import { FormularioGuiaRemision } from "./formulario-guia-remision";
import { guidePageClasses } from "./guias-remision-page-classes";

function tipoAviso(estado: string): TipoNotificacionFlotante {
  if (estado === "EMITIDO") return "exito";
  if (estado.startsWith("ERROR") || estado.startsWith("RECHAZADO")) return "error";
  return "advertencia";
}

const filtros: { valor: GrupoGuiasRemision; etiqueta: string; conteo: keyof PaginaGuiasRemision["conteos"] }[] = [
  { valor: "TODAS", etiqueta: "Todas", conteo: "todas" },
  { valor: "EMITIDAS", etiqueta: "Emitidas", conteo: "emitidas" },
  { valor: "PENDIENTES", etiqueta: "Pendientes", conteo: "pendientes" },
  { valor: "RECHAZADAS", etiqueta: "Rechazadas", conteo: "rechazadas" },
];

const tonosEstado = {
  emitida: { caja: "border-[#c9e3d4] bg-[#edf7f1] text-[#24734e]", punto: "bg-[#2e9467]", etiqueta: "Emitida" },
  pendiente: { caja: "border-[#f0dbb1] bg-[#fff7e8] text-[#8a5a00]", punto: "bg-[#d99a1b]", etiqueta: "Pendiente de SUNAT" },
  rechazada: { caja: "border-[#efc9cd] bg-[#fff1f2] text-[#b42335]", punto: "bg-[#c91f32]", etiqueta: "Rechazada" },
} as const;

function tonoDeEstado(estado: string) {
  if (estado === "EMITIDO") return tonosEstado.emitida;
  if (estado.startsWith("ERROR") || estado.startsWith("RECHAZADO")) return tonosEstado.rechazada;
  return tonosEstado.pendiente;
}

function etiquetaEstadoGuia(estado: string) {
  if (estado === "EMITIDO") return "Emitida";
  if (estado.startsWith("ERROR") || estado.startsWith("RECHAZADO")) return "Rechazada";
  if (estado === "NUBEFACT_PENDIENTE") return "Pendiente de envío";
  if (estado === "PENDIENTE_SUNAT") return "Pendiente de SUNAT";
  return estado.replaceAll("_", " ");
}

const claseChip = "inline-flex h-[38px] cursor-pointer items-center gap-2 rounded-[19px] border border-[#c5d1db] bg-white px-3.5 text-[13px] font-semibold text-[#27445f] transition-colors duration-150 hover:border-[#8eacc9] hover:bg-[#f5f9fd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2878b9] aria-pressed:border-[#0b2545] aria-pressed:bg-[#0b2545] aria-pressed:text-white";
const claseConteo = "inline-flex h-5 min-w-[22px] items-center justify-center rounded-[10px] bg-[#eef2f6] px-1.5 text-[11px] font-bold text-[#3d566e] [button[aria-pressed=true]_&]:bg-white/20 [button[aria-pressed=true]_&]:text-white";
const claseEnlace = "inline-flex min-h-[34px] items-center rounded-lg border border-[#d4e1ed] bg-[#f8fbfe] px-2.5 text-xs font-bold text-[#28577f] no-underline hover:bg-[#edf5fc]";

export function GuiasRemisionPage({ puedeCrear = false }: { puedeCrear?: boolean }) {
  const [guias, setGuias] = useState<GuiaRemision[]>([]);
  const [totalGuias, setTotalGuias] = useState(0);
  const [totalPaginasGuias, setTotalPaginasGuias] = useState(1);
  const [conteos, setConteos] = useState<PaginaGuiasRemision["conteos"]>({ todas: 0, emitidas: 0, pendientes: 0, rechazadas: 0 });
  const [grupo, setGrupo] = useState<GrupoGuiasRemision>("TODAS");
  const [paginaGuias, setPaginaGuias] = useState(1);
  const [porPaginaGuias, setPorPaginaGuias] = useState(tamanioTablaInicial);
  const [cargandoGuias, setCargandoGuias] = useState(true);
  const [consultando, setConsultando] = useState<string | null>(null);
  const [error, setError] = useState("");
  const alertas = useAlertas();
  const [actualizada, setActualizada] = useState(0);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  useEffect(() => {
    let vigente = true;
    setCargandoGuias(true);
    void servicioIngresos.listarGuias(paginaGuias, porPaginaGuias, grupo).then((resultado) => {
      if (vigente) {
        setGuias(resultado.items);
        setTotalGuias(resultado.total);
        setTotalPaginasGuias(resultado.totalPaginas);
        setConteos(resultado.conteos);
        setError("");
      }
    }).catch((problema) => {
      if (vigente) setError(problema instanceof Error ? problema.message : "No se pudieron cargar las guías.");
    }).finally(() => { if (vigente) setCargandoGuias(false); });
    return () => { vigente = false; };
  }, [actualizada, paginaGuias, porPaginaGuias, grupo]);

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
      <ListadoMaestro<GuiaRemision>
        variante="tabla"
        titulo="Guías de remisión"
        registros={guias}
        cargando={cargandoGuias}
        error={error || undefined}
        controlesCabecera={(
          <div className="flex w-full flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
            {filtros.map(({ valor, etiqueta, conteo }) => (
              <button key={valor} type="button" className={claseChip} aria-pressed={grupo === valor} onClick={() => { setPaginaGuias(1); setGrupo(valor); }}>
                {etiqueta}<span className={claseConteo}>{conteos[conteo]}</span>
              </button>
            ))}
          </div>
        )}
        paginacion={{
          modo: "remota", pagina: paginaGuias, tamanio: porPaginaGuias, total: totalGuias, totalPaginas: totalPaginasGuias,
          desde: totalGuias ? (paginaGuias - 1) * porPaginaGuias + 1 : 0,
          hasta: Math.min(paginaGuias * porPaginaGuias, totalGuias),
          alCambiarPagina: setPaginaGuias,
          alCambiarTamanio: (tamanio) => { setPorPaginaGuias(tamanio); setPaginaGuias(1); },
        }}
        vacio={<span>{grupo === "TODAS" ? "Las guías emitidas aparecerán aquí." : "No hay guías en este estado."}</span>}
        encabezadoTabla={<tr><th>Tipo y código</th><th>Comprobante origen</th><th>Fecha</th><th>Estado y detalle</th><th>Documentos y acciones</th></tr>}
        renderizarFila={(guia) => {
          const tono = tonoDeEstado(guia.estado);
          return (
            <tr key={guia.id}>
              <td>
                <strong className="block text-[13px] tracking-[.01em] text-[#0b2545]">{guia.codigo}</strong>
                <span className="text-[11px] text-[#5b7083]">Guía de remisión {guia.tipo === "REMITENTE" ? "remitente" : "transportista"}</span>
              </td>
              <td>
                {guia.comprobanteOrigen
                  ? <><strong className="block text-[13px] text-[#142b42]">{guia.comprobanteOrigen.codigo}</strong><span className="text-[11px] text-[#5b7083]">{guia.comprobanteOrigen.tipo.replace("_", " ")}</span></>
                  : <span className="text-[#5b7083]">Sin vínculo</span>}
              </td>
              <td className="whitespace-nowrap tabular-nums">{guia.fecha}</td>
              <td>
                <div className="flex flex-col items-start gap-1.5">
                  <span className={`inline-flex h-[26px] items-center gap-[7px] whitespace-nowrap rounded-[13px] border px-2.5 text-xs font-semibold ${tono.caja}`}><i className={`h-[7px] w-[7px] rounded-full ${tono.punto}`} aria-hidden="true" />{etiquetaEstadoGuia(guia.estado)}</span>
                  {guia.detalle && <small className="max-w-[320px] text-[11px] leading-snug text-[#5b7083]">{guia.detalle}</small>}
                </div>
              </td>
              <td>
                <div className="flex flex-wrap items-center gap-1.5">
                  {guia.enlacePdf && <a className={claseEnlace} href={guia.enlacePdf} target="_blank" rel="noreferrer">PDF</a>}
                  {guia.enlaceXml && <a className={claseEnlace} href={guia.enlaceXml} target="_blank" rel="noreferrer">XML</a>}
                  {guia.enlaceCdr && <a className={claseEnlace} href={guia.enlaceCdr} target="_blank" rel="noreferrer">CDR</a>}
                  {guia.estado !== "EMITIDO" && <button type="button" className={claseEnlace} disabled={consultando === guia.id} onClick={() => void consultar(guia.id)}>{consultando === guia.id ? "Consultando…" : "Consultar SUNAT"}</button>}
                </div>
              </td>
            </tr>
          );
        }}
      />
    </main>
  );
}
