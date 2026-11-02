ALTER TABLE "pagos_entradas_stock" ADD COLUMN "grupo_pago_id" uuid;--> statement-breakpoint
ALTER TABLE "pagos_entradas_stock" ADD COLUMN "clasificado_por_usuario_id" uuid;--> statement-breakpoint
ALTER TABLE "pagos_entradas_stock" ADD COLUMN "clasificado_en" timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "pagos_entradas_stock" ADD CONSTRAINT "pagos_entradas_stock_clasificado_por_usuario_id_usuarios_id_fk" FOREIGN KEY ("clasificado_por_usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pagos_entradas_stock_grupo_pago_idx" ON "pagos_entradas_stock" USING btree ("grupo_pago_id");