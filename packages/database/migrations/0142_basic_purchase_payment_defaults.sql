ALTER TABLE "pagos_entradas_stock" ALTER COLUMN "exclusion_retencion" SET DEFAULT 'NINGUNA';--> statement-breakpoint
ALTER TABLE "pagos_entradas_stock" ALTER COLUMN "fuente_verificacion_proveedor" SET DEFAULT 'Registro operativo';--> statement-breakpoint
ALTER TABLE "pagos_entradas_stock" ALTER COLUMN "fecha_verificacion_proveedor" SET DEFAULT CURRENT_DATE;
