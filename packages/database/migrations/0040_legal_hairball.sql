ALTER TABLE "ingresos" ADD COLUMN "codigo_detraccion" varchar(3);--> statement-breakpoint
ALTER TABLE "ingresos" ADD COLUMN "porcentaje_detraccion" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "ingresos" ADD COLUMN "importe_detraccion" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "ingresos_detalle" ADD COLUMN "codigo_detraccion" varchar(3);--> statement-breakpoint
ALTER TABLE "ingresos" ADD CONSTRAINT "ingresos_detraccion_codigo_ck" CHECK ("ingresos"."codigo_detraccion" IS NULL OR "ingresos"."codigo_detraccion" IN ('020', '037'));--> statement-breakpoint
ALTER TABLE "ingresos" ADD CONSTRAINT "ingresos_detraccion_importes_ck" CHECK ("ingresos"."importe_detraccion" >= 0 AND ("ingresos"."porcentaje_detraccion" IS NULL OR "ingresos"."porcentaje_detraccion" > 0));--> statement-breakpoint
ALTER TABLE "ingresos_detalle" ADD CONSTRAINT "ingresos_detalle_detraccion_codigo_ck" CHECK ("ingresos_detalle"."codigo_detraccion" IS NULL OR "ingresos_detalle"."codigo_detraccion" IN ('020', '037'));