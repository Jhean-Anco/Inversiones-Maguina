CREATE TEMP TABLE nubefact_correlativos_unificados AS SELECT serie, tipo_comprobante, max(ultimo_numero) AS ultimo_numero FROM nubefact_correlativos GROUP BY serie, tipo_comprobante;--> statement-breakpoint
DELETE FROM nubefact_correlativos;--> statement-breakpoint
INSERT INTO nubefact_correlativos (ambiente, serie, tipo_comprobante, ultimo_numero) SELECT 'DEMO', serie, tipo_comprobante, ultimo_numero FROM nubefact_correlativos_unificados;--> statement-breakpoint
DROP TABLE nubefact_correlativos_unificados;--> statement-breakpoint
WITH ordenadas AS (SELECT id, row_number() OVER (PARTITION BY tipo_comprobante ORDER BY activa DESC, actualizado_en DESC, creado_en DESC, id) AS posicion FROM series_comprobantes WHERE activa) UPDATE series_comprobantes AS serie SET activa = false, actualizado_en = now() FROM ordenadas WHERE serie.id = ordenadas.id AND ordenadas.posicion > 1;--> statement-breakpoint
WITH ordenadas AS (SELECT id, row_number() OVER (PARTITION BY tipo_comprobante, serie ORDER BY activa DESC, actualizado_en DESC, creado_en DESC, id) AS posicion FROM series_comprobantes) DELETE FROM series_comprobantes AS serie USING ordenadas WHERE serie.id = ordenadas.id AND ordenadas.posicion > 1;--> statement-breakpoint
UPDATE ingresos SET estado = 'EMITIDO' WHERE estado = 'EMITIDO_DEMO';--> statement-breakpoint
UPDATE ingresos SET estado = 'ERROR_NUBEFACT' WHERE estado = 'ERROR_NUBEFACT_DEMO';--> statement-breakpoint
UPDATE comprobantes_relacionados SET estado = 'EMITIDO' WHERE estado = 'EMITIDO_DEMO';--> statement-breakpoint
UPDATE comprobantes_relacionados SET estado = 'ERROR_NUBEFACT' WHERE estado = 'ERROR_NUBEFACT_DEMO';--> statement-breakpoint
ALTER TABLE "comprobantes_relacionados" DROP CONSTRAINT "comprobantes_relacionados_ambiente_ck";--> statement-breakpoint
ALTER TABLE "guias_remision" DROP CONSTRAINT "guias_remision_ambiente_ck";--> statement-breakpoint
ALTER TABLE "nubefact_correlativos" DROP CONSTRAINT "nubefact_correlativos_ambiente_ck";--> statement-breakpoint
ALTER TABLE "series_comprobantes" DROP CONSTRAINT "series_comprobantes_ambiente_ck";--> statement-breakpoint
DROP INDEX "series_comprobantes_ambiente_tipo_serie_uq";--> statement-breakpoint
DROP INDEX "comprobantes_relacionados_serie_numero_unico";--> statement-breakpoint
DROP INDEX "guias_remision_correlativo_unico";--> statement-breakpoint
DROP INDEX "series_comprobantes_activa_tipo_uq";--> statement-breakpoint
ALTER TABLE "nubefact_correlativos" DROP CONSTRAINT "nubefact_correlativos_ambiente_serie_tipo_comprobante_pk";--> statement-breakpoint
ALTER TABLE "nubefact_correlativos" ADD CONSTRAINT "nubefact_correlativos_serie_tipo_comprobante_pk" PRIMARY KEY("serie","tipo_comprobante");--> statement-breakpoint
CREATE UNIQUE INDEX "series_comprobantes_tipo_serie_uq" ON "series_comprobantes" USING btree ("tipo_comprobante","serie");--> statement-breakpoint
CREATE UNIQUE INDEX "comprobantes_relacionados_serie_numero_unico" ON "comprobantes_relacionados" USING btree ("tipo_comprobante","serie","numero");--> statement-breakpoint
CREATE UNIQUE INDEX "guias_remision_correlativo_unico" ON "guias_remision" USING btree ("tipo","serie","numero");--> statement-breakpoint
CREATE UNIQUE INDEX "series_comprobantes_activa_tipo_uq" ON "series_comprobantes" USING btree ("tipo_comprobante") WHERE "series_comprobantes"."activa";--> statement-breakpoint
ALTER TABLE "comprobantes_relacionados" DROP COLUMN "ambiente";--> statement-breakpoint
ALTER TABLE "guias_remision" DROP COLUMN "ambiente";--> statement-breakpoint
ALTER TABLE "nubefact_correlativos" DROP COLUMN "ambiente";--> statement-breakpoint
ALTER TABLE "series_comprobantes" DROP COLUMN "ambiente";
