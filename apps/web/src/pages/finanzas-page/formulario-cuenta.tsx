import { ChevronDown, Save } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { DialogoCatalogo } from "../../components/inventario/dialogo-catalogo";
import type { DatosCuentaFinanciera, TipoCuentaFinanciera } from "../../services/finanzas.service";
import { dialogosModeloClasses as d } from "../inventario-mototaxis-page/dialogos-modelo-classes";
import { etiquetaTipo, fechaLocal, tiposCuenta } from "./finanzas-formatters";

const selectCampo = "relative flex items-center [&_select]:box-border [&_select]:h-[46px] [&_select]:w-full [&_select]:cursor-pointer [&_select]:appearance-none [&_select]:rounded-[10px] [&_select]:border [&_select]:border-[#c5d1db] [&_select]:bg-white [&_select]:pl-3 [&_select]:pr-10 [&_select]:text-[14px] [&_select]:font-normal [&_select]:text-[#142b42] [&_select]:outline-none [&_select:focus]:border-[#2878b9] [&_select:focus]:shadow-[0_0_0_3px_#2878b933] [&_svg]:pointer-events-none [&_svg]:absolute [&_svg]:right-3 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-[#52697d]";
const textoLargo = "box-border min-h-[90px] w-full resize-y rounded-[10px] border border-[#c5d1db] bg-white px-3 py-2.5 text-[14px] font-normal text-[#142b42] outline-none focus:border-[#2878b9] focus:shadow-[0_0_0_3px_#2878b933]";
const ancho = "col-span-full";

const Opcional = () => <span className={d.opcional}>Opcional</span>;

interface Props {
  editando: boolean;
  formulario: DatosCuentaFinanciera;
  guardando: boolean;
  alCambiar: (cambio: Partial<DatosCuentaFinanciera>) => void;
  alGuardar: (evento: FormEvent) => void;
  alCerrar: () => void;
}

export function FormularioCuenta({ editando, formulario: f, guardando, alCambiar, alGuardar, alCerrar }: Props) {
  const campo = (rotulo: ReactNode, control: ReactNode, clase = "") => <label className={clase}>{rotulo}{control}</label>;
  const texto = (clave: keyof DatosCuentaFinanciera, extra: Record<string, unknown> = {}) =>
    <input value={String(f[clave] ?? "")} onChange={(e) => alCambiar({ [clave]: e.target.value })} {...extra} />;
  const placeholderNombre = f.tipo === "EFECTIVO" ? "Ej. Caja principal" : f.tipo === "BANCO" ? "Ej. Cuenta corriente del negocio" : f.tipo === "BILLETERA" ? "Ej. Yape del negocio" : "Ej. Visa para compras";

  return <DialogoCatalogo titulo={editando ? "Editar cuenta financiera" : "Crear cuenta financiera"} articulo={f.nombre || etiquetaTipo(f.tipo)} codigo="" guardando={guardando} pantallaCompletaMovil alCerrar={alCerrar}
    acciones={<>
      <button type="button" className={d.botonSecundario} disabled={guardando} onClick={alCerrar}>Cancelar</button>
      <button type="submit" form="finanzas-cuenta-form" className={d.botonPrincipal} disabled={guardando}><Save className="h-4 w-4" aria-hidden="true" />{guardando ? "Guardando…" : "Guardar cuenta"}</button>
    </>}>
    <form id="finanzas-cuenta-form" className={d.contenido} onSubmit={alGuardar}>
      <section className={d.formulario}>
        <h3 className={d.titulo}>Datos de la cuenta</h3>
        <fieldset className={d.campos}>
          {campo("Tipo de cuenta *", <span className={selectCampo}><select value={f.tipo} onChange={(e) => alCambiar({ tipo: e.target.value as TipoCuentaFinanciera })}>{tiposCuenta.map((tipo) => <option value={tipo.valor} key={tipo.valor}>{tipo.nombre}</option>)}</select><ChevronDown aria-hidden="true" /></span>)}
          {campo("Nombre para identificarla *", texto("nombre", { required: true, maxLength: 100, placeholder: placeholderNombre }), f.tipo === "EFECTIVO" ? "col-span-2 max-[760px]:col-span-1" : "")}
          {f.tipo !== "EFECTIVO" && campo(`${f.tipo === "BILLETERA" ? "Billetera digital" : f.tipo === "TARJETA" ? "Banco emisor" : "Banco"} *`, texto("entidad", { required: true, maxLength: 100, placeholder: f.tipo === "BILLETERA" ? "Yape, Plin u otro" : "Nombre de la entidad" }))}
          {campo(<span>Titular<Opcional /></span>, texto("titular", { maxLength: 160, placeholder: "Ej. Inversiones Maguiña E.I.R.L." }))}
          {f.tipo === "BANCO" && <>
            {campo(<span>Número de cuenta<Opcional /></span>, texto("numeroCuenta", { maxLength: 100 }))}
            {campo(<span>CCI<Opcional /></span>, texto("cci", { maxLength: 100 }))}
          </>}
          {f.tipo === "BILLETERA" && campo("Número de celular o cuenta *", texto("telefono", { required: true, maxLength: 30, inputMode: "tel" }))}
          {f.tipo === "TARJETA" && campo("Últimos cuatro dígitos *", <input required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={f.numeroTarjeta ?? ""} onChange={(e) => alCambiar({ numeroTarjeta: e.target.value.replace(/\D/g, "").slice(0, 4) })} />)}
          {campo("Moneda *", <><span className={selectCampo}><select value={f.moneda} onChange={(e) => alCambiar({ moneda: e.target.value as DatosCuentaFinanciera["moneda"] })}><option value="PEN">Soles (PEN)</option></select><ChevronDown aria-hidden="true" /></span><small>Por ahora solo soles; otras monedas llegarán con el tipo de cambio.</small></>)}
        </fieldset>
      </section>
      <section className={d.formulario}>
        <h3 className={d.titulo}>Saldo inicial conciliado</h3>
        <fieldset className={d.campos}>
          {campo(<span>Saldo inicial<Opcional /></span>, texto("saldoInicial", { type: "number", step: "0.01", placeholder: "0.00", "aria-describedby": "finanzas-saldo-inicial-ayuda" }))}
          {campo(<span>Fecha del saldo<Opcional /></span>, texto("fechaSaldoInicial", { type: "date", max: fechaLocal(), "aria-describedby": "finanzas-saldo-inicial-ayuda" }))}
          <p id="finanzas-saldo-inicial-ayuda" className={`${d.nota} ${ancho} self-center`}>Completa ambos campos para conciliar. El importe es el saldo al inicio de la fecha elegida; desde ese día se suman solo los cobros y pagos asociados a esta cuenta.</p>
        </fieldset>
      </section>
      <section className={`${d.formulario} !bg-[#f8fafc]`}>
        <div className={d.tituloFila}><h3 className={d.titulo}>Observación<Opcional /></h3><span className={d.nota}>{(f.observacion ?? "").length}/1000</span></div>
        <textarea aria-label="Observación" className={textoLargo} maxLength={1000} value={f.observacion ?? ""} onChange={(e) => alCambiar({ observacion: e.target.value })} placeholder="Ej. Cuenta usada solo para pagos a proveedores de repuestos." />
      </section>
    </form>
  </DialogoCatalogo>;
}
