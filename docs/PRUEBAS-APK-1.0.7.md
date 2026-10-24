# APK 1.0.7: revisión y presentación

## Permisos de las boletas

- Pendiente propia: su dueño puede editarla. Esto incluye a un administrador que rinde sus propios gastos.
- Pendiente de otro integrante: el administrador solo puede aprobar o rechazar con motivo, sin cambiar los datos presentados.
- Aprobada: un administrador de la misma empresa puede corregir excepcionalmente fecha o monto, con motivo obligatorio. El historial guarda responsable, fecha, valores anteriores y nuevos. La boleta conserva el estado aprobado.
- Rechazada: no se edita; se presenta una nueva boleta.

Estas restricciones se aplican en la interfaz, en la API y en la consulta SQL dentro de la transacción. Las pruebas usan tablas temporales, sin modificar boletas reales.

## Interfaz

- La tarjeta de gasto en Reportes es más compacta e identifica el alcance: empresa o personal. Añade cantidad de boletas consideradas y aclara que excluye rechazadas.
- Las líneas crecen y los segmentos de la distribución aparecen al entrar al área visible o volver a la pestaña. Se respeta la opción de reducir movimiento del teléfono. Los puntos y segmentos se pueden tocar; el máximo se destaca sin alterar la proporción de los importes.
- El icono para agregar foto es más pequeño. Los botones responden con un cambio de color al presionarlos, y el tipo de gasto seleccionado mantiene otro color y un borde.
- Se redujo el texto de Editar en Equipo.
- Las pendientes sin abrir mantienen un punto rojo. Abrir el detalle desde el listado o una notificación las marca como vistas para ese usuario y dispositivo.
- La regla de carga sigue siendo año actual, o año anterior hasta el 15 de marzo inclusive en Chile, cada año. El historial y los reportes siguen mostrando años anteriores.

## Drive: qué significa cada acción

La carpeta ya asignada a la empresa sigue fija. Ningún empleado necesita conectar su Drive personal.

1. **Comprobar acceso a la carpeta** verifica que el servidor puede utilizar el respaldo existente.
2. **Renovar permiso de Google** prepara una autorización nueva solo si venció o se revocó la conexión.
3. **Autorizar en Google** abre la cuenta que administra ese respaldo. Al terminar, se vuelve y se comprueba el acceso.

Renovar el permiso no cambia la carpeta ni borra o mueve las boletas existentes.

## Notificaciones

La sección ahora se llama Notificaciones. Activar muestra progreso, pide permiso cuando Android lo permite y abre Ajustes si el permiso está bloqueado. Si el teléfono ya está registrado pero el servidor no tiene habilitado Firebase, aparece ese estado explícitamente. La obtención del token tiene un límite de espera para evitar un indicador permanente.

**Pendiente:** configurar de forma privada las credenciales de envío FCM del backend y probar la recepción con la aplicación cerrada. Un permiso concedido en Android por sí solo no habilita el envío desde el servidor.

## Validación

144 pruebas aprobadas; comprobación de tipos de backend y móvil aprobada. Incluye el rechazo de correcciones en pendientes y rechazadas, aislamiento por empresa, edición de pendientes limitada al dueño y conservación de auditoría en correcciones aprobadas.

Falta comprobar la interfaz, los permisos de notificaciones y una subida real de foto en el teléfono con la versión 1.0.7. La lectura automática de datos de la foto no se implementó: queda para una etapa posterior por solicitud del usuario.

La API de pruebas todavía depende del computador encendido y sus túneles. No es una publicación productiva.
