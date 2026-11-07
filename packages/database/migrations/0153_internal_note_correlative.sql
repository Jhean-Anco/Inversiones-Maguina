CREATE TABLE "correlativos_documentos_internos" (
	"tipo" varchar(30) PRIMARY KEY NOT NULL,
	"ultimo_numero" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "correlativos_documentos_internos_numero_ck" CHECK ("ultimo_numero" >= 0)
);
--> statement-breakpoint
INSERT INTO "correlativos_documentos_internos" ("tipo", "ultimo_numero")
VALUES ('NOTA_VENTA', 0);
