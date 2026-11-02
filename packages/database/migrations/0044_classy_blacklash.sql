ALTER TABLE "ingresos_detalle" DROP CONSTRAINT "ingresos_detalle_detraccion_codigo_ck";--> statement-breakpoint
ALTER TABLE "ingresos_detalle" ALTER COLUMN "codigo_detraccion" SET DATA TYPE varchar(12);--> statement-breakpoint
ALTER TABLE "ingresos_detalle" ADD COLUMN "motivo_no_sujeto_spot" varchar(240);--> statement-breakpoint
ALTER TABLE "ingresos_detalle" ADD CONSTRAINT "ingresos_detalle_detraccion_motivo_ck" CHECK ("ingresos_detalle"."codigo_detraccion" <> 'NO_SUJETO' OR "ingresos_detalle"."motivo_no_sujeto_spot" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "ingresos_detalle" ADD CONSTRAINT "ingresos_detalle_detraccion_codigo_ck" CHECK ("ingresos_detalle"."codigo_detraccion" IS NULL OR "ingresos_detalle"."codigo_detraccion" IN ('020', '037', 'NO_SUJETO'));