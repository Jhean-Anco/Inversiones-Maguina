import { FileText } from "lucide-react";
import type { MarcaMototaxi } from "../../services/mototaxis.service";
import type { DatosModelo } from "./modelo-mototaxi-datos";
import { Campo, Contador, Opcional, TarjetaFormulario } from "./campos-modelo";

const combustiblesSugeridos = ["Gasolina", "Diésel", "GLP", "GNV", "Eléctrico", "Híbrido"];
const transmisionesSugeridas = ["Manual", "Automática", "Semiautomática", "CVT"];
const carroceriasSugeridas = ["Trimoto para pasajeros", "Trimoto de carga", "Mototaxi", "Motofurgón"];
const tiposMotor = [
  { valor: "MONOCILINDRICO_4T", etiqueta: "Monocilíndrico 4T" },
  { valor: "ELECTRICO", etiqueta: "Eléctrico" },
];
const tiposMotorAnteriores: Record<string, string> = { "2_TIEMPOS": "2 tiempos", "4_TIEMPOS": "4 tiempos" };
const MAX_ESPECIFICACIONES = 2000;

export type PropsSeccionesModelo = {
  datos: DatosModelo;
  marcas: MarcaMototaxi[];
  errores: Record<string, string>;
  alCambiar: (cambio: Partial<DatosModelo>) => void;
};

const campo = (id: string) => `modelo-${id}`;

/** Tarjetas del formulario de modelo: identificación, motor, capacidades y fabricación. */
export function SeccionesModeloMototaxi({ datos, marcas, errores, alCambiar }: PropsSeccionesModelo) {
  const error = (id: string) => errores[campo(id)];
  return (
    <>
      <TarjetaFormulario paso={1} titulo="Identificación" descripcion="Datos para reconocer el modelo en el catálogo y en las ventas.">
        <Campo id={campo("marca")} etiqueta="Marca" requerido tipo="select" error={error("marca")}>
          {(p) => <select {...p} required value={datos.marcaId} onChange={(e) => alCambiar({ marcaId: e.target.value })}><option value="">Selecciona una marca</option>{marcas.filter((marca) => marca.activo || marca.id === datos.marcaId).map((marca) => <option value={marca.id} key={marca.id}>{marca.nombre}</option>)}</select>}
        </Campo>
        <Campo id={campo("nombre")} etiqueta="Nombre del modelo" requerido error={error("nombre")}>
          {(p) => <input {...p} required maxLength={120} value={datos.nombre} onChange={(e) => alCambiar({ nombre: e.target.value })} placeholder="Ej. RIK" />}
        </Campo>
        <Campo id={campo("version")} etiqueta="Versión" opcional>
          {(p) => <input {...p} maxLength={80} value={datos.version} onChange={(e) => alCambiar({ version: e.target.value })} placeholder="Ej. Full, Cargo" />}
        </Campo>
        <Campo id={campo("categoria")} etiqueta="Categoría vehicular" requerido tipo="select" error={error("categoria")}>
          {(p) => <select {...p} required value={datos.categoriaVehicular} onChange={(e) => alCambiar({ categoriaVehicular: e.target.value })}>{["L5", "L4", "L3", "L2", "L1"].map((c) => <option key={c} value={c}>{c}</option>)}</select>}
        </Campo>
        <Campo id={campo("tipo")} etiqueta="Tipo de mototaxi" opcional tipo="select">
          {(p) => <select {...p} value={datos.tipoMototaxi} onChange={(e) => alCambiar({ tipoMototaxi: e.target.value })}><option value="">Selecciona el tipo</option><option value="PASAJERO">Pasajero</option><option value="CARGA">Carga</option></select>}
        </Campo>
      </TarjetaFormulario>

      <TarjetaFormulario paso={2} titulo="Motor y características" descripcion="Especificaciones principales de fábrica.">
        <Campo id={campo("tipo-motor")} etiqueta="Tipo de motor" opcional tipo="select">
          {(p) => <select {...p} value={datos.tipoMotor} onChange={(e) => alCambiar({ tipoMotor: e.target.value })}><option value="">Selecciona el tipo de motor</option>{tiposMotor.map((tipo) => <option key={tipo.valor} value={tipo.valor}>{tipo.etiqueta}</option>)}{tiposMotorAnteriores[datos.tipoMotor] && <option value={datos.tipoMotor}>{tiposMotorAnteriores[datos.tipoMotor]} (actual)</option>}</select>}
        </Campo>
        <Campo id={campo("cilindrada")} etiqueta="Cilindrada" opcional unidad="cc" error={error("cilindrada")}>
          {(p) => <input {...p} type="number" min="1" max="2147483647" step="1" inputMode="numeric" value={datos.cilindradaCc} onChange={(e) => alCambiar({ cilindradaCc: e.target.value })} placeholder="150" />}
        </Campo>
        <Campo id={campo("combustible")} etiqueta="Combustible" opcional tipo="select">
          {(p) => <select {...p} value={datos.combustible} onChange={(e) => alCambiar({ combustible: e.target.value })}><option value="">Selecciona el combustible</option>{combustiblesSugeridos.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}</select>}
        </Campo>
        <Campo id={campo("transmision")} etiqueta="Transmisión" opcional tipo="select">
          {(p) => <select {...p} value={datos.transmision} onChange={(e) => alCambiar({ transmision: e.target.value })}><option value="">Selecciona la transmisión</option>{transmisionesSugeridas.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}</select>}
        </Campo>
        <Campo id={campo("refrigeracion")} etiqueta="Refrigeración" opcional tipo="select">
          {(p) => <select {...p} value={datos.tipoRefrigeracion} onChange={(e) => alCambiar({ tipoRefrigeracion: e.target.value })}><option value="">Selecciona la refrigeración</option><option value="AIRE">Por aire</option><option value="LIQUIDO">Por líquido</option><option value="AIRE_ACEITE">Por aire y aceite</option></select>}
        </Campo>
        <Campo id={campo("carroceria")} etiqueta="Carrocería" opcional>
          {(p) => <><input {...p} list="inventory-moto-bodyworks" maxLength={80} value={datos.carroceria} onChange={(e) => alCambiar({ carroceria: e.target.value })} placeholder="Ej. Trimoto pasajeros" /><datalist id="inventory-moto-bodyworks">{carroceriasSugeridas.map((opcion) => <option key={opcion} value={opcion} />)}</datalist></>}
        </Campo>
      </TarjetaFormulario>

      <TarjetaFormulario paso={3} titulo="Capacidades" descripcion="Pasajeros y carga que soporta el modelo." columnas={2}>
        <Campo id={campo("asientos")} etiqueta="Asientos" opcional error={error("asientos")}>
          {(p) => <input {...p} type="number" min="1" max="2147483647" step="1" inputMode="numeric" value={datos.capacidadAsientos} onChange={(e) => alCambiar({ capacidadAsientos: e.target.value })} placeholder="3" />}
        </Campo>
        <Campo id={campo("carga")} etiqueta="Carga máxima" opcional unidad="kg" error={error("carga")}>
          {(p) => <input {...p} type="number" min="0.01" max="99999999.99" step="0.01" inputMode="decimal" value={datos.capacidadCargaKg} onChange={(e) => alCambiar({ capacidadCargaKg: e.target.value })} placeholder="500" />}
        </Campo>
      </TarjetaFormulario>

      <TarjetaFormulario paso={4} titulo="Fabricación" descripcion="Origen del modelo y del motor." columnas={4}>
        <Campo id={campo("fabricante")} etiqueta="Fabricante" opcional>
          {(p) => <input {...p} maxLength={160} value={datos.fabricante} onChange={(e) => alCambiar({ fabricante: e.target.value })} placeholder="Ej. Zongshen" />}
        </Campo>
        <Campo id={campo("pais")} etiqueta="País de fabricación" opcional>
          {(p) => <input {...p} maxLength={100} value={datos.paisFabricacion} onChange={(e) => alCambiar({ paisFabricacion: e.target.value })} placeholder="Ej. China" />}
        </Campo>
        <Campo id={campo("marca-motor")} etiqueta="Marca del motor" opcional>
          {(p) => <input {...p} maxLength={100} value={datos.marcaMotor} onChange={(e) => alCambiar({ marcaMotor: e.target.value })} placeholder="Ej. Zongshen" />}
        </Campo>
        <Campo id={campo("modelo-motor")} etiqueta="Modelo del motor" opcional>
          {(p) => <input {...p} maxLength={100} value={datos.modeloMotor} onChange={(e) => alCambiar({ modeloMotor: e.target.value })} placeholder="Ej. CG150" />}
        </Campo>
        <div className="col-span-full grid gap-2 rounded-xl border border-[#dbe3e9] bg-[#f8fafc] p-4">
          <label htmlFor={campo("especificaciones")} className="flex items-center gap-2 text-[13px] font-bold text-[#0b2545]"><FileText aria-hidden="true" className="size-4 text-[#52697d]" />Especificaciones adicionales<Opcional /></label>
          <textarea id={campo("especificaciones")} className="box-border min-h-[96px] w-full resize-y rounded-[10px] border border-[#c5d1db] bg-white p-3 text-[14px] leading-[1.5] text-[#142b42] outline-none placeholder:text-[#8a9aab] focus:border-[#2878b9] focus:shadow-[0_0_0_3px_#2878b933]" maxLength={MAX_ESPECIFICACIONES} rows={3} value={datos.especificacionesAdicionales} onChange={(e) => alCambiar({ especificacionesAdicionales: e.target.value })} placeholder="Ej. Frenos de tambor delanteros y traseros, tanque de 12 L, aro 12 pulgadas." />
          <Contador valor={datos.especificacionesAdicionales} maximo={MAX_ESPECIFICACIONES} />
        </div>
      </TarjetaFormulario>
    </>
  );
}
