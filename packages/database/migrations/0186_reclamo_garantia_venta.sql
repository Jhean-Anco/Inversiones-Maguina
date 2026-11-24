ALTER TABLE "reclamos_garantia_mototaxis" ADD COLUMN "ingreso_detalle_id" uuid;
--> statement-breakpoint
ALTER TABLE "reclamos_garantia_mototaxis" ADD CONSTRAINT "reclamos_garantia_mototaxis_ingreso_detalle_id_ingresos_detalle_id_fk" FOREIGN KEY ("ingreso_detalle_id") REFERENCES "public"."ingresos_detalle"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "reclamos_garantia_mototaxis_ingreso_detalle_idx" ON "reclamos_garantia_mototaxis" USING btree ("ingreso_detalle_id");
