# Excel mensual y anual — APK 1.0.5

## Cómo descargar

1. Actualiza a la APK 1.0.5. Perfil muestra la versión instalada.
2. Inicia sesión como administrador y abre Reportes.
3. Selecciona Toda la empresa o Mis boletas.
4. Elige Mensual (año y mes) o Anual (año, enero a diciembre).
5. Pulsa Descargar Excel. En Android elige dónde guardarlo o compartirlo; en la web se descarga al navegador.

El Excel contiene Resumen y Boletas. El período usa la fecha de la boleta, no su fecha de registro. El detalle incluye pendientes, aprobadas y rechazadas; el gasto del resumen excluye rechazadas y las muestra por separado. Los importes son números y la moneda es CLP. Una empresa solo puede exportar sus propios registros. El alcance personal solo incluye los del administrador que descarga.

## Guardado de fotos

La imagen sigue siendo obligatoria. El cliente conserva el tipo MIME entregado por el selector/cámara y reconoce HEIC, HEIF y GIF, además de JPG, PNG y WEBP. El servidor continúa verificando el contenido real y el máximo de 10 MB. La carpeta de Drive configurada se comprobó accesible, sin alterar archivos. Falta confirmar el guardado real en el teléfono con esta APK; no se crearon boletas ficticias en la empresa.

## Dirección de pruebas

La APK usa `https://climatizacion-rg-pruebas.onrender.com/api`.

En Render, Redirects/Rewrites contiene:

- `/api/*` → `https://gazette-future-montana-paying.trycloudflare.com/api/*` — Rewrite.
- `/downloads/*` → `https://believe-charger-spaces-various.trycloudflare.com/*` — Rewrite.
- La regla existente `/expenses/*` → `/index.html` se conserva.

Si caduca un túnel, se renueva y se actualiza el destino de su regla. La dirección de la APK permanece igual; no hace falta recompilarla por ese cambio. Se verificaron GET, POST de login, consultas autenticadas, generación de Excel y envío multipart incompleto (rechazado antes de crear registros).

Esto NO aloja el backend ni SQL Server en Render. Ambos siguen en el PC y requieren que esté encendido y conectado. Las reglas no hacen permanentes los túneles: permiten repararlos sin cambiar la APK. No se contrataron recursos de pago ni se migró la base de datos.

La web estática desplegada anteriormente conserva su configuración compilada de API; para usar esta dirección fija también en esa web hay que actualizar EXPO_PUBLIC_API_URL y volver a desplegarla.

Validación: 137 pruebas aprobadas; revisión de tipos de backend y móvil aprobada; auditoría npm del backend sin vulnerabilidades conocidas. ExcelJS utiliza UUID 11 compatible mediante override para evitar el aviso de seguridad de la dependencia antigua.
