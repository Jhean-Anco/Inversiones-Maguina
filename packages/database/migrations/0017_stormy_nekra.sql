ALTER TABLE "movimientos_stock" ADD COLUMN "sentido" varchar(10);--> statement-breakpoint
ALTER TABLE "movimientos_stock" ADD COLUMN "motivo" varchar(40);--> statement-breakpoint
ALTER TABLE "movimientos_stock" ADD COLUMN "observacion" text;--> statement-breakpoint
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_sentido_ck" CHECK ("movimientos_stock"."sentido" IS NULL OR "movimientos_stock"."sentido" IN ('INGRESO', 'RETIRO'));--> statement-breakpoint
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_motivo_ck" CHECK ("movimientos_stock"."motivo" IS NULL OR "movimientos_stock"."motivo" IN ('INVENTARIO_FISICO', 'MERMA', 'DANIO', 'PERDIDA', 'DEVOLUCION', 'CORRECCION', 'OTRO'));