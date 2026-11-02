# Análisis de datos para la cartera de clientes

## Decisión de diseño

El sistema debe distinguir la identidad que se imprime en un comprobante de la ficha comercial que usa el negocio para reconocer y atender a un cliente. La persona natural o jurídica sigue siendo la identidad fiscal; el registro de cliente contiene los datos de relación comercial y contacto.

Se mantiene una sola ficha de cliente, enlazada a la identidad de la persona o empresa. Una empresa puede tener razón social, nombre comercial y una persona de contacto. Un cliente natural mantiene su nombre legal y puede tener nombre comercial o datos de contacto adicionales. La persona de contacto no necesita un documento de identidad para crear el cliente; una tabla de contactos aparte se justificaría cuando se requiera guardar varias personas, cargos e historiales por contacto.

## Campos del registro

| Grupo | Campo | Necesidad | Uso |
| --- | --- | --- | --- |
| Identidad | Tipo de cliente: persona natural o empresa/organización | Obligatorio | Determina qué identidad se registra y qué documentos se aceptan. |
| Identidad | Tipo y número de documento | Obligatorio en el directorio | Evita duplicados y permite asociar una venta al cliente. La boleta puede emitirse con los datos de identificación disponibles del cliente. |
| Identidad | Nombres y apellido paterno, o razón social | Obligatorio | Nombre legal para identificar al comprador. El apellido materno es opcional para no bloquear registros. |
| Perfil comercial | Nombre comercial o referencia | Opcional | Permite encontrar el negocio por el nombre con el que lo conocen sus compradores. |
| Perfil comercial | Estado activo/inactivo | Obligatorio en el sistema | Conserva referencias históricas sin borrar clientes usados en ventas. |
| Contacto | Persona de contacto | Opcional | Útil cuando el cliente es una empresa u organización. |
| Contacto | Teléfono y correo | Opcionales | Facilitan coordinación y comunicación de documentos. No se deben tratar como requisito general de emisión. |
| Atención | Dirección | Opcional en la ficha | Se puede incluir como dato del cliente en la boleta. |
| Atención | Dirección de entrega | Opcional | Puede diferir de la dirección fiscal; sirve para coordinar pedidos. |
| Atención | Nota interna | Opcional | Referencias breves para futuras ventas. No debe usarse para guardar datos sensibles. |

## Reglas de emisión y límites

- La ficha comercial puede guardar más información que la requerida para emitir un comprobante. Tener correo, teléfono, contacto o dirección de entrega no debe convertirse en requisito de una venta.
- La razón social o nombre legal debe venir de la identidad registrada; el nombre comercial es complementario. La pantalla puede consultar RUC/DNI para ayudar a completar identidad, pero el usuario debe revisar el resultado.
- No guardar fecha de nacimiento, género, claves, datos bancarios ni documentos adjuntos en esta ficha: no hacen falta para el alcance comercial actual.

## Cambios incluidos

La ficha actual conserva la identidad de cliente enlazada y agrega atributos propios de cliente: nombre comercial, contacto, correo, teléfono, dirección de entrega y nota interna. El formulario ahora pregunta explícitamente el tipo de cliente y ordena los campos como perfil comercial. La búsqueda contempla nombre comercial, contacto, correo y teléfono.

La gestión de varios contactos por cliente, condiciones de crédito, límites de crédito, lista de precios personalizada, segmentación, historial de interacciones y edición/baja desde la interfaz quedan fuera del formulario básico. Esos datos deben añadirse cuando el negocio defina sus reglas operativas y de acceso.
