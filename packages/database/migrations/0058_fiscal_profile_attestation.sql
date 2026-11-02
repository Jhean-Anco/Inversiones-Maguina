ALTER TABLE "configuracion_emisor_facturacion"
  ADD COLUMN "perfil_fiscal_confirmado" boolean DEFAULT false NOT NULL,
  ADD COLUMN "perfil_fiscal_confirmado_en" timestamp with time zone,
  ADD COLUMN "perfil_fiscal_confirmado_por_usuario_id" uuid;
--> statement-breakpoint
ALTER TABLE "configuracion_emisor_facturacion"
  ADD CONSTRAINT "configuracion_emisor_facturacion_perfil_fiscal_confirmado_por_usuario_id_usuarios_id_fk"
  FOREIGN KEY ("perfil_fiscal_confirmado_por_usuario_id")
  REFERENCES "public"."usuarios"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
