ALTER TABLE "garantias_mototaxis" ALTER COLUMN "unidad_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "garantias_mototaxis" ADD COLUMN "compra_detalle_id" uuid;--> statement-breakpoint
ALTER TABLE "garantias_mototaxis" ADD CONSTRAINT "garantias_mototaxis_compra_detalle_id_compras_mototaxis_detalle_id_fk" FOREIGN KEY ("compra_detalle_id") REFERENCES "public"."compras_mototaxis_detalle"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "garantias_mototaxis_compra_detalle_unica" ON "garantias_mototaxis" USING btree ("compra_detalle_id");--> statement-breakpoint
ALTER TABLE "garantias_mototaxis" ADD CONSTRAINT "garantias_mototaxis_origen_ck" CHECK (num_nonnulls("garantias_mototaxis"."unidad_id", "garantias_mototaxis"."compra_detalle_id") = 1);