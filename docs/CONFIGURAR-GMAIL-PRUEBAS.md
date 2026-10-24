# Gmail para correos de prueba

Se usa Gmail como remitente de recuperación. No confundirlo con iniciar sesión con Google ni con la cuenta de Drive: son funciones independientes.

1. Abre la cuenta Gmail que utilizarás y activa la verificación en dos pasos si aún no está activa.
2. En [Contraseñas de aplicación de Google](https://myaccount.google.com/apppasswords), crea una para esta aplicación. Si no aparece la opción, consulta [las condiciones de Google](https://support.google.com/accounts/answer/185833?hl=es); algunas políticas de cuenta no la permiten.
3. Desde PowerShell en la carpeta del proyecto, ejecuta lo siguiente, cambiando el correo de ejemplo:

   ```powershell
   powershell -NoProfile -File .\scripts\configure-gmail.ps1 -Email tu-cuenta@gmail.com
   ```

4. Pega la contraseña de aplicación de 16 caracteres cuando el asistente la pida. La entrada queda oculta. No uses tu contraseña habitual ni la pegues en el chat.
5. Reinicia el backend. Abre **Olvidé mi contraseña** y usa el correo de una cuenta activa registrada en la aplicación. Revisa también spam.
6. Abre el enlace recibido, elige una contraseña que cumpla las reglas y confírmala. El enlace vence en 20 minutos, no se reutiliza y no contiene la nueva contraseña.

El asistente configura smtp.gmail.com, puerto 587 con STARTTLS, el remitente y la contraseña de aplicación en backend/.env. Ese archivo está excluido de Git. No envía correos automáticamente. La URL de recuperación queda en localhost:8081 para pruebas desde este computador; antes de probar desde un teléfono o desplegar, cambiar PASSWORD_RESET_URL por una dirección HTTPS accesible desde el dispositivo.

Las credenciales de Gmail no se guardan en SQL ni se entregan al frontend. Si Google revoca la contraseña de aplicación, genera otra y ejecuta nuevamente el asistente. No publiques capturas de la clave ni el contenido de .env.
