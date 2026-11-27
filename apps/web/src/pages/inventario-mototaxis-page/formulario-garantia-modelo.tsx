import { useEffect, useRef, useState, type FormEvent } from "react";
import { useConfirmarCancelacionFormulario } from "../../hooks/use-confirmar-cancelacion-formulario";
import { servicioMototaxis, type ModeloMototaxi } from "../../services/mototaxis.service";
import { Dialogo } from "../../components/ui/dialogo/dialogo";
import { CampoFormulario } from "../../components/ui/formulario/campo-formulario";
import { claseAreaFormulario } from "../../components/ui/formulario/estilos-formulario";
import { useErroresValidacion } from "../../hooks/use-errores-validacion";

type Props = { modelo: ModeloMototaxi; puedeEditar: boolean; alCerrar: () => void; alGuardar: () => void };
type FormData = { activa: boolean; mesesVigencia: string; alcance: string; exclusiones: string };
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
        <p role="status" className="m-0 text-sm text-[var(--erp-ink-muted)]">Cargando garantía del modelo…</p>
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
            <button type="button" className="erp-btn erp-btn--secondary erp-btn--lg max-sm:w-full" disabled={guardando} onClick={solicitarCancelacion}>Cancelar</button>
            {puedeEditar && (
              <button type="submit" form="garantia-modelo-form" className="erp-btn erp-btn--primary erp-btn--lg max-sm:w-full" disabled={guardando || falloLectura}>
                {guardando ? "Guardando…" : "Guardar garantía"}
              </button>
            )}
          </>
        }
      >
        {error && <p role="alert" className="m-0 rounded-[var(--erp-radius-md)] border border-[var(--erp-danger-border)] bg-[var(--erp-danger-bg)] p-3 text-sm font-medium text-[var(--erp-danger)]">{error}</p>}
        <form id="garantia-modelo-form" ref={formulario} className="grid gap-5" aria-busy={guardando} onSubmit={(e) => void guardar(e)} {...propsFormulario}>
          <label htmlFor="garantia-activa" className="flex cursor-pointer items-start gap-3 rounded-[var(--erp-radius-lg)] border border-[var(--erp-border)] bg-[var(--erp-surface-muted)] p-4 has-[:checked]:border-[var(--erp-brand)] has-[:checked]:bg-[var(--erp-brand-soft)] has-[:disabled]:cursor-not-allowed">
            <input id="garantia-activa" type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[var(--erp-brand)]" checked={datos.activa} disabled={!puedeEditar} onChange={(e) => setDatos((d) => ({ ...d, activa: e.target.checked }))} />
            <span className="grid gap-0.5"><strong className="text-sm text-[var(--erp-ink)]">Este modelo cuenta con garantía</strong><small className="text-xs text-[var(--erp-ink-soft)]">Al activarla, estará disponible para aplicarse a sus ventas emitidas.</small></span>
          </label>
          <fieldset disabled={bloqueado} className="m-0 grid min-w-0 gap-4 border-0 p-0 disabled:opacity-60">
            <legend className="sr-only">Condiciones de la garantía</legend>
            <CampoFormulario id="garantia-meses" etiqueta="Vigencia desde la fecha de venta" requerido unidad="meses" error={errores["garantia-meses"]} ayuda="De 1 a 120 meses. La venta guardará su propio periodo y condiciones.">
              {(p) => <input {...p} type="number" min="1" max="120" required value={datos.mesesVigencia} onChange={(e) => setDatos((d) => ({ ...d, mesesVigencia: e.target.value }))} />}
            </CampoFormulario>
            <CampoFormulario id="garantia-alcance" etiqueta="¿Qué cubre la garantía?" requerido error={errores["garantia-alcance"]}>
              {({ className: _clase, ...p }) => <textarea {...p} className={claseAreaFormulario} required maxLength={4000} rows={4} value={datos.alcance} onChange={(e) => setDatos((d) => ({ ...d, alcance: e.target.value }))} placeholder="Indica componentes cubiertos y condiciones de atención." />}
            </CampoFormulario>
            <CampoFormulario id="garantia-exclusiones" etiqueta="¿Qué no cubre?" ayuda="Opcional.">
              {({ className: _clase, ...p }) => <textarea {...p} className={claseAreaFormulario} maxLength={4000} rows={3} value={datos.exclusiones} onChange={(e) => setDatos((d) => ({ ...d, exclusiones: e.target.value }))} placeholder="Ej. desgaste, mantenimiento omitido o daños por uso indebido." />}
            </CampoFormulario>
          </fieldset>
          <p className="m-0 rounded-[var(--erp-radius-md)] border border-[var(--erp-info-border)] bg-[var(--erp-info-bg)] p-3 text-xs leading-relaxed text-[var(--erp-info)]">Al aplicar esta garantía desde una venta, se conservarán en esa venta su vigencia, alcance, exclusiones y cantidad. Los cambios posteriores al modelo no modificarán ventas ya atendidas.</p>
          {!puedeEditar && <p className="m-0 text-[13px] text-[var(--erp-ink-muted)]">Tu perfil permite consultar, pero no modificar esta garantía.</p>}
        </form>
      </Dialogo>
    </>
  );
}
