# Sistema visual del frontend

Este sistema define la capa compartida para las pantallas del ERP. Las vistas de cada módulo conservan sus rutas, permisos, datos, validaciones y acciones; los estilos compartidos ordenan su presentación y adaptación a distintos tamaños.

## Identidad y lectura

- Azul marino para estructura y navegación, rojo para acciones principales y estado activo.
- Fondo gris frío y superficies blancas para mantener una lectura clara y consistente.
- Inter/Segoe UI/system-ui, con tamaños legibles y jerarquía basada en peso, tamaño y espacio.
- Lectura operativa: bordes discretos, contenedores con radios de 8 a 16 px y sombras suaves para separar niveles.

## Tokens base

| Grupo | Tokens | Valores principales |
| --- | --- | --- |
| Marca | `--erp-brand`, `--erp-brand-deep`, `--erp-accent` | `#0b376a`, `#071e3c`, `#c91f32` |
| Superficies claras | `--erp-canvas`, `--erp-surface`, `--erp-surface-muted` | `#f3f6f9`, `#fff`, `#f7f9fb` |
| Texto claro | `--erp-ink`, `--erp-ink-muted`, `--erp-ink-soft` | `#142b42`, `#52697d`, `#687e91` |
| Borde y foco | `--erp-border`, `--erp-border-strong`, `--erp-focus` | `#dbe3e9`, `#c5d1db`, `#2878b9` |
| Radios | `--erp-radius-sm/md/lg` | `8px`, `12px`, `16px` |
| Espacio | `--erp-space-1` a `--erp-space-6` | escala de `4px` a `24px` |

Los componentes compartidos mantienen las superficies, el texto y los estados visuales claros en todas las pantallas.

## Controles, estados y accesibilidad

- Campos de búsqueda y filtros mantienen un objetivo mínimo de 42 px; controles táctiles del shell deben ofrecer un área cómoda en móvil.
- `:focus-visible` tiene indicador de foco persistente y contrastado.
- Vacíos, errores, selección activa y hover usan texto legible; las tablas conservan encabezados distinguibles y desplazamiento horizontal cuando haga falta.
- En `prefers-reduced-motion: reduce`, las animaciones y transiciones se reducen a una duración casi inmediata.
- Puntos de adaptación: navegación hasta 960 px; composición compacta hasta 600 px; tablas pueden desplazarse horizontalmente sin ensanchar la página.

## Implementación

La capa común vive en `apps/web/src/main/erp-design-system.css`, importada después de los estilos globales. Los estilos específicos de cada vista se quedan junto a su módulo. Esta capa no debe alojar reglas de negocio ni alterar contratos del backend.
