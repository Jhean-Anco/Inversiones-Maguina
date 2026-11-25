import { useEffect, useRef, useState, type FormEvent } from "react";
import { useConfirmarCancelacionFormulario } from "../../hooks/use-confirmar-cancelacion-formulario";
import { servicioMototaxis, type ModeloMototaxi } from "../../services/mototaxis.service";
import { Dialogo } from "../../components/ui/dialogo/dialogo";

type Props = { modelo: ModeloMototaxi; puedeEditar: boolean; alCerrar: () => void; alGuardar: () => void };
type FormData = { activa: boolean; mesesVigencia: string; alcance: string; exclusiones: string };
const vacio: FormData = { activa: true, mesesVigencia: "12", alcance: "", exclusiones: "" };

const estiloCampo = "grid gap-1.5 text-xs font-bold text-[#52697d]";
const estiloEntrada = "h-11 w-full rounded-xl border border-[#c5d1db] px-3 text-sm font-medium text-[#142b42] disabled:opacity-60";
const estiloArea = "w-full rounded-xl border border-[#c5d1db] p-3 text-sm font-medium text-[#142b42] disabled:opacity-60";

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
        <p role="status" className="m-0 text-sm text-[#52697d]">Cargando garantía del modelo…</p>
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
            <button type="button" className="min-h-11 rounded-xl border border-[#c5d1db] bg-white px-5 text-sm font-semibold text-[#27445f] max-sm:w-full" disabled={guardando} onClick={solicitarCancelacion}>Cancelar</button>
            {puedeEditar && (
              <button type="submit" form="garantia-modelo-form" className="min-h-11 rounded-xl border border-[#b91e30] bg-gradient-to-br from-[#d92c40] to-[#bb1d30] px-5 text-sm font-bold text-white disabled:opacity-60 max-sm:w-full" disabled={guardando || falloLectura}>
                {guardando ? "Guardando…" : "Guardar garantía"}
              </button>
            )}
          </>
        }
      >
        {error && <p role="alert" className="m-0 rounded-xl border border-[#f3cfc7] bg-[#fdf1ee] p-3 text-sm text-[#8a2a18]">{error}</p>}
        <form id="garantia-modelo-form" ref={formulario} className="grid gap-4" onSubmit={(e) => void guardar(e)}>
          <label className="flex items-start gap-3 rounded-xl border border-[#c5d1db] p-3.5">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-[#0b2545]" checked={datos.activa} disabled={!puedeEditar} onChange={(e) => setDatos((d) => ({ ...d, activa: e.target.checked }))} />
            <span className="grid gap-0.5"><strong className="text-sm text-[#0b2545]">Este modelo cuenta con garantía</strong><small className="text-xs text-[#52697d]">Al activarla, estará disponible para aplicarse a sus ventas emitidas.</small></span>
          </label>
          <label className={estiloCampo}>Vigencia desde la fecha de venta<input className={estiloEntrada} type="number" min="1" max="120" required disabled={!puedeEditar || !datos.activa} value={datos.mesesVigencia} onChange={(e) => setDatos((d) => ({ ...d, mesesVigencia: e.target.value }))} /><small className="font-normal text-[#52697d]">Meses (de 1 a 120). La venta guardará su propio periodo y condiciones.</small></label>
          <label className={estiloCampo}>¿Qué cubre la garantía?<textarea className={estiloArea} required maxLength={4000} rows={4} disabled={!puedeEditar || !datos.activa} value={datos.alcance} onChange={(e) => setDatos((d) => ({ ...d, alcance: e.target.value }))} placeholder="Indica componentes cubiertos y condiciones de atención." /></label>
          <label className={estiloCampo}>¿Qué no cubre?<textarea className={estiloArea} maxLength={4000} rows={3} disabled={!puedeEditar || !datos.activa} value={datos.exclusiones} onChange={(e) => setDatos((d) => ({ ...d, exclusiones: e.target.value }))} placeholder="Ej. desgaste, mantenimiento omitido o daños por uso indebido." /></label>
          <p className="m-0 text-[13px] leading-relaxed text-[#52697d]">Al aplicar esta garantía desde una venta, se conservarán en esa venta su vigencia, alcance, exclusiones y cantidad. Los cambios posteriores al modelo no modificarán ventas ya atendidas.</p>
          {!puedeEditar && <p className="m-0 text-[13px] text-[#52697d]">Tu perfil permite consultar, pero no modificar esta garantía.</p>}
        </form>
      </Dialogo>
    </>
  );
}
