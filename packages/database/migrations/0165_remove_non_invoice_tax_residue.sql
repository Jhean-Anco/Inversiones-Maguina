ALTER TABLE "ingresos_pagos"
  DROP CONSTRAINT IF EXISTS "ingresos_pagos_grupo_cobro_id_ingresos_cobros_grupos_id_fk",
  DROP COLUMN IF EXISTS "grupo_cobro_id",
  DROP COLUMN IF EXISTS "cliente_agente_retencion",
  DROP COLUMN IF EXISTS "retencion_verificacion_fuente",
  DROP COLUMN IF EXISTS "retencion_igv",
  DROP COLUMN IF EXISTS "retencion_constancia",
  DROP COLUMN IF EXISTS "percepcion_tasa",
  DROP COLUMN IF EXISTS "percepcion_igv",
  DROP COLUMN IF EXISTS "percepcion_constancia",
  DROP COLUMN IF EXISTS "detraccion_depositada",
  DROP COLUMN IF EXISTS "detraccion_constancia",
  DROP COLUMN IF EXISTS "retencion_verificacion_fecha",
  DROP COLUMN IF EXISTS "base_percepcion_igv",
  DROP COLUMN IF EXISTS "percepcion_estado",
  DROP COLUMN IF EXISTS "percepcion_serie",
  DROP COLUMN IF EXISTS "percepcion_numero",
  DROP COLUMN IF EXISTS "percepcion_codigo",
  DROP COLUMN IF EXISTS "percepcion_enlace_pdf",
  DROP COLUMN IF EXISTS "percepcion_enlace_xml",
  DROP COLUMN IF EXISTS "percepcion_enlace_cdr",
  DROP COLUMN IF EXISTS "percepcion_datos_nubefact",
  DROP COLUMN IF EXISTS "cliente_agente_percepcion",
  DROP COLUMN IF EXISTS "perfil_fiscal_emisor_snapshot",
  DROP COLUMN IF EXISTS "reglas_tributarias_snapshot",
  DROP COLUMN IF EXISTS "percepcion_verificacion_fuente",
  DROP COLUMN IF EXISTS "percepcion_verificacion_fecha",
  DROP COLUMN IF EXISTS "retencion_constancia_verificada",
  DROP COLUMN IF EXISTS "retencion_constancia_fuente_verificacion",
  DROP COLUMN IF EXISTS "retencion_constancia_fecha_verificacion",
  DROP COLUMN IF EXISTS "retencion_constancia_verificada_por_usuario_id",
  DROP COLUMN IF EXISTS "retencion_periodo_aplicacion",
  DROP COLUMN IF EXISTS "detraccion_fecha_deposito",
  DROP COLUMN IF EXISTS "retencion_excepcion_motivo",
  DROP COLUMN IF EXISTS "retencion_excepcion_fuente",
  DROP COLUMN IF EXISTS "retencion_excepcion_fecha",
  DROP COLUMN IF EXISTS "percepcion_excepcion_motivo",
  DROP COLUMN IF EXISTS "percepcion_excepcion_fuente",
  DROP COLUMN IF EXISTS "percepcion_excepcion_fecha",
  DROP COLUMN IF EXISTS "cliente_listado_percepcion_05",
  DROP COLUMN IF EXISTS "listado_percepcion_05_fuente",
  DROP COLUMN IF EXISTS "listado_percepcion_05_fecha",
  DROP COLUMN IF EXISTS "percepcion_consumidor_final",
  DROP COLUMN IF EXISTS "cliente_no_excluido_percepcion_combustible_fuente";
--> statement-breakpoint
DROP TABLE IF EXISTS "ingresos_cobros_grupos";
--> statement-breakpoint
DROP TABLE IF EXISTS "importaciones_propuesta_rce";
--> statement-breakpoint
ALTER TABLE "ingresos"
  DROP COLUMN IF EXISTS "codigo_detraccion",
  DROP COLUMN IF EXISTS "porcentaje_detraccion",
  DROP COLUMN IF EXISTS "importe_detraccion",
  DROP COLUMN IF EXISTS "perfil_fiscal_snapshot",
  DROP COLUMN IF EXISTS "reglas_tributarias_snapshot";
--> statement-breakpoint
ALTER TABLE "ingresos_detalle"
  DROP COLUMN IF EXISTS "codigo_detraccion",
  DROP COLUMN IF EXISTS "motivo_no_sujeto_spot",
  DROP COLUMN IF EXISTS "sujeto_percepcion_igv",
  DROP COLUMN IF EXISTS "sujeto_percepcion_fuente",
  DROP COLUMN IF EXISTS "sujeto_percepcion_fecha_verificacion",
  DROP COLUMN IF EXISTS "sujeto_percepcion_subpartida",
  DROP COLUMN IF EXISTS "fuente_no_sujeto_spot",
  DROP COLUMN IF EXISTS "fecha_verificacion_no_sujeto_spot",
  DROP COLUMN IF EXISTS "fuente_clasificacion_spot",
  DROP COLUMN IF EXISTS "fecha_verificacion_clasificacion_spot",
  DROP COLUMN IF EXISTS "subpartida_spot_venta",
  DROP COLUMN IF EXISTS "sujeto_percepcion_numero_apendice",
  DROP COLUMN IF EXISTS "sujeto_percepcion_modalidad_lpg";
--> statement-breakpoint
ALTER TABLE "pagos_entradas_stock"
  DROP COLUMN IF EXISTS "operacion_gravada_igv",
  DROP COLUMN IF EXISTS "exclusion_retencion",
  DROP COLUMN IF EXISTS "retencion_igv",
  DROP COLUMN IF EXISTS "comprobante_retencion",
  DROP COLUMN IF EXISTS "constancia_retencion_verificada",
  DROP COLUMN IF EXISTS "fuente_verificacion_retencion",
  DROP COLUMN IF EXISTS "fecha_verificacion_retencion",
  DROP COLUMN IF EXISTS "percepcion_igv",
  DROP COLUMN IF EXISTS "tasa_percepcion",
  DROP COLUMN IF EXISTS "comprobante_percepcion",
  DROP COLUMN IF EXISTS "proveedor_agente_percepcion",
  DROP COLUMN IF EXISTS "constancia_percepcion_verificada",
  DROP COLUMN IF EXISTS "fuente_verificacion_percepcion",
  DROP COLUMN IF EXISTS "fecha_verificacion_percepcion",
  DROP COLUMN IF EXISTS "reglas_tributarias_snapshot";
--> statement-breakpoint
ALTER TABLE "productos"
  DROP COLUMN IF EXISTS "sujeto_percepcion_igv",
  DROP COLUMN IF EXISTS "sujeto_percepcion_fuente",
  DROP COLUMN IF EXISTS "sujeto_percepcion_fecha_verificacion",
  DROP COLUMN IF EXISTS "sujeto_percepcion_subpartida",
  DROP COLUMN IF EXISTS "codigo_spot_venta",
  DROP COLUMN IF EXISTS "subpartida_spot_venta",
  DROP COLUMN IF EXISTS "fuente_spot_venta",
  DROP COLUMN IF EXISTS "fecha_verificacion_spot_venta",
  DROP COLUMN IF EXISTS "motivo_no_sujeto_spot_venta",
  DROP COLUMN IF EXISTS "sujeto_percepcion_numero_apendice",
  DROP COLUMN IF EXISTS "sujeto_percepcion_modalidad_lpg";
--> statement-breakpoint
ALTER TABLE "egresos_pagos"
  DROP COLUMN IF EXISTS "datos_retencion";
--> statement-breakpoint
ALTER TABLE "egresos_registros"
  DROP COLUMN IF EXISTS "datos_tributarios_compra",
  DROP COLUMN IF EXISTS "datos_retencion";
--> statement-breakpoint
ALTER TABLE "entradas_stock"
  DROP COLUMN IF EXISTS "datos_tributarios_compra";
