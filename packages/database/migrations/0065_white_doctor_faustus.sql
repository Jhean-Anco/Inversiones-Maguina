ALTER TABLE "ingresos_detalle" ADD COLUMN "sujeto_percepcion_fuente" varchar(240);--> statement-breakpoint
ALTER TABLE "ingresos_detalle" ADD COLUMN "sujeto_percepcion_fecha_verificacion" date;--> statement-breakpoint
ALTER TABLE "productos" ADD COLUMN "sujeto_percepcion_fuente" varchar(240);--> statement-breakpoint
ALTER TABLE "productos" ADD COLUMN "sujeto_percepcion_fecha_verificacion" date;