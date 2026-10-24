# Avisos de boletas pendientes

El administrador ve una insignia roja con la cantidad de boletas que puede revisar en la pestaña **Boletas**. Un aviso dentro de la aplicación aparece al entrar con pendientes o al detectar nuevos registros. Tocarlo abre la bandeja de pendientes revisables, quitando filtros anteriores de persona y fecha.

La cantidad proviene de una consulta del backend limitada a la empresa de la sesión y a administradores activos. No cuenta boletas propias cuando hay varios administradores activos. Las pendientes propias antiguas del administrador único sí pueden confirmarse según la regla existente. Las boletas aprobadas, rechazadas o eliminadas no se cuentan.

Se consulta al navegar, cada 30 segundos mientras la aplicación está activa y al regresar desde segundo plano. Cerrar el aviso lo oculta hasta que lleguen nuevas pendientes durante esa sesión; la insignia permanece mientras existan pendientes. Si falla una consulta, se conserva la última cantidad confirmada y se vuelve a intentar en el siguiente ciclo.

El filtro **Pendientes** del listado muestra además la cantidad de pendientes del alcance/integrante elegido, independientemente de las fechas y la búsqueda. Este número describe el estado de los registros; la insignia inferior describe los registros revisables por el administrador.

Son avisos internos. No se envían notificaciones push del sistema, correos ni avisos con la aplicación cerrada. Eso requeriría configurar permisos y un servicio de entrega aparte.
