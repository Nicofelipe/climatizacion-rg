# Nombres de fotografías de boletas

Formato de nuevas imágenes en Drive:

`AAAAMMDD_NOMBREAPELLIDO_IDBoleta_CODIGO.ext`

Ejemplo: `20261022_NICOLASPEREZ_42_B-123.jpg`.

- La fecha corresponde a la boleta, no al día de carga. Siempre se usa año, mes y día con ceros.
- El nombre y apellido se consultan en SQL Server usando el propietario de la boleta y su empresa. No se toma el nombre del administrador que la modifica ni un nombre enviado por el teléfono.
- Se eliminan espacios, tildes y caracteres especiales del nombre para facilitar la búsqueda y descarga.
- El nombre y el código se guardan en mayúsculas. El código corresponde al número de boleta ingresado en el formulario.
- El ID distingue registros. Drive identifica los archivos por su propio ID: una subida crea un archivo nuevo, aunque repita el nombre visible.
- La extensión se normaliza según el tipo de imagen; el nombre original del dispositivo se conserva como metadato OriginalFileName en SQL.
- Una edición sin foto nueva sincroniza nombre, código y carpeta de año/mes.
- Si se reemplaza la imagen, el nombre mantiene este mismo formato.
- No se renombran masivamente los archivos históricos ni se modifican boletas aprobadas/rechazadas. Los archivos antiguos adoptan el formato si se edita su boleta pendiente.

Este avance cubre nombres. Detalle con imagen, etiquetas de estado, formulario de edición móvil y motivo/fecha de rechazo siguen pendientes. Solo PENDING es editable; REJECTED exige un nuevo registro y APPROVED queda bloqueado.
