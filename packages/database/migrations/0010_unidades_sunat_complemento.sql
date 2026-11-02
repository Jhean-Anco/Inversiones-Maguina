INSERT INTO "unidades_medida" ("codigo", "nombre") VALUES
	('CJ', 'Cono'),
	('KTM', 'Kilómetro'),
	('LBR', 'Libra'),
	('MLL', 'Millar'),
	('UM', 'Millón de unidades')
ON CONFLICT ("codigo") DO NOTHING;
