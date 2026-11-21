import { useAlertas, type TipoNotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { useEffect, useState } from "react";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { Etiqueta } from "../../components/ui/etiqueta";
import { tamanioTablaInicial } from "../../components/ui/listado-maestro/paginacion-responsive";
import { servicioIngresos, type GuiaRemision } from "../../services/ingresos.service";
import { FormularioGuiaRemision } from "./formulario-guia-remision";
import { guideListActionsClasses, guidePageClasses } from "./guias-remision-page-classes";

function tipoAviso(estado: string): TipoNotificacionFlotante {
  if (estado === "EMITIDO") return "exito";
  if (estado.startsWith("ERROR") || estado.startsWith("RECHAZADO")) return "error";
  return "advertencia";
}

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

  useEffect(() => {
    let vigente = true;
    setCargandoGuias(true);
    void servicioIngresos.listarGuias(paginaGuias, porPaginaGuias).then((resultado) => {
      if (vigente) {
        setGuias(resultado.items);
        setTotalGuias(resultado.total);
        setTotalPaginasGuias(resultado.totalPaginas);
        setError("");
      }
    }).catch((problema) => {
      if (vigente) setError(problema instanceof Error ? problema.message : "No se pudieron cargar las guías.");
    }).finally(() => { if (vigente) setCargandoGuias(false); });
    return () => { vigente = false; };
  }, [actualizada, paginaGuias, porPaginaGuias]);

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
        paginacion={{
          modo: "remota", pagina: paginaGuias, tamanio: porPaginaGuias, total: totalGuias, totalPaginas: totalPaginasGuias,
          desde: totalGuias ? (paginaGuias - 1) * porPaginaGuias + 1 : 0,
          hasta: Math.min(paginaGuias * porPaginaGuias, totalGuias),
          alCambiarPagina: setPaginaGuias,
          alCambiarTamanio: (tamanio) => { setPorPaginaGuias(tamanio); setPaginaGuias(1); },
        }}
        vacio={<span>Las guías emitidas aparecerán aquí.</span>}
        encabezadoTabla={<tr><th>Tipo y código</th><th>Comprobante origen</th><th>Fecha</th><th>Estado y detalle</th><th>Documentos y acciones</th></tr>}
        renderizarFila={(guia) => (
          <tr key={guia.id}>
            <td><strong>{guia.tipo === "REMITENTE" ? "Remitente" : "Transportista"}</strong><small>{guia.codigo}</small></td>
            <td>{guia.comprobanteOrigen ? <><strong>{guia.comprobanteOrigen.codigo}</strong><small>{guia.comprobanteOrigen.tipo.replace("_", " ")}</small></> : "Sin vínculo"}</td>
            <td>{guia.fecha}</td>
            <td><Etiqueta compacta tono={guia.estado === "EMITIDO" ? "positiva" : guia.estado.includes("RECHAZ") || guia.estado.includes("ERROR") ? "peligro" : "advertencia"}>{guia.estado}</Etiqueta>{guia.detalle && <small>{guia.detalle}</small>}</td>
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
