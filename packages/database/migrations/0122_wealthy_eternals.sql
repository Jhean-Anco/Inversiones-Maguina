ALTER TABLE "ingresos" DROP CONSTRAINT "ingresos_detraccion_codigo_ck";--> statement-breakpoint
ALTER TABLE "ingresos_detalle" DROP CONSTRAINT "ingresos_detalle_detraccion_codigo_ck";--> statement-breakpoint
ALTER TABLE "ingresos_detalle" ADD COLUMN "subpartida_spot_venta" varchar(10);--> statement-breakpoint
ALTER TABLE "productos" ADD COLUMN "codigo_spot_venta" varchar(12);--> statement-breakpoint
ALTER TABLE "productos" ADD COLUMN "subpartida_spot_venta" varchar(10);--> statement-breakpoint
ALTER TABLE "productos" ADD COLUMN "fuente_spot_venta" varchar(240);--> statement-breakpoint
ALTER TABLE "productos" ADD COLUMN "fecha_verificacion_spot_venta" date;--> statement-breakpoint
ALTER TABLE "productos" ADD COLUMN "motivo_no_sujeto_spot_venta" varchar(240);--> statement-breakpoint
ALTER TABLE "ingresos" ADD CONSTRAINT "ingresos_detraccion_codigo_ck" CHECK ("ingresos"."codigo_detraccion" IS NULL OR "ingresos"."codigo_detraccion" IN ('004', '005', '007', '008', '009', '010', '011', '014', '016', '017', '020', '023', '031', '032', '034', '035', '036', '037', '039', '041'));--> statement-breakpoint
ALTER TABLE "ingresos_detalle" ADD CONSTRAINT "ingresos_detalle_detraccion_codigo_ck" CHECK ("ingresos_detalle"."codigo_detraccion" IS NULL OR "ingresos_detalle"."codigo_detraccion" IN ('004', '005', '007', '008', '009', '010', '011', '014', '016', '017', '020', '023', '031', '032', '034', '035', '036', '037', '039', '041', 'NO_SUJETO'));--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_spot_venta_codigo_ck" CHECK ("productos"."codigo_spot_venta" IS NULL OR "productos"."codigo_spot_venta" IN ('004', '005', '007', '008', '009', '010', '011', '014', '016', '017', '020', '023', '031', '032', '034', '035', '036', '037', '039', '041', 'NO_SUJETO'));--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_spot_venta_fuente_ck" CHECK ("productos"."codigo_spot_venta" IS NULL OR ("productos"."fuente_spot_venta" IS NOT NULL AND "productos"."fecha_verificacion_spot_venta" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_spot_venta_subpartida_ck" CHECK ("productos"."subpartida_spot_venta" IS NULL OR "productos"."subpartida_spot_venta" ~ '^\d{10}$');