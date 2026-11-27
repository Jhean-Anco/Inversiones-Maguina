import type { ModeloMototaxi } from "../../services/mototaxis.service";

export type DatosModelo = {
  marcaId: string; nombre: string; version: string; categoriaVehicular: string;
  fabricante: string; paisFabricacion: string; marcaMotor: string; modeloMotor: string; tipoMototaxi: string; tipoMotor: string; tipoRefrigeracion: string; cilindradaCc: string;
  combustible: string; transmision: string; carroceria: string; capacidadAsientos: string; capacidadCargaKg: string; especificacionesAdicionales: string; coloresDisponibles: string[];
};

export const nuevoModelo = (): DatosModelo => ({ marcaId: "", nombre: "", version: "", categoriaVehicular: "L5", fabricante: "", paisFabricacion: "", marcaMotor: "", modeloMotor: "", tipoMototaxi: "", tipoMotor: "", tipoRefrigeracion: "", cilindradaCc: "", combustible: "", transmision: "", carroceria: "", capacidadAsientos: "", capacidadCargaKg: "", especificacionesAdicionales: "", coloresDisponibles: [] });
export const datosDeModelo = (modelo: ModeloMototaxi): DatosModelo => ({ marcaId: modelo.marcaId, nombre: modelo.nombre, version: modelo.version ?? "", categoriaVehicular: modelo.categoriaVehicular, fabricante: modelo.fabricante ?? "", paisFabricacion: modelo.paisFabricacion ?? "", marcaMotor: modelo.marcaMotor ?? "", modeloMotor: modelo.modeloMotor ?? "", tipoMototaxi: modelo.tipoMototaxi ?? "", tipoMotor: modelo.tipoMotor ?? "", tipoRefrigeracion: modelo.tipoRefrigeracion ?? "", cilindradaCc: String(modelo.cilindradaCc ?? ""), combustible: modelo.combustible ?? "", transmision: modelo.transmision ?? "", carroceria: modelo.carroceria ?? "", capacidadAsientos: String(modelo.capacidadAsientos ?? ""), capacidadCargaKg: modelo.capacidadCargaKg ?? "", especificacionesAdicionales: modelo.especificacionesAdicionales ?? "", coloresDisponibles: modelo.coloresDisponibles ?? [] });
