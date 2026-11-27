import { CampoFormulario } from "../../components/ui/formulario/campo-formulario";
import { claseAreaFormulario } from "../../components/ui/formulario/estilos-formulario";
import { SeccionFormulario } from "../../components/ui/formulario/seccion-formulario";
import type { MarcaMototaxi } from "../../services/mototaxis.service";
import type { DatosModelo } from "./modelo-mototaxi-datos";
import { SelectorColoresModelo } from "./selector-colores-modelo";

const combustiblesSugeridos = ["Gasolina", "Diésel", "GLP", "GNV", "Eléctrico", "Híbrido"];
const transmisionesSugeridas = ["Manual", "Automática", "Semiautomática", "CVT"];
const carroceriasSugeridas = ["Trimoto para pasajeros", "Trimoto de carga", "Mototaxi", "Motofurgón"];
const tiposMotor = [
  { valor: "MONOCILINDRICO_4T", etiqueta: "Monocilíndrico 4T" },
  { valor: "ELECTRICO", etiqueta: "Eléctrico" },
];
const tiposMotorAnteriores: Record<string, string> = { "2_TIEMPOS": "2 tiempos", "4_TIEMPOS": "4 tiempos" };

export type PropsSeccionesModelo = {
  datos: DatosModelo;
  marcas: MarcaMototaxi[];
  errores: Record<string, string>;
  alCambiar: (cambio: Partial<DatosModelo>) => void;
  alAlternarColor: (color: string) => void;
};

const campo = (id: string) => `modelo-${id}`;

/** Secciones del formulario de modelo: identificación, motor, capacidades, colores y fabricación. */
export function SeccionesModeloMototaxi({ datos, marcas, errores, alCambiar, alAlternarColor }: PropsSeccionesModelo) {
  const error = (id: string) => errores[campo(id)];
  return (
    <>
      <SeccionFormulario titulo="Identificación" descripcion="Datos para reconocer el modelo en el catálogo y en las ventas.">
        <CampoFormulario id={campo("marca")} etiqueta="Marca" requerido error={error("marca")}>
          {(p) => <select {...p} required value={datos.marcaId} onChange={(e) => alCambiar({ marcaId: e.target.value })}><option value="">Selecciona una marca</option>{marcas.filter((marca) => marca.activo || marca.id === datos.marcaId).map((marca) => <option value={marca.id} key={marca.id}>{marca.nombre}</option>)}</select>}
        </CampoFormulario>
        <CampoFormulario id={campo("nombre")} etiqueta="Nombre del modelo" requerido error={error("nombre")}>
          {(p) => <input {...p} required maxLength={120} value={datos.nombre} onChange={(e) => alCambiar({ nombre: e.target.value })} placeholder="Ej. RIK" />}
        </CampoFormulario>
        <CampoFormulario id={campo("version")} etiqueta="Versión">
          {(p) => <input {...p} maxLength={80} value={datos.version} onChange={(e) => alCambiar({ version: e.target.value })} placeholder="Si se vende como variante" />}
        </CampoFormulario>
        <CampoFormulario id={campo("tipo")} etiqueta="Tipo de mototaxi">
          {(p) => <select {...p} value={datos.tipoMototaxi} onChange={(e) => alCambiar({ tipoMototaxi: e.target.value })}><option value="">Selecciona el tipo de mototaxi</option><option value="PASAJERO">Pasajero</option><option value="CARGA">Carga</option></select>}
        </CampoFormulario>
        <CampoFormulario id={campo("categoria")} etiqueta="Categoría vehicular" requerido error={error("categoria")}>
          {(p) => <select {...p} required value={datos.categoriaVehicular} onChange={(e) => alCambiar({ categoriaVehicular: e.target.value })}>{["L5", "L4", "L3", "L2", "L1"].map((c) => <option key={c} value={c}>{c}</option>)}</select>}
        </CampoFormulario>
      </SeccionFormulario>

      <SeccionFormulario titulo="Motor y características" descripcion="Especificaciones principales de fábrica.">
        <CampoFormulario id={campo("tipo-motor")} etiqueta="Tipo de motor">
          {(p) => <select {...p} value={datos.tipoMotor} onChange={(e) => alCambiar({ tipoMotor: e.target.value })}><option value="">Selecciona el tipo de motor</option>{tiposMotor.map((tipo) => <option key={tipo.valor} value={tipo.valor}>{tipo.etiqueta}</option>)}{tiposMotorAnteriores[datos.tipoMotor] && <option value={datos.tipoMotor}>{tiposMotorAnteriores[datos.tipoMotor]} (actual)</option>}</select>}
        </CampoFormulario>
        <CampoFormulario id={campo("cilindrada")} etiqueta="Cilindrada" unidad="cc" error={error("cilindrada")}>
          {(p) => <input {...p} type="number" min="1" max="2147483647" step="1" inputMode="numeric" value={datos.cilindradaCc} onChange={(e) => alCambiar({ cilindradaCc: e.target.value })} placeholder="150" />}
        </CampoFormulario>
        <CampoFormulario id={campo("combustible")} etiqueta="Combustible">
          {(p) => <select {...p} value={datos.combustible} onChange={(e) => alCambiar({ combustible: e.target.value })}><option value="">Selecciona el combustible</option>{combustiblesSugeridos.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}</select>}
        </CampoFormulario>
        <CampoFormulario id={campo("transmision")} etiqueta="Transmisión">
          {(p) => <select {...p} value={datos.transmision} onChange={(e) => alCambiar({ transmision: e.target.value })}><option value="">Selecciona la transmisión</option>{transmisionesSugeridas.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}</select>}
        </CampoFormulario>
        <CampoFormulario id={campo("refrigeracion")} etiqueta="Tipo de refrigeración">
          {(p) => <select {...p} value={datos.tipoRefrigeracion} onChange={(e) => alCambiar({ tipoRefrigeracion: e.target.value })}><option value="">Selecciona la refrigeración</option><option value="AIRE">Por aire</option><option value="LIQUIDO">Por líquido</option><option value="AIRE_ACEITE">Por aire y aceite</option></select>}
        </CampoFormulario>
        <CampoFormulario id={campo("carroceria")} etiqueta="Carrocería">
          {(p) => <><input {...p} list="inventory-moto-bodyworks" maxLength={80} value={datos.carroceria} onChange={(e) => alCambiar({ carroceria: e.target.value })} placeholder="Ej. Trimoto pasajeros" /><datalist id="inventory-moto-bodyworks">{carroceriasSugeridas.map((opcion) => <option key={opcion} value={opcion} />)}</datalist></>}
        </CampoFormulario>
      </SeccionFormulario>

      <SeccionFormulario titulo="Capacidades" descripcion="Pasajeros y carga que soporta el modelo.">
        <CampoFormulario id={campo("asientos")} etiqueta="Asientos" error={error("asientos")}>
          {(p) => <input {...p} type="number" min="1" max="2147483647" step="1" inputMode="numeric" value={datos.capacidadAsientos} onChange={(e) => alCambiar({ capacidadAsientos: e.target.value })} placeholder="3" />}
        </CampoFormulario>
        <CampoFormulario id={campo("carga")} etiqueta="Carga máxima" unidad="kg" error={error("carga")}>
          {(p) => <input {...p} type="number" min="0.01" max="99999999.99" step="0.01" inputMode="decimal" value={datos.capacidadCargaKg} onChange={(e) => alCambiar({ capacidadCargaKg: e.target.value })} placeholder="500" />}
        </CampoFormulario>
      </SeccionFormulario>

      <SeccionFormulario titulo="Colores disponibles" descripcion="Selecciona los tonos que manejas para este modelo." columnas={1}>
        <SelectorColoresModelo seleccionados={datos.coloresDisponibles} alAlternar={alAlternarColor} />
      </SeccionFormulario>

      <SeccionFormulario titulo="Fabricación y datos adicionales" descripcion="Origen del modelo y otros detalles que lo identifican.">
        <CampoFormulario id={campo("fabricante")} etiqueta="Fabricante">
          {(p) => <input {...p} maxLength={160} value={datos.fabricante} onChange={(e) => alCambiar({ fabricante: e.target.value })} placeholder="Ej. Zongshen" />}
        </CampoFormulario>
        <CampoFormulario id={campo("pais")} etiqueta="País de fabricación">
          {(p) => <input {...p} maxLength={100} value={datos.paisFabricacion} onChange={(e) => alCambiar({ paisFabricacion: e.target.value })} placeholder="Ej. China" />}
        </CampoFormulario>
        <CampoFormulario id={campo("marca-motor")} etiqueta="Marca del motor">
          {(p) => <input {...p} maxLength={100} value={datos.marcaMotor} onChange={(e) => alCambiar({ marcaMotor: e.target.value })} placeholder="Ej. Zongshen" />}
        </CampoFormulario>
        <CampoFormulario id={campo("modelo-motor")} etiqueta="Modelo del motor">
          {(p) => <input {...p} maxLength={100} value={datos.modeloMotor} onChange={(e) => alCambiar({ modeloMotor: e.target.value })} placeholder="Ej. CG150" />}
        </CampoFormulario>
        <CampoFormulario id={campo("especificaciones")} etiqueta="Especificaciones adicionales" ancho="completo">
          {({ className: _clase, ...p }) => <textarea {...p} className={claseAreaFormulario} maxLength={2000} rows={3} value={datos.especificacionesAdicionales} onChange={(e) => alCambiar({ especificacionesAdicionales: e.target.value })} placeholder="Otros datos técnicos del modelo" />}
        </CampoFormulario>
      </SeccionFormulario>
    </>
  );
}
