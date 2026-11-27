import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { useRef, useState, type FormEvent } from "react";
import { Dialogo } from "../../components/ui/dialogo/dialogo";
import { useConfirmarCancelacionFormulario } from "../../hooks/use-confirmar-cancelacion-formulario";
import { useErroresValidacion } from "../../hooks/use-errores-validacion";
import { servicioMototaxis, type MarcaMototaxi, type ModeloMototaxi } from "../../services/mototaxis.service";
import { datosDeModelo, nuevoModelo, type DatosModelo } from "./modelo-mototaxi-datos";
import { SeccionesModeloMototaxi } from "./secciones-modelo-mototaxi";
import { clasesBoton } from "./campos-modelo";
import { Save } from "lucide-react";

export function FormularioModeloMototaxi({ modelo, marcas, alCerrar, alGuardar }: {
  modelo?: ModeloMototaxi;
  marcas: MarcaMototaxi[];
  alCerrar: () => void;
  alGuardar: (modelo: ModeloMototaxi) => void;
}) {
  const [datos, setDatos] = useState(() => modelo ? datosDeModelo(modelo) : nuevoModelo());
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const modalRef = useRef<HTMLFormElement>(null);
  const { errores, propsFormulario } = useErroresValidacion();
  const { solicitarCancelacion, dialogo } = useConfirmarCancelacionFormulario(modalRef, alCerrar, modelo ? "los cambios del modelo" : "el modelo de mototaxi", JSON.stringify(datos));
  const cambiar = (cambio: Partial<DatosModelo>) => setDatos((actual) => ({ ...actual, ...cambio }));

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

  return (
    <>
      {dialogo}
      <Dialogo
        kicker="CATÁLOGO DE MOTOTAXIS"
        titulo={modelo ? "Editar modelo" : "Nueva mototaxi · modelo"}
        subtitulo="Completa los datos del modelo. Solo los marcados con * son obligatorios."
        ancho="lg"
        cerrable={!guardando}
        onCerrar={solicitarCancelacion}
        pie={<><button type="button" className={clasesBoton.secundario} disabled={guardando} onClick={solicitarCancelacion}>Cancelar</button><button type="submit" form="modelo-form" className={clasesBoton.principal} disabled={guardando}><Save className="size-4" aria-hidden="true" />{guardando ? "Guardando…" : modelo ? "Guardar cambios" : "Crear modelo"}</button></>}
      >
        <form id="modelo-form" ref={modalRef} className="grid gap-4 text-[#142b42]" aria-busy={guardando} onSubmit={(evento) => void guardar(evento)} {...propsFormulario}>
          {error && <NotificacionFlotante mensaje={error} />}
          <SeccionesModeloMototaxi datos={datos} marcas={marcas} errores={errores} alCambiar={cambiar} />
        </form>
      </Dialogo>
    </>
  );
}
