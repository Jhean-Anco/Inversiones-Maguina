import { useEffect, useRef, useState, type FormEvent } from "react";
import { useConfirmarCancelacionFormulario } from "../../hooks/use-confirmar-cancelacion-formulario";
import { servicioMototaxis, type ModeloMototaxi } from "../../services/mototaxis.service";
import { Dialogo } from "../../components/ui/dialogo/dialogo";
import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { Save } from "lucide-react";
import { Campo, clasesBoton, Contador, TarjetaFormulario } from "./campos-modelo";
import { useErroresValidacion } from "../../hooks/use-errores-validacion";

type Props = { modelo: ModeloMototaxi; puedeEditar: boolean; alCerrar: () => void; alGuardar: () => void };
type FormData = { activa: boolean; mesesVigencia: string; alcance: string; exclusiones: string };
const MAX_TEXTO = 4000;
const vacio: FormData = { activa: true, mesesVigencia: "12", alcance: "", exclusiones: "" };

export function FormularioGarantiaModelo({ modelo, puedeEditar, alCerrar, alGuardar }: Props) {
  const [datos, setDatos] = useState<FormData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let vigente = true;
    void servicioMototaxis.garantiaModelo(modelo.id)
      .then((g) => { if (vigente) setDatos(g ? { activa: g.activa, mesesVigencia: String(g.mesesVigencia), alcance: g.alcance, exclusiones: g.exclusiones ?? "" } : vacio); })
      .catch((e: unknown) => { if (vigente) { setError(e instanceof Error ? e.message : "No se pudo cargar la garantía."); setDatos(vacio); } });
    return () => { vigente = false; };
  }, [modelo.id]);

  if (!datos) {
    return (
      <Dialogo titulo="Política de garantía" kicker="GARANTÍA" ancho="md" onCerrar={alCerrar}>
        <p role="status" className="m-0 text-[13px] text-[#52697d]">Cargando garantía del modelo…</p>
      </Dialogo>
    );
  }
  return <FormularioGarantiaModeloCargado modelo={modelo} inicial={datos} errorInicial={error} puedeEditar={puedeEditar} alCerrar={alCerrar} alGuardar={alGuardar} />;
}

function FormularioGarantiaModeloCargado({ modelo, inicial, errorInicial, puedeEditar, alCerrar, alGuardar }: Props & { inicial: FormData; errorInicial: string }) {
  const [datos, setDatos] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(errorInicial);
  const formulario = useRef<HTMLFormElement>(null);
  const { solicitarCancelacion, dialogo } = useConfirmarCancelacionFormulario(formulario, alCerrar, "la garantía del modelo", JSON.stringify(datos));
  const falloLectura = Boolean(errorInicial);
  const { errores, propsFormulario } = useErroresValidacion();
  const bloqueado = !puedeEditar || !datos.activa;

  async function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!puedeEditar || guardando) return;
    setGuardando(true);
    setError("");
    try {
      await servicioMototaxis.guardarGarantiaModelo(modelo.id, { activa: datos.activa, mesesVigencia: Number(datos.mesesVigencia), alcance: datos.alcance, exclusiones: datos.exclusiones });
      alGuardar();
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : "No se pudo guardar la garantía.");
    } finally {
      setGuardando(false);
    }
  }

  const nombre = [modelo.marca, modelo.nombre, modelo.version].filter(Boolean).join(" ");

  return (
    <>
      {dialogo}
      <Dialogo
        kicker="POLÍTICA DE GARANTÍA PARA CLIENTES"
        titulo={nombre}
        subtitulo="Define las condiciones que se podrán aplicar a una venta de este modelo."
        ancho="md"
        cerrable={!guardando}
        onCerrar={solicitarCancelacion}
        pie={
          <>
            <button type="button" className={clasesBoton.secundario} disabled={guardando} onClick={solicitarCancelacion}>{puedeEditar ? "Cancelar" : "Cerrar"}</button>
            {puedeEditar && (
              <button type="submit" form="garantia-modelo-form" className={clasesBoton.principal} disabled={guardando || falloLectura}>
                <Save className="size-4" aria-hidden="true" />{guardando ? "Guardando…" : "Guardar garantía"}
              </button>
            )}
          </>
        }
      >
        {error && <NotificacionFlotante mensaje={error} onCerrar={() => setError("")} />}
        <form id="garantia-modelo-form" ref={formulario} className="grid gap-4 text-[#142b42]" aria-busy={guardando} onSubmit={(e) => void guardar(e)} {...propsFormulario}>
          <label htmlFor="garantia-activa" className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#c5d1db] bg-[#f8fafc] p-4 transition-colors has-[:checked]:border-[#b3d8c4] has-[:checked]:bg-[#e4f3ec] has-[:disabled]:cursor-not-allowed">
            <input id="garantia-activa" type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[#1b5e40]" checked={datos.activa} disabled={!puedeEditar} onChange={(e) => setDatos((d) => ({ ...d, activa: e.target.checked }))} />
            <span className="grid gap-0.5"><strong className="text-[14px] text-[#142b42]">Este modelo cuenta con garantía</strong><small className="text-[11px] text-[#6d8093]">Al activarla, estará disponible para aplicarse a sus ventas emitidas.</small></span>
          </label>
          <fieldset disabled={bloqueado} className="m-0 grid min-w-0 gap-4 border-0 p-0 disabled:opacity-60">
            <legend className="sr-only">Condiciones de la garantía</legend>
            <TarjetaFormulario paso={1} titulo="Vigencia" descripcion="Se cuenta desde la fecha de venta." columnas={2}>
              <Campo id="garantia-meses" etiqueta="Duración" requerido unidad="meses" error={errores["garantia-meses"]} ayuda="De 1 a 120 meses. Cada venta guarda su propio periodo.">
                {(p) => <input {...p} type="number" min="1" max="120" required value={datos.mesesVigencia} onChange={(e) => setDatos((d) => ({ ...d, mesesVigencia: e.target.value }))} placeholder="12" />}
              </Campo>
            </TarjetaFormulario>
            <TarjetaFormulario paso={2} titulo="Condiciones" descripcion="Lo que se imprimirá y conservará en cada venta con garantía." columnas={1}>
              <Campo id="garantia-alcance" etiqueta="¿Qué cubre la garantía?" requerido tipo="area" error={errores["garantia-alcance"]}>
                {(p) => <textarea {...p} required maxLength={MAX_TEXTO} rows={4} value={datos.alcance} onChange={(e) => setDatos((d) => ({ ...d, alcance: e.target.value }))} placeholder="Ej. Motor y caja de cambios por defectos de fábrica; atención en nuestro taller con la boleta de venta." />}
              </Campo>
              <Contador valor={datos.alcance} maximo={MAX_TEXTO} />
              <Campo id="garantia-exclusiones" etiqueta="¿Qué no cubre?" opcional tipo="area">
                {(p) => <textarea {...p} maxLength={MAX_TEXTO} rows={3} value={datos.exclusiones} onChange={(e) => setDatos((d) => ({ ...d, exclusiones: e.target.value }))} placeholder="Ej. Desgaste de llantas y frenos, mantenimiento omitido o daños por uso indebido." />}
              </Campo>
              <Contador valor={datos.exclusiones} maximo={MAX_TEXTO} />
            </TarjetaFormulario>
          </fieldset>
          <p className="m-0 rounded-xl border border-[#c8deed] bg-[#eef6fb] p-3 text-[12px] leading-relaxed text-[#17628b]">Al aplicar esta garantía desde una venta, esa venta conserva su vigencia, alcance, exclusiones y cantidad. Los cambios posteriores al modelo no modifican ventas ya atendidas.</p>
          {!puedeEditar && <p className="m-0 text-[12px] text-[#6d8093]">Tu perfil permite consultar, pero no modificar esta garantía.</p>}
        </form>
      </Dialogo>
    </>
  );
}
