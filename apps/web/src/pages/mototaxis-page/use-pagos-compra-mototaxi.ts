import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { servicioMototaxis, type CompraMototaxi, type PagoCompraMototaxi } from "../../services/mototaxis.service";

type FormularioPagoCompra = {
  fechaPago: string;
  importePagado: string;
  medioPago: string;
  cuentaFinancieraId: string;
};

type Params = {
  fechaHoy: () => string;
  setError: (mensaje: string) => void;
  manejarError: (problema: unknown) => void;
  cargar: () => Promise<void>;
  setExito: (mensaje: string) => void;
  setGuardando: Dispatch<SetStateAction<boolean>>;
};

export function usePagosCompraMototaxi({ fechaHoy, setError, manejarError, cargar, setExito, setGuardando }: Params) {
  const [compraPago, setCompraPago] = useState<CompraMototaxi | null>(null);
  const [pagosCompra, setPagosCompra] = useState<PagoCompraMototaxi[]>([]);
  const [formPago, setFormPago] = useState<FormularioPagoCompra>({ fechaPago: fechaHoy(), importePagado: "", medioPago: "TRANSFERENCIA", cuentaFinancieraId: "" });

  async function abrirPago(entrada: CompraMototaxi) {
    setError(""); setCompraPago(entrada); setFormPago({ fechaPago: fechaHoy(), importePagado: entrada.saldo, medioPago: "TRANSFERENCIA", cuentaFinancieraId: "" });
    try { setPagosCompra(await servicioMototaxis.pagosCompra(entrada.id)); } catch (e) { manejarError(e); }
  }

  async function guardarPago(e: FormEvent) {
    e.preventDefault(); if (!compraPago) return; setError(""); setGuardando(true);
    try {
      await servicioMototaxis.aplicarPagoCompra(compraPago.id, { ...formPago, claveIdempotencia: crypto.randomUUID() });
      setExito(`Pago aplicado a la compra ${compraPago.codigo}.`); setCompraPago(null); await cargar();
    } catch (e) { manejarError(e); } finally { setGuardando(false); }
  }

  return { compraPago, setCompraPago, pagosCompra, formPago, setFormPago, abrirPago, guardarPago };
}
