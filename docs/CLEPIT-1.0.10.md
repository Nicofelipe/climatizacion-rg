# Clepit 1.0.10

- Nombre visible del producto corregido a **Clepit**, incluida la instalación Android, Inicio, Perfil y los encabezados del Excel.
- Logo completo con la palabra Clepit en PNG con transparencia real. Ya no se utiliza el fondo blanco ni el recorte mediante desplazamientos fijos. El componente se centra horizontalmente y conserva las proporciones.
- Símbolo de Android más pequeño, con mayor margen transparente alrededor para que no quede apretado dentro de la máscara del teléfono.
- Nombre de la empresa conservado según la sesión.

La nueva APK actualiza la aplicación existente; conserva el identificador de paquete para no requerir una desinstalación. Se comprobaron transparencia de los PNG y tipos de backend/móvil. La apariencia final del icono depende de la máscara del launcher de Android y se debe confirmar en el teléfono.

La lectura automática de boletas, el onboarding y el selector visual de aprobación por lotes siguen pendientes para la edición de pruebas; no forman parte de este cambio de marca.

## Compilación local

El selector automático de herramientas de Java eligió GraalVM 17 del equipo y falló al generar la imagen JDK de Android (`Module jdk.internal.vm.ci not found`). Se descargó Eclipse Temurin 17 oficial, verificando su SHA256 con los metadatos de Adoptium, en `C:\Dev\tools\clepit-temurin17`. No se cambió Java global. Para repetir la compilación, indicar ese JDK en JAVA_HOME y en `org.gradle.java.home` y limitar la detección de toolchains a su ruta. El fallo inicial también informó falta de espacio; al comprobar Windows había espacio libre suficiente, por lo que no se borraron APK ni datos del proyecto.
