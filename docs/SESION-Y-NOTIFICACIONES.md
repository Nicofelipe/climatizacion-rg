# Sesión y notificaciones de Clepit Pruebas

## Preparado en el código

- Android conserva la sesión en Expo SecureStore, sin guardar la contraseña. Cerrar la aplicación no la borra. Cerrar sesión elimina el respaldo local.
- Se mantiene la caducidad y revocación actuales del servidor. No es una sesión ilimitada: al expirar o cambiar la contraseña se vuelve a pedir acceso. Una falla de conexión temporal no borra la sesión guardada.
- La campana muestra el total sin leer. La bandeja reúne los avisos en Por revisar, Aprobadas y Rechazadas; cada grupo se puede abrir. Abrir un aviso marca solo ese aviso como leído.
- Android recibe un único aviso resumen por usuario y empresa, con contador. Los mensajes posteriores actualizan ese mismo aviso. No incluye montos, nombres de trabajadores ni fotos en la pantalla bloqueada.

## Firebase pendiente

1. App Android registrada: `cl.rg.clepit.pruebas`, alias Clepit Pruebas, proyecto `climatizacionrg-45d47`.
2. Descargar su `google-services.json` y guardarlo en `mobile/.secrets/google-services.json` de este worktree. No confundirlo con el archivo de la aplicación principal (`cl.rg.climatizacion`).
3. Para el servidor, usar una cuenta de servicio dedicada al envío con el rol Firebase Cloud Messaging API Admin (`roles/firebasecloudmessaging.admin`), en ese mismo proyecto. Habilitar Firebase Cloud Messaging API v1 si aún no está habilitada.
4. La creación de la credencial la realiza el propietario en Google Cloud. Guardar el JSON privado en `backend/.secrets/fcm-service-account.json` del backend que está ejecutándose. Jamás copiarlo a mobile, compartirlo en el chat o subirlo a GitHub.
5. En el `.env` privado del backend configurar `FCM_PROJECT_ID=climatizacionrg-45d47` y `FCM_SERVICE_ACCOUNT_FILE` con la ruta absoluta a ese archivo. Reiniciar el backend con el cambio de agrupación revisado.
6. Regenerar Android con Expo prebuild y compilar la APK 0.1.4 incluyendo SecureStore y Firebase; no instalar el código fuente como si ya fuera una APK.
7. Instalar, iniciar sesión y activar notificaciones desde la campana. Comprobar cerrar/reabrir sin perder la sesión, cerrar sesión y comprobar que pide acceso, y recibir avisos reales con la aplicación cerrada.
8. Probar varios avisos: un resumen en Android, contador correcto y todos los avisos en la bandeja privada. Cambiar de usuario no debe mostrar avisos de otra cuenta o empresa.

El teléfono debe tener conectividad y permisos. Forzar detención desde Ajustes puede impedir notificaciones hasta volver a abrir. El backend, SQL Server y los túneles actuales deben continuar encendidos; persistir la sesión no cambia el alojamiento.

Estado: 158 pruebas y comprobaciones de TypeScript aprobadas. Firebase Android configurado para el paquete de pruebas. Credencial del servidor validada y guardada fuera de Git, con permisos de archivo restringidos. Backend de pruebas reiniciado; FCM aceptó la validación de envío en modo `validate_only`, sin enviar mensajes. APK 0.1.4 compilada, con paquete, firma y enlace público verificados; persistencia y entrega real en teléfono pendientes de validar. No se certifica entrega push hasta completar esa prueba.

Referencias: [Expo SecureStore](https://docs.expo.dev/versions/v57.0.0/sdk/securestore/), [FCM HTTP v1](https://firebase.google.com/docs/cloud-messaging/send/v1-api).
