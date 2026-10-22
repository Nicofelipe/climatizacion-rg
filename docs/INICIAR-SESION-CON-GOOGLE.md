# Acceso con Google

Permite ingresar a administradores y trabajadores cuyo correo ya exista y esté activo en la base de datos. La empresa debe estar activa. Google no asigna roles, no crea usuarios y no conecta el Drive de la empresa.

## Preparar una vez

1. Aplicar la migración 016. Desde backend: `node scripts/apply-google-login-migration.cjs`.
2. Abrir Google Cloud → el proyecto utilizado → Google Auth Platform / credenciales → cliente OAuth de tipo aplicación web. Puede utilizar las credenciales existentes GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET del backend.
3. Agregar como URI de redirección autorizada para acceso local: `http://localhost:3000/api/auth/google/callback`. Conservar la URI existente de Drive.
4. Si la aplicación OAuth está en pruebas, agregar los correos de las personas que la probarán como usuarios de prueba. Incluir los permisos básicos openid, email y profile según lo que solicite Google.
5. Reiniciar el backend y Expo si se modificaron variables. En el login, pulsar **Continuar con Google**, elegir el correo registrado y completar la verificación.

Si el puerto o dominio del backend es diferente, definir GOOGLE_LOGIN_REDIRECT_URI con la URI real terminada en `/api/auth/google/callback` y registrarla exactamente en Cloud. El valor por defecto deriva el origen de GOOGLE_REDIRECT_URI, sin cambiar esa variable ni la conexión de Drive.

GOOGLE_LOGIN_APP_REDIRECTS contiene la lista separada por comas de retornos de la aplicación permitidos. Localmente admite `http://localhost:8081/google-login` y `climatizacion-rg://google-login`. Para producción se deben configurar expresamente los dominios HTTPS de la aplicación y del backend. Nunca agregar direcciones arbitrarias.

## Móvil

El retorno nativo usa el scheme existente `climatizacion-rg`. Probar en una compilación de desarrollo o instalada con ese scheme; Expo Go no representa este retorno personalizado. El móvil debe poder acceder al backend: localhost en un teléfono apunta al propio teléfono, por lo que EXPO_PUBLIC_API_URL debe usar una dirección accesible o un servidor HTTPS. El callback del backend debe ser accesible desde el navegador de Google y estar autorizado en Cloud.

## Restricciones y seguridad

La primera vinculación automática se admite para Gmail y Google Workspace con correo verificado. Si la cuenta de Google usa un correo externo como Hotmail sin Workspace, debe seguir ingresando con su contraseña registrada hasta implementar una vinculación adicional comprobada; Google no es autoridad actual sobre ese buzón externo.

La vinculación conserva el identificador estable de Google (`sub`), con unicidad, y deja auditoría. Un correo no registrado, desactivado, ambiguo entre empresas o vinculado a otra identidad no puede ingresar. El usuario no puede elegir un rol desde Google.

La autorización usa state y nonce aleatorios. El backend verifica firma, audiencia, vencimiento y nonce del ID token. El retorno solo lleva un ticket de un uso y un minuto, protegido con un desafío SHA-256 generado por la aplicación; el JWT de sesión se obtiene por POST, nunca en la URL. Los intentos vencen en cinco minutos y están en memoria: tras reiniciar el backend, iniciar Google nuevamente. Para varias instancias se necesitará un almacén compartido de intentos/tickets.

## Prueba manual

- Gmail/Workspace registrado como trabajador: entrar y comprobar que solo ve sus datos.
- Correo registrado como administrador: entrar y comprobar las opciones de su rol.
- Correo sin registro o cuenta desactivada: acceso rechazado sin crear usuarios.
- Cancelar Google: volver al login con un mensaje y conservar la alternativa de contraseña.
- Verificar en móvil formularios de registro y edición a 390 px y, finalmente, en un teléfono real.
