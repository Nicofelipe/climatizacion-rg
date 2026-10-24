# Acceso de empresa y trabajadores

## Flujo disponible para revisar

1. Abrir http://localhost:8081/; sin sesión se muestra `/login`.
2. Entrar con una cuenta existente usando correo y contraseña (la misma que se usaba en Postman).
3. Como ADMIN, abrir Perfil → Registrar trabajador.
4. Registrar nombre, apellido, correo, contraseña inicial y teléfono opcional.
5. La empresa se obtiene del token del administrador y el rol se asigna como EMPLOYEE en backend. No se permite elegir otra empresa o elevar el rol desde el formulario.
6. Cerrar sesión desde Perfil y acceder con el trabajador.
7. Abrir Boletas → Registrar boleta, seleccionar foto o cámara y completar los datos.

Las contraseñas se guardan con bcrypt; no se deben compartir en el chat ni incluir en Git. No hay autorregistro público. No se crearon usuarios reales durante las pruebas automatizadas de este cambio.

## Alcance y pendientes

- Este avance habilita correo y contraseña; no habilita todavía acceso con Google ni con RUT.
- El RUT o correo por sí solos son identificadores, no una prueba de identidad.
- Google Drive OAuth existente autoriza almacenamiento; no se reutiliza como sesión de usuario.
- Para Google faltan configurar clientes OAuth de acceso para web/Android/iOS, validar identidad en backend y vincularla a una cuenta activa previamente registrada por el administrador. No habilitar altas automáticas por dominio.
- Falta invitación con enlace de activación, recuperación de contraseña y cambio obligatorio de contraseña inicial. Por ahora el administrador asigna una contraseña y el trabajador la recibe por un canal privado.
- La sesión se mantiene en memoria: recargar la página exige volver a iniciar sesión.
- El login rechaza correos ambiguos presentes en más de una empresa. Está pendiente definir el selector de empresa o una identidad global con membresías.
- Las pruebas del controlador usan servicios simulados; falta la comprobación manual completa con una cuenta real y subida a Drive.

## Verificación

- `npm run typecheck` en backend y `tsc --noEmit` en mobile: correctos.
- `node --test tests/employee-access.test.cjs tests/receipt-image.test.cjs`: correcto.
- Vista previa: se observó el formulario de acceso en `/login`.
- Se conservan los cambios previos sin commit. La rama actual es `feature/employee-access`; antes de guardar hay que separar y revisar las modificaciones acumuladas de los avances anteriores.
