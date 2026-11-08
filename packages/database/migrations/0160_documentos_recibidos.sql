CREATE TABLE "documentos_recibidos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "periodo_sire" varchar(6),
  "ticket_sire" varchar(12),
  "emisor_ruc" varchar(11) NOT NULL,
  "emisor_nombre" varchar(240),
  "tipo_documento" varchar(10) NOT NULL,
  "serie" varchar(30) NOT NULL,
  "correlativo" varchar(40) NOT NULL,
  "fecha_emision" date,
  "moneda" varchar(3),
  "total" numeric(14, 2),
  "estado" varchar(30) DEFAULT 'PENDIENTE_REVISION' NOT NULL,
  "destino" varchar(30),
  "datos_origen" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "egreso_id" uuid,
  "entrada_stock_id" uuid,
  "compra_mototaxi_id" uuid,
  "usuario_id" uuid NOT NULL,
  "importado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
  "actualizado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "documentos_recibidos_estado_ck" CHECK ("estado" IN ('PENDIENTE_REVISION', 'OBSERVADO', 'PENDIENTE_RECEPCION', 'REGISTRADO', 'DESCARTADO')),
  CONSTRAINT "documentos_recibidos_destino_ck" CHECK ("destino" IS NULL OR "destino" IN ('REPUESTOS', 'MOTOTAXI', 'GASTO_OPERATIVO', 'ACTIVO_HERRAMIENTA')),
  CONSTRAINT "documentos_recibidos_ruc_ck" CHECK ("emisor_ruc" ~ '^[0-9]{11}$'),
  CONSTRAINT "documentos_recibidos_egreso_id_egresos_registros_id_fk" FOREIGN KEY ("egreso_id") REFERENCES "egresos_registros"("id") ON DELETE SET NULL,
  CONSTRAINT "documentos_recibidos_entrada_stock_id_entradas_stock_id_fk" FOREIGN KEY ("entrada_stock_id") REFERENCES "entradas_stock"("id") ON DELETE SET NULL,
  CONSTRAINT "documentos_recibidos_compra_mototaxi_id_compras_mototaxis_id_fk" FOREIGN KEY ("compra_mototaxi_id") REFERENCES "compras_mototaxis"("id") ON DELETE SET NULL,
  CONSTRAINT "documentos_recibidos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT
);
CREATE INDEX "documentos_recibidos_estado_fecha_idx" ON "documentos_recibidos" USING btree ("estado", "fecha_emision");
CREATE INDEX "documentos_recibidos_periodo_idx" ON "documentos_recibidos" USING btree ("periodo_sire");
CREATE UNIQUE INDEX "documentos_recibidos_identidad_unique" ON "documentos_recibidos" USING btree ("emisor_ruc", "tipo_documento", "serie", "correlativo");
