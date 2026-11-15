DROP INDEX "ordenes_servicio_vehiculo_idx";--> statement-breakpoint
CREATE INDEX "ordenes_servicio_vehiculo_idx" ON "ordenes_servicio" USING btree ("vehiculo_placa");--> statement-breakpoint
ALTER TABLE "ordenes_servicio" DROP COLUMN "vehiculo_vin";