ALTER TABLE "egresos_registros" ADD COLUMN "mototaxi_marca" varchar(100);
--> statement-breakpoint
ALTER TABLE "egresos_registros" ADD COLUMN "mototaxi_modelo" varchar(100);
--> statement-breakpoint
ALTER TABLE "egresos_registros" ADD COLUMN "mototaxi_numero_motor" varchar(100);
--> statement-breakpoint
ALTER TABLE "egresos_registros" ADD COLUMN "mototaxi_numero_chasis" varchar(100);
--> statement-breakpoint
ALTER TABLE "egresos_registros" DROP CONSTRAINT "egresos_registros_tipo_ck";
--> statement-breakpoint
ALTER TABLE "egresos_registros" ADD CONSTRAINT "egresos_registros_tipo_ck" CHECK ("tipo" IN ('GASTO_OPERATIVO', 'SERVICIO_PERSONAL', 'ACTIVO_HERRAMIENTA', 'MOTOTAXI'));
--> statement-breakpoint
ALTER TABLE "egresos_registros" ADD CONSTRAINT "egresos_registros_mototaxi_datos_ck" CHECK ("tipo" <> 'MOTOTAXI' OR ("mototaxi_marca" IS NOT NULL AND "mototaxi_modelo" IS NOT NULL AND "mototaxi_numero_motor" IS NOT NULL AND "mototaxi_numero_chasis" IS NOT NULL));
--> statement-breakpoint
CREATE UNIQUE INDEX "egresos_registros_mototaxi_motor_unique" ON "egresos_registros" USING btree ("mototaxi_numero_motor") WHERE "tipo" = 'MOTOTAXI';
--> statement-breakpoint
CREATE UNIQUE INDEX "egresos_registros_mototaxi_chasis_unique" ON "egresos_registros" USING btree ("mototaxi_numero_chasis") WHERE "tipo" = 'MOTOTAXI';
