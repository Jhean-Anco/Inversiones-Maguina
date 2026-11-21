-- Los metadatos y referencias de archivos historicos se conservan para evitar
-- perdida irreversible de datos durante el retiro del flujo de cargas.
COMMENT ON TABLE "imagenes_mototaxis" IS 'Retirada del flujo activo; datos historicos conservados.';--> statement-breakpoint
COMMENT ON TABLE "productos_imagenes" IS 'Retirada del flujo activo; datos historicos conservados.';--> statement-breakpoint
COMMENT ON TABLE "archivos_locales" IS 'Retirada del flujo activo; datos historicos conservados.';
