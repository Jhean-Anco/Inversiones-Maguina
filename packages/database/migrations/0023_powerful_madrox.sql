CREATE TABLE "nubefact_correlativos" (
	"serie" varchar(4) PRIMARY KEY NOT NULL,
	"ultimo_numero" integer DEFAULT 0 NOT NULL,
	"actualizado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nubefact_correlativos_numero_ck" CHECK ("nubefact_correlativos"."ultimo_numero" >= 0)
);
